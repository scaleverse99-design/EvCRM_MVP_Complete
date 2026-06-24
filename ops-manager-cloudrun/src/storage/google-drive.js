/**
 * OPS MANAGER V6.0 — Google Drive Storage Adapter
 * 
 * Treats Google Drive as a high-performance JSON database.
 * Each client gets their own isolated Drive folder structure.
 * Google's Indian CDN nodes serve files in 20-50ms.
 */

const { google } = require('googleapis');
const { StorageAdapter } = require('./interface');

class GoogleDriveAdapter extends StorageAdapter {
  constructor(auth) {
    super();
    this.drive = google.drive({ version: 'v3', auth });
    // clientId → { folderId, fileIndex: { 'cache/products.json': fileId, ... } }
    this._index = {};
  }

  // ── INTERNAL HELPERS ──────────────────────────────────────────────────────

  async _getClientRoot(clientId) {
    const config = this._index[clientId];
    if (!config) throw new Error(`Client '${clientId}' not found in Drive index`);
    return config.folderId;
  }

  async _ensureIndex(clientId, storageConfig) {
    if (this._index[clientId]) return;
    this._index[clientId] = {
      folderId: storageConfig.folderId,
      fileIndex: storageConfig.fileIndex || {}
    };
  }

  async _resolveFileId(clientId, path) {
    const idx = this._index[clientId];
    if (idx?.fileIndex?.[path]) return idx.fileIndex[path];

    // Search by name in the client's folder
    const parts = path.split('/');
    const fileName = parts.pop();
    const folder = parts.join('/');

    const parentId = folder
      ? await this._resolveSubfolderId(clientId, folder)
      : await this._getClientRoot(clientId);

    const res = await this.drive.files.list({
      q: `'${parentId}' in parents and name = '${fileName}' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1
    });

    const file = res.data.files?.[0];
    if (!file) throw new Error(`File not found: ${clientId}/${path}`);

    // Cache the file ID
    if (!this._index[clientId]) this._index[clientId] = { fileIndex: {} };
    this._index[clientId].fileIndex[path] = file.id;
    return file.id;
  }

  async _resolveSubfolderId(clientId, folderPath) {
    const cacheKey = `__folder__${folderPath}`;
    const idx = this._index[clientId];
    if (idx?.fileIndex?.[cacheKey]) return idx.fileIndex[cacheKey];

    const rootId = await this._getClientRoot(clientId);
    const folderName = folderPath.split('/').pop();

    const res = await this.drive.files.list({
      q: `'${rootId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1
    });

    const folder = res.data.files?.[0];
    if (!folder) throw new Error(`Subfolder not found: ${clientId}/${folderPath}`);

    this._index[clientId].fileIndex[cacheKey] = folder.id;
    return folder.id;
  }

  async _createSubfolder(parentId, name) {
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id'
    });
    return res.data.id;
  }

  // ── PUBLIC INTERFACE ──────────────────────────────────────────────────────

  async read(clientId, path) {
    const fileId = await this._resolveFileId(clientId, path);
    const res = await this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
    return res.data;
  }

  async write(clientId, path, data) {
    let fileId;
    try {
      fileId = await this._resolveFileId(clientId, path);
    } catch {
      fileId = null;
    }

    const content = JSON.stringify(data, null, 2);
    const media = { mimeType: 'application/json', body: content };

    if (fileId) {
      // Update existing file
      await this.drive.files.update({ fileId, media });
    } else {
      // Create new file
      const parts = path.split('/');
      const fileName = parts.pop();
      const folder = parts.join('/');
      const parentId = folder
        ? await this._resolveSubfolderId(clientId, folder)
        : await this._getClientRoot(clientId);

      const res = await this.drive.files.create({
        requestBody: { name: fileName, parents: [parentId] },
        media,
        fields: 'id'
      });

      if (!this._index[clientId]) this._index[clientId] = { fileIndex: {} };
      this._index[clientId].fileIndex[path] = res.data.id;
    }
  }

  async upload(clientId, path, content, mimeType = 'text/html') {
    const parts = path.split('/');
    const fileName = parts.pop();
    const folder = parts.join('/');
    const parentId = folder
      ? await this._resolveSubfolderId(clientId, folder)
      : await this._getClientRoot(clientId);

    const res = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId]
      },
      media: { mimeType, body: content },
      fields: 'id, webViewLink'
    });

    // Make file publicly readable
    await this.drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    // Cache file ID
    if (!this._index[clientId]) this._index[clientId] = { fileIndex: {} };
    this._index[clientId].fileIndex[path] = res.data.id;

    return `https://drive.google.com/uc?id=${res.data.id}`;
  }

  async list(clientId, folder) {
    const folderId = folder
      ? await this._resolveSubfolderId(clientId, folder)
      : await this._getClientRoot(clientId);

    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, modifiedTime)',
      pageSize: 100
    });

    return res.data.files || [];
  }

  async delete(clientId, path) {
    const fileId = await this._resolveFileId(clientId, path);
    await this.drive.files.delete({ fileId });
    if (this._index[clientId]?.fileIndex?.[path]) {
      delete this._index[clientId].fileIndex[path];
    }
  }

  async stat(clientId, path) {
    try {
      const fileId = await this._resolveFileId(clientId, path);
      const res = await this.drive.files.get({
        fileId,
        fields: 'size, modifiedTime'
      });
      return {
        exists: true,
        size: parseInt(res.data.size || 0),
        lastModified: res.data.modifiedTime
      };
    } catch {
      return { exists: false, size: 0, lastModified: null };
    }
  }

  async provisionClient(clientId, config) {
    const { businessName, accessToken } = config;

    // Create root folder: /OpsManager/{clientId}/ inside the shared parent folder
    const rootRes = await this.drive.files.create({
      requestBody: {
        name: `OpsManager_${clientId}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.PARENT_FOLDER_ID || "1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn"]
      },
      fields: 'id'
    });
    const rootId = rootRes.data.id;

    // Create sub-folders
    const [cacheId, queueId, dataId, configId] = await Promise.all([
      this._createSubfolder(rootId, 'cache'),
      this._createSubfolder(rootId, 'queue'),
      this._createSubfolder(rootId, 'data'),
      this._createSubfolder(rootId, 'config')
    ]);

    // Register in index
    this._index[clientId] = {
      folderId: rootId,
      fileIndex: {
        '__folder__cache': cacheId,
        '__folder__queue': queueId,
        '__folder__data': dataId,
        '__folder__config': configId
      }
    };

    return {
      folderId: rootId,
      subfolders: { cache: cacheId, queue: queueId, data: dataId, config: configId }
    };
  }

  async deprovisionClient(clientId) {
    const rootId = await this._getClientRoot(clientId);
    await this.drive.files.delete({ fileId: rootId });
    delete this._index[clientId];
  }

  async getStorageUsed(clientId) {
    const rootId = await this._getClientRoot(clientId);
    const res = await this.drive.files.list({
      q: `'${rootId}' in parents and trashed = false`,
      fields: 'files(size)',
      pageSize: 1000
    });
    return res.data.files?.reduce((sum, f) => sum + parseInt(f.size || 0), 0) || 0;
  }

  /**
   * Load a client's storage config into the adapter's index.
   * Called by the router when a request comes in for a client.
   */
  loadClient(clientId, storageConfig) {
    this._ensureIndex(clientId, storageConfig);
  }
}

module.exports = { GoogleDriveAdapter };
