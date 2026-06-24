/**
 * OPS MANAGER V6.0 — Shadow Cache Middleware
 * 
 * In-memory LRU cache that sits in front of all storage reads.
 * Eliminates redundant Drive/S3 API calls for the same file.
 * 
 * Cache invalidation:
 * - TTL-based (default: 60 seconds for JSON data, 5 minutes for HTML)
 * - Manual invalidation via cache.invalidate(clientId, path)
 * - Auto-invalidated after every write to that path
 */

class ShadowCache {
  constructor({ maxEntries = 500, defaultTtlMs = 60_000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this._cache = new Map(); // key → { data, expiresAt, hits }
  }

  _key(clientId, path) {
    return `${clientId}:${path}`;
  }

  get(clientId, path) {
    const key = this._key(clientId, path);
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return null;
    }
    entry.hits++;
    return entry.data;
  }

  set(clientId, path, data, ttlMs = this.defaultTtlMs) {
    // Evict oldest entry if at capacity
    if (this._cache.size >= this.maxEntries) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }
    const key = this._key(clientId, path);
    this._cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      hits: 0,
      cachedAt: new Date().toISOString()
    });
  }

  invalidate(clientId, path) {
    this._cache.delete(this._key(clientId, path));
  }

  invalidateClient(clientId) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        this._cache.delete(key);
      }
    }
  }

  stats() {
    let totalHits = 0;
    const entries = [];
    for (const [key, entry] of this._cache.entries()) {
      totalHits += entry.hits;
      entries.push({ key, hits: entry.hits, cachedAt: entry.cachedAt });
    }
    return {
      size: this._cache.size,
      maxEntries: this.maxEntries,
      totalHits,
      topEntries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10)
    };
  }
}

/**
 * Creates a storage proxy that automatically caches all reads
 * and invalidates cache entries on writes.
 */
function withCache(storage, cache) {
  return new Proxy(storage, {
    get(target, prop) {
      if (prop === 'read') {
        return async (clientId, path) => {
          const cached = cache.get(clientId, path);
          if (cached !== null) return cached;

          const data = await target.read(clientId, path);
          // Use longer TTL for static HTML files
          const ttl = path.endsWith('.html') ? 300_000 : 60_000;
          cache.set(clientId, path, data, ttl);
          return data;
        };
      }
      if (prop === 'write') {
        return async (clientId, path, data) => {
          await target.write(clientId, path, data);
          cache.invalidate(clientId, path); // Invalidate on write
        };
      }
      if (prop === 'upload') {
        return async (clientId, path, content, mimeType) => {
          const url = await target.upload(clientId, path, content, mimeType);
          cache.invalidate(clientId, path);
          return url;
        };
      }
      return typeof target[prop] === 'function'
        ? target[prop].bind(target)
        : target[prop];
    }
  });
}

module.exports = { ShadowCache, withCache };
