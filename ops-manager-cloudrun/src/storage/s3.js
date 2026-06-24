/**
 * OPS MANAGER V6.0 — S3 / Cloudflare R2 Storage Adapter
 * 
 * Compatible with any S3-compatible API:
 * - AWS S3
 * - Cloudflare R2 (free egress, $0.015/GB stored)
 * - MinIO (self-hosted, free)
 * - Backblaze B2
 * 
 * Config required:
 *   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
 *   S3_ACCESS_KEY=your_access_key
 *   S3_SECRET_KEY=your_secret_key
 *   S3_BUCKET=ops-manager
 */

const { StorageAdapter } = require('./interface');

class S3Adapter extends StorageAdapter {
  constructor(config = {}) {
    super();
    this.endpoint = config.endpoint || process.env.S3_ENDPOINT;
    this.accessKey = config.accessKey || process.env.S3_ACCESS_KEY;
    this.secretKey = config.secretKey || process.env.S3_SECRET_KEY;
    this.bucket = config.bucket || process.env.S3_BUCKET || 'ops-manager';
    this.region = config.region || process.env.S3_REGION || 'auto';
    this._client = null;
  }

  async _getClient() {
    if (this._client) return this._client;
    // Lazy import to keep it optional
    const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
    this._client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey
      }
    });
    this._cmds = { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand };
    return this._client;
  }

  _key(clientId, path) {
    return `clients/${clientId}/${path}`;
  }

  async _streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  async read(clientId, path) {
    const client = await this._getClient();
    const res = await client.send(new this._cmds.GetObjectCommand({
      Bucket: this.bucket,
      Key: this._key(clientId, path)
    }));
    const body = await this._streamToString(res.Body);
    return JSON.parse(body);
  }

  async write(clientId, path, data) {
    const client = await this._getClient();
    await client.send(new this._cmds.PutObjectCommand({
      Bucket: this.bucket,
      Key: this._key(clientId, path),
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json'
    }));
  }

  async upload(clientId, path, content, mimeType = 'text/html') {
    const client = await this._getClient();
    const key = this._key(clientId, path);
    await client.send(new this._cmds.PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: mimeType,
      ACL: 'public-read'
    }));
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  async list(clientId, folder) {
    const client = await this._getClient();
    const prefix = this._key(clientId, folder) + '/';
    const res = await client.send(new this._cmds.ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: '/'
    }));
    return (res.Contents || []).map(obj => ({
      name: obj.Key.replace(prefix, ''),
      size: obj.Size,
      lastModified: obj.LastModified
    }));
  }

  async delete(clientId, path) {
    const client = await this._getClient();
    await client.send(new this._cmds.DeleteObjectCommand({
      Bucket: this.bucket,
      Key: this._key(clientId, path)
    }));
  }

  async stat(clientId, path) {
    try {
      const client = await this._getClient();
      const res = await client.send(new this._cmds.HeadObjectCommand({
        Bucket: this.bucket,
        Key: this._key(clientId, path)
      }));
      return {
        exists: true,
        size: res.ContentLength,
        lastModified: res.LastModified?.toISOString()
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false, size: 0, lastModified: null };
      }
      throw err;
    }
  }

  async provisionClient(clientId, config) {
    // S3 is flat — no real "folders". Just write a config file to initialize.
    await this.write(clientId, 'config/settings.json', {
      clientId,
      businessName: config.businessName,
      templateId: config.templateId,
      provisionedAt: new Date().toISOString()
    });
    return { bucket: this.bucket, prefix: `clients/${clientId}/` };
  }

  async deprovisionClient(clientId) {
    const client = await this._getClient();
    // List all files for this client and delete them
    const prefix = `clients/${clientId}/`;
    let continuationToken;
    do {
      const res = await client.send(new this._cmds.ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      }));
      if (res.Contents?.length) {
        await Promise.all(res.Contents.map(obj =>
          client.send(new this._cmds.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: obj.Key
          }))
        ));
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
  }

  async getStorageUsed(clientId) {
    const client = await this._getClient();
    const prefix = `clients/${clientId}/`;
    let total = 0;
    let continuationToken;
    do {
      const res = await client.send(new this._cmds.ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      }));
      total += (res.Contents || []).reduce((sum, f) => sum + (f.Size || 0), 0);
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
    return total;
  }
}

module.exports = { S3Adapter };
