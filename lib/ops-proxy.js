// import { db } from './firebase-admin';
import { authFetch } from './token-storage';

/**
 * Ops Proxy v5.0
 * The "Decentralized Cloud SDK" that interfaces between your apps
 * and the sovereign Ops Manager server.
 */
export const OpsProxy = {
  /**
   * GET: Attempts to read from SHADOW_CACHE (Drive JSON) first for speed,
   * falls back to direct Ops Manager query if cache is missing.
   */
  async get(collection, user, appId = 'ev-crm') {
    if (!user?.opsmanager_url) return [];
    
    // 1. Try Shadow Cache first (Fast Read)
    try {
      const namespace = "APP_" + appId.toUpperCase().replace(/-/g, "_");
      const cacheFileName = `${appId}_${namespace}_${collection}.json`;
      
      // Note: In a real scenario, we'd store the public Drive folder ID or direct JSON URLs.
      // For now, we attempt a direct fetch if we have the cache URL pattern.
      if (user.shadow_cache_base_url) {
        const res = await fetch(`${user.shadow_cache_base_url}/${cacheFileName}`);
        if (res.ok) return await res.json();
      }
    } catch (e) {
      console.warn('[OpsProxy] Shadow Cache miss or error:', e.message);
    }

    // 2. Fallback to Ops Manager (Direct Query)
    return this.fetchFromOps(user.opsmanager_url, {
      type: 'QUERY_RECORDS',
      appId,
      token: user.opsmanager_token,
      data: { sheet: collection }
    }, appId);
  },

  /**
   * ACT: Sends a write/update action to the Ops Manager.
   */
  async act(type, data, user, appId = 'ev-crm') {
    if (!user?.opsmanager_url) return { success: false, error: "No OpsManager configured." };

    return this.fetchFromOps(user.opsmanager_url, {
      type,
      appId,
      token: user.opsmanager_token,
      data
    }, appId);
  },

  /**
   * MEDIA: Uploads a file to Drive via Ops Manager.
   */
  async uploadMedia(file, user, appId = 'ev-crm') {
    if (!user?.opsmanager_url) return { success: false, error: "Media upload requires OpsManager." };
    
    const base64 = await this.toBase64(file);
    return this.act('UPLOAD_FILE', {
      fileName: file.name,
      mimeType: file.type,
      base64Content: base64
    }, user, appId);
  },

  /**
   * MAIL: Sends an email via Ops Manager (Gmail).
   */
  async sendMail(payload, user, appId = 'ev-crm') {
    if (!user?.opsmanager_url) return { success: false, error: "Mail requires OpsManager." };
    
    return this.act('SEND_MAIL', payload, user, appId);
  },

  async toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  },

  async fetchFromOps(url, payload, appId) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          token: payload.token,
          actions: [payload] // Server expects an array or single action object
        })
      });
      const data = await res.json();
      
      if (data.success && data.results?.[0]) {
        return data.results[0].data || data.results[0];
      }
      return data;
    } catch (e) {
      console.error('[OpsProxy] Fetch Error:', e);
      return { success: false, error: e.message };
    }
  }
};
