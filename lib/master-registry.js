/**
 * OPS MANAGER V6.0 — Master Registry
 * 
 * A single JSON file in OUR Google Drive that acts as the
 * routing table for all provisioned client sites.
 * 
 * Structure: master-registry.json
 * {
 *   version: 1,
 *   clients: {
 *     "balajicars": {
 *       domain, businessName, templateId,
 *       storageAdapter, storageConfig,
 *       ownerToken, status, provisionedAt
 *     }
 *   }
 * }
 */

import { google } from 'googleapis';

const REGISTRY_FILE_ID = process.env.MASTER_REGISTRY_FILE_ID || '1EFtuMkNXZW3N83AX8u8eu2gVNJVux-_h';

async function getAdminDrive() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
    credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      : undefined
  });
  return google.drive({ version: 'v3', auth });
}

async function readRegistry(drive) {
  if (!REGISTRY_FILE_ID) {
    throw new Error('MASTER_REGISTRY_FILE_ID env variable not set');
  }
  const res = await drive.files.get(
    { fileId: REGISTRY_FILE_ID, alt: 'media', supportsAllDrives: true },
    { responseType: 'json' }
  );
  return res.data;
}

async function writeRegistry(drive, data) {
  await drive.files.update({
    fileId: REGISTRY_FILE_ID,
    supportsAllDrives: true,
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(data, null, 2)
    }
  });
}

/**
 * Register a new client in the master registry.
 */
export async function registerClient(clientId, config) {
  const drive = await getAdminDrive();
  let registry;
  try {
    registry = await readRegistry(drive);
  } catch {
    registry = { version: 1, clients: {} };
  }

  registry.clients[clientId] = {
    ...config,
    status: 'live',
    provisionedAt: new Date().toISOString(),
    errorCount: 0,
    storageUsedMB: 0
  };
  registry.version = (registry.version || 0) + 1;

  await writeRegistry(drive, registry);
  return registry.clients[clientId];
}

/**
 * Get a client's config by client ID.
 */
export async function getClientConfig(clientId) {
  const drive = await getAdminDrive();
  const registry = await readRegistry(drive);
  return registry.clients?.[clientId] || null;
}

/**
 * Get a client's config by domain.
 */
export async function getClientByDomain(domain) {
  const drive = await getAdminDrive();
  const registry = await readRegistry(drive);
  return Object.values(registry.clients || {}).find(c => c.domain === domain) || null;
}

/**
 * List all clients. Used by the admin panel.
 */
export async function listAllClients() {
  const drive = await getAdminDrive();
  const registry = await readRegistry(drive);
  return registry.clients || {};
}

/**
 * Update a client's status (health, storage used, etc.)
 */
export async function updateClientStatus(clientId, updates) {
  const drive = await getAdminDrive();
  const registry = await readRegistry(drive);
  if (registry.clients?.[clientId]) {
    Object.assign(registry.clients[clientId], updates);
    registry.version = (registry.version || 0) + 1;
    await writeRegistry(drive, registry);
  }
}

/**
 * Remove a client from the registry.
 */
export async function deregisterClient(clientId) {
  const drive = await getAdminDrive();
  const registry = await readRegistry(drive);
  delete registry.clients[clientId];
  registry.version = (registry.version || 0) + 1;
}

/**
 * SOVEREIGN IDENTITY — Users Management
 */
export async function listAllUsers() {
  const drive = await getAdminDrive();
  try {
    const res = await drive.files.list({ q: "name = 'users.json'", spaces: 'drive' });
    if (res.data.files.length === 0) return [];
    const fileId = res.data.files[0].id;
    const content = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
    return content.data || [];
  } catch { return []; }
}

/**
 * SOVEREIGN INTELLIGENCE — Global Stats
 */
export async function getGlobalStats() {
  const clients = await listAllClients();
  const users = await listAllUsers();
  return {
    mrr: 150000, // Hardcoded for demo, would be calculated from ledger
    stats: {
      totalDealers: Object.keys(clients).length,
      activeDealer: Object.values(clients).filter(c => c.status === 'live').length,
      totalUsers: users.length,
      totalLeads: 142
    }
  };
}
