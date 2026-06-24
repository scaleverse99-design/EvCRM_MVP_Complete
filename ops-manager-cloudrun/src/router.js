/**
 * OPS MANAGER V6.0 — Subdomain Router
 * 
 * Reads the hostname from every request and maps it to a client.
 * Loads the client's storage config and attaches it to req.clientId.
 * 
 * Example:
 *   balajicars.socialcom.store → clientId = 'balajicars'
 *   evcrm.in → clientId = null (serves admin panel, handled by Next.js)
 */

class Router {
  constructor(registry, storage) {
    this.registry = registry;
    this.storage = storage;
  }

  /**
   * Express middleware — resolves clientId from hostname.
   */
  middleware() {
    return async (req, res, next) => {
      const hostname = req.headers['x-sovereign-host'] || req.hostname || req.headers.host?.split(':')[0] || '';

      const ensureClientConfig = async (clientId) => {
        if (!clientId) return null;
        const knownClients = new Set(['notes', 'smartnotes', 'evcrmadmin', 'socialcomstore_v2', 'socialcom_v2', 'toolsbase']);
        if (knownClients.has(clientId)) {
          return this.registry.getByClientId(clientId);
        }

        let config = this.registry.getByClientId(clientId);
        if (!config) {
          console.log(`[Router] Personal workspace client '${clientId}' not found in registry. Auto-provisioning...`);
          try {
            // Build configuration directly for in-memory registry, bypassing folder creation to avoid Service Account quota limits
            config = {
              clientId: clientId,
              businessName: `SmartNotes User ${clientId}`,
              domain: `notes.socialcom.store`,
              templateId: "smartnotes",
              storageAdapter: "google-drive",
              storageConfig: {
                folderId: "1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn", // Reuse parent vault folder
                fileIndex: {},
                notesData: { notes: [] },
                settingsData: {}
              },
              status: "live",
              provisionedAt: new Date().toISOString()
            };

            // 3. Register client in-memory
            this.registry.register(clientId, config);

            // 4. Persist updated Master Registry to Google Drive
            const fileId = process.env.MASTER_REGISTRY_FILE_ID;
            if (fileId) {
              const { google } = require('googleapis');
              const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/drive']
              });
              const drive = google.drive({ version: 'v3', auth });
              await drive.files.update({
                fileId,
                media: {
                  mimeType: 'application/json',
                  body: JSON.stringify({ version: 2, clients: this.registry.listAll() }, null, 2)
                }
              });
              console.log(`[Router] Personal workspace client '${clientId}' registered successfully in master-registry.`);
            }
          } catch (err) {
            console.error(`[Router] Auto-provisioning failed for client '${clientId}':`, err.message);
          }
        }
        return config;
      };

      // 1. SmartNotes & thetoolsbase routing aliases
      if (hostname === 'smartnotes.socialcom.store' || hostname === 'notes.socialcom.store') {
        req.clientId = 'notes';
        req.clientConfig = await ensureClientConfig('notes');
        if (req.clientConfig?.storageConfig) {
          this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
        }
      } else if (hostname === 'thetoolsbase.in' || hostname === 'www.thetoolsbase.in') {
        req.clientId = 'toolsbase';
        req.clientConfig = await ensureClientConfig('toolsbase');
        if (req.clientConfig?.storageConfig) {
          this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
        }
      }
      // 2. Admin panel passthrough / direct access via hostname
      else if (hostname === 'evcrm.in' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('run.app')) {
        req.clientId = req.query.clientId || null;
        if (req.clientId) {
          req.clientConfig = await ensureClientConfig(req.clientId);
          if (req.clientConfig?.storageConfig) {
            this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
          }
        }
      } else {
        // 3. Try lookup by full domain (e.g. socialcom.store)
        const byDomain = this.registry.getByDomain(hostname);
        if (byDomain) {
          const all = this.registry.listAll();
          const cid = Object.keys(all).find(k => all[k].domain === hostname);
          req.clientId = cid;
          req.clientConfig = byDomain;
          
          if (req.clientConfig.storageConfig) {
            this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
          }
        } else {
          // 4. Fallback to subdomain extraction
          const parts = hostname.split('.');
          const clientId = parts.length >= 3 ? parts[0] : null;

          if (clientId) {
            const clientConfig = await ensureClientConfig(clientId);
            if (!clientConfig) {
              const byDomain = this.registry.getByDomain(hostname);
              if (byDomain) {
                req.clientId = byDomain.clientId;
                req.clientConfig = byDomain;
              }
            } else {
              req.clientId = clientId;
              req.clientConfig = clientConfig;
            }

            if (req.clientConfig?.storageConfig) {
              this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
            }
          }
        }
      }

      // 5. Allow SmartNotes app context to override the resolved clientId with a query parameter (e.g. user UID)
      if ((req.clientId === 'notes' || req.clientId === 'smartnotes') && req.query.clientId) {
        req.clientId = req.query.clientId;
        req.clientConfig = await ensureClientConfig(req.clientId);
        if (req.clientConfig?.storageConfig) {
          this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
        }
      }

      // Referer fallback for localhost / run.app API calls
      if (!req.clientId && req.headers.referer) {
        try {
          const refererUrl = new URL(req.headers.referer);
          const refererClientId = refererUrl.searchParams.get('clientId');
          if (refererClientId) {
            req.clientId = refererClientId;
            req.clientConfig = await ensureClientConfig(req.clientId);
            if (req.clientConfig?.storageConfig) {
              this.storage.loadClient(req.clientId, req.clientConfig.storageConfig);
            }
          }
        } catch (e) {
          // Ignore invalid referer URL
        }
      }

      next();
    };
  }
}

module.exports = { Router };
