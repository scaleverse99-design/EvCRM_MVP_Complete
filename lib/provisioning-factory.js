/**
 * OPS MANAGER V6.0 — Provisioning Factory
 * 
 * One-click provisioning for new client sites.
 * Creates Drive folder structure + uploads JSON templates + registers in Master Registry.
 * 
 * NO Google Sheets. NO Apps Script Web Apps.
 * Just Drive folders, JSON files, and HTML templates.
 */

import { google } from 'googleapis';
import { getStarterTemplates } from './drive-templates/index.js';
import { registerClient } from './master-registry.js';
import { templates } from './templates.js';

export class ProvisioningFactory {
  constructor(oauth2Client) {
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.oauth2Client = oauth2Client;
  }

  /**
   * Main provisioning entry point.
   * Called from /api/admin/ops-manager/provision
   */
  async setupNewBusiness(businessName, templateId, options = {}) {
    const clientId = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain = options.domain || `${clientId}.socialcom.store`;
    const ownerEmail = options.ownerEmail || '';

    console.log(`🚀 Starting provisioning for: ${businessName} (${clientId})`);

    // 1. Create Drive folder structure
    const folders = await this._createFolderStructure(clientId, businessName);
    console.log(`✅ Created folder structure: ${folders.root}`);

    // 2. Upload starter JSON templates
    const fileIndex = await this._uploadStarterTemplates(
      clientId, businessName, ownerEmail, folders
    );
    console.log(`✅ Uploaded ${Object.keys(fileIndex).length} template files`);

    // 3. Upload website HTML
    const htmlTemplate = templates[templateId] || templates['used-car-dealer'];
    const htmlContent = this._injectClientConfig(htmlTemplate, {
      clientId, businessName, domain, templateId
    });
    console.log(`🚀 Uploading index.html to ${folders.cache}...`);
    const htmlFileId = await this._uploadFile(
      folders.cache, 'index.html', htmlContent, 'text/html', true // Make website public!
    );
    fileIndex['cache/index.html'] = htmlFileId;
    console.log(`✅ Uploaded website HTML: ${htmlFileId}`);

    // 4. Get owner token from auth_tokens.json
    const authTokensFileId = fileIndex['config/auth_tokens.json'];
    if (!authTokensFileId) throw new Error('Missing auth_tokens.json file ID');
    
    const authTokens = await this._readUploadedFile(authTokensFileId);
    const ownerToken = authTokens.tokens[0].token;

    // 5. Update settings.json with domain and templateId
    const settingsFileId = fileIndex['config/settings.json'];
    if (!settingsFileId) throw new Error('Missing settings.json file ID');

    await this._patchFile(settingsFileId, {
      domain, templateId, ownerToken
    });

    // 6. Register in Master Registry
    const storageConfig = {
      folderId: folders.root,
      fileIndex,
      accessToken: null // Will be refreshed by the gateway
    };

    await registerClient(clientId, {
      domain,
      businessName,
      templateId,
      storageAdapter: 'google-drive',
      storageConfig,
      ownerToken,
      ownerEmail
    });
    console.log(`✅ Registered in Master Registry`);

    return {
      success: true,
      clientId,
      domain,
      siteUrl: `https://${domain}`,
      ownerToken,
      folderId: folders.root,
      fileIndex,
      dnsInstructions: {
        type: 'CNAME',
        name: '@',
        value: 'ops-manager-v6-828582778646.us-central1.run.app',
        ttl: 300
      }
    };
  }

  // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

  async _createFolderStructure(clientId, businessName) {
    // Root folder
    const root = await this._createFolder(`OpsManager_${clientId}`, null);

    // Sub-folders in parallel
    const [cache, queue, data, config] = await Promise.all([
      this._createFolder('cache', root),
      this._createFolder('queue', root),
      this._createFolder('data', root),
      this._createFolder('config', root)
    ]);

    return { root, cache, queue, data, config };
  }

  async _createFolder(name, parentId) {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      },
      supportsAllDrives: true,
      fields: 'id'
    });
    return res.data.id;
  }

  async _uploadStarterTemplates(clientId, businessName, ownerEmail, folders) {
    const templates = getStarterTemplates(clientId, businessName, ownerEmail);
    const fileIndex = {};

    const FOLDER_MAP = {
      'cache': folders.cache,
      'queue': folders.queue,
      'data': folders.data,
      'config': folders.config
    };

    // Determine which files should be publicly readable
    const PUBLIC_FILES = new Set([
      'cache/products.json',
      'cache/homepage.json',
      'cache/business_info.json',
      'cache/orders_live.json'
    ]);

    for (const [path, data] of Object.entries(templates)) {
      const [folder, filename] = path.split('/');
      const parentId = FOLDER_MAP[folder];
      const isPublic = PUBLIC_FILES.has(path);

      const fileId = await this._uploadFile(
        parentId,
        filename,
        JSON.stringify(data, null, 2),
        'application/json',
        isPublic
      );
      fileIndex[path] = fileId;
    }

    return fileIndex;
  }

  async _uploadFile(parentId, name, content, mimeType, makePublic = false) {
    const res = await this.drive.files.create({
      requestBody: { name, parents: [parentId] },
      media: { mimeType, body: content },
      supportsAllDrives: true,
      fields: 'id'
    });
    const fileId = res.data.id;
    if (!fileId) throw new Error(`Failed to get file ID after creating ${name}`);

    if (makePublic) {
      await this.drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    }

    return fileId;
  }

  async _readUploadedFile(fileId) {
    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'json' }
    );
    return res.data;
  }

  async _patchFile(fileId, updates) {
    const current = await this._readUploadedFile(fileId);
    const updated = { ...current, ...updates, version: (current.version || 0) + 1 };
    await this.drive.files.update({
      fileId,
      supportsAllDrives: true,
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(updated, null, 2)
      }
    });
    return updated;
  }

  _injectClientConfig(htmlTemplate, config) {
    // Inject client config as a global JS variable into the HTML
    const configScript = `
<script>
  window.__OPS_CONFIG__ = ${JSON.stringify({
    clientId: config.clientId,
    businessName: config.businessName,
    domain: config.domain,
    apiBase: 'https://ops-manager-v6-828582778646.us-central1.run.app',
    templateId: config.templateId
  })};
</script>`;
    return htmlTemplate.replace('</head>', configScript + '\n</head>');
  }
}
