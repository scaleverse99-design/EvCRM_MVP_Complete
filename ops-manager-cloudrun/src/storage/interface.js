/**
 * OPS MANAGER V6.0 — StorageAdapter Interface
 * 
 * Every storage backend must implement this interface.
 * Swap Google Drive for S3, R2, or local disk by changing one config line.
 * The server never knows or cares which storage backend is active.
 */

class StorageAdapter {
  /**
   * Read a JSON file from storage.
   * @param {string} clientId - The client identifier (e.g. 'balajicars')
   * @param {string} path - The file path (e.g. 'cache/products.json')
   * @returns {Promise<object>} Parsed JSON object
   */
  async read(clientId, path) {
    throw new Error(`StorageAdapter.read() not implemented for ${this.constructor.name}`);
  }

  /**
   * Write a JSON object to storage.
   * @param {string} clientId - The client identifier
   * @param {string} path - The file path
   * @param {object} data - The data to write (will be JSON.stringify'd)
   * @returns {Promise<void>}
   */
  async write(clientId, path, data) {
    throw new Error(`StorageAdapter.write() not implemented for ${this.constructor.name}`);
  }

  /**
   * Upload a raw file (HTML, CSS, images, etc.)
   * @param {string} clientId - The client identifier
   * @param {string} path - The file path
   * @param {string|Buffer} content - Raw file content
   * @param {string} mimeType - MIME type (e.g. 'text/html')
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  async upload(clientId, path, content, mimeType) {
    throw new Error(`StorageAdapter.upload() not implemented for ${this.constructor.name}`);
  }

  /**
   * List files in a folder.
   * @param {string} clientId - The client identifier
   * @param {string} folder - The folder path (e.g. 'cache')
   * @returns {Promise<string[]>} Array of file names
   */
  async list(clientId, folder) {
    throw new Error(`StorageAdapter.list() not implemented for ${this.constructor.name}`);
  }

  /**
   * Delete a file from storage.
   * @param {string} clientId - The client identifier
   * @param {string} path - The file path
   * @returns {Promise<void>}
   */
  async delete(clientId, path) {
    throw new Error(`StorageAdapter.delete() not implemented for ${this.constructor.name}`);
  }

  /**
   * Get metadata about a file (size, last modified, etc.)
   * @param {string} clientId - The client identifier
   * @param {string} path - The file path
   * @returns {Promise<{size: number, lastModified: string, exists: boolean}>}
   */
  async stat(clientId, path) {
    throw new Error(`StorageAdapter.stat() not implemented for ${this.constructor.name}`);
  }

  /**
   * Create a folder structure for a new client.
   * Called once during provisioning.
   * @param {string} clientId - The client identifier
   * @param {object} config - Client config (businessName, templateId, etc.)
   * @returns {Promise<object>} Storage-specific config (folderId, bucket, etc.)
   */
  async provisionClient(clientId, config) {
    throw new Error(`StorageAdapter.provisionClient() not implemented for ${this.constructor.name}`);
  }

  /**
   * Delete all storage for a client.
   * Called when deprovisioning a client.
   * @param {string} clientId - The client identifier
   * @returns {Promise<void>}
   */
  async deprovisionClient(clientId) {
    throw new Error(`StorageAdapter.deprovisionClient() not implemented for ${this.constructor.name}`);
  }

  /**
   * Get total storage used by a client in bytes.
   * @param {string} clientId - The client identifier
   * @returns {Promise<number>} Storage used in bytes
   */
  async getStorageUsed(clientId) {
    throw new Error(`StorageAdapter.getStorageUsed() not implemented for ${this.constructor.name}`);
  }
}

module.exports = { StorageAdapter };
