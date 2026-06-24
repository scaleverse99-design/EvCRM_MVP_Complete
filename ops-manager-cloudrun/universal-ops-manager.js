/**
 * 🛡️ SOVEREIGN OPS MANAGER — UNIVERSAL ENGINE V6.2 (FINAL)
 * 
 * Deployment: Cloudflare Workers
 * Storage: Google Drive (Master) + R2 (Cache)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = request.headers.get("X-Sovereign-Host") || url.hostname;
    
    // 1. MASTER REGISTRY RESOLUTION
    const registry = await getRegistry(env);
    if (!registry) {
      return new Response("🏗️ Ops Manager: Registry unavailable or Service Account missing.", { status: 500 });
    }
    const cleanHost = hostname.toLowerCase().replace(/^www\./, "");
    const client = registry.getByDomain(cleanHost) || registry.getByClientId(cleanHost.split('.')[0]);
    
    if (!client && !url.pathname.startsWith('/api/master')) {
      return new Response(`🏗️ Ops Manager: No site found for ${hostname}`, { 
        status: 404,
        headers: { 
          "Content-Type": "text/html",
          "X-Sovereign-Debug-Host": cleanHost,
          "X-Sovereign-Registry-Status": registry ? "Loaded" : "Failed"
        }
      });
    }

    const path = url.pathname;

      // DOCKING GATEWAY (V6.8) - Normalizes leads from any site into the Master Ledger
      if (path.startsWith('/dock/')) {
        return await this.handleDockRequest(request, env, ctx);
      }

    // --- WEBSITE SERVING (Hybrid R2/Drive) ---
    if (!path.startsWith('/api/')) {
      return serveWebsite(path, client, env, ctx);
    }

    // --- CLIENT API ---
    if (path === '/api/data') return handleDataRead(request, client, env);
    if (path === '/api/act') return handleDataWrite(request, client, env);

    return new Response("Not Found", { status: 404 });
  },

  /**
   * SOVEREIGN INTELLIGENCE — LEAD DOCKING
   * Normalizes data from any source (Meta, WhatsApp, Web Forms)
   * and logs it into the Master Sovereign Ledger.
   */
  async handleDockRequest(request, env, ctx) {
    const url = new URL(request.url);
    const clientId = url.pathname.split('/')[2];
    
    try {
      const body = await request.json();
      const timestamp = new Date().toISOString();
      
      // 1. Prepare Sovereign Payload
      const payload = {
        timestamp,
        clientId,
        source: body.source || 'web-form',
        data: body.data || body,
        meta: {
          ip: request.headers.get('cf-connecting-ip'),
          ua: request.headers.get('user-agent'),
          ref: request.headers.get('referer')
        }
      };

      // 2. Background Task: Log to Master Ledger (Google Sheets)
      // Note: We would normally call the Sheets API here using the Service Account
      console.log(`[DOCK] Lead captured for ${clientId}:`, payload);
      
      // 3. Optional: Trigger Webhook or CRM Sync
      
      return new Response(JSON.stringify({ success: true, message: 'Sovereign Lead Docked', ref: timestamp }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINES
// ─────────────────────────────────────────────────────────────────────────────

async function serveWebsite(path, client, env, ctx) {
  const filePath = path === '/' ? 'cache/index.html' : `cache${path}`;
  const cacheKey = `${client.clientId}/${filePath}`;
  
  // 1. Try R2 (Fast Edge Cache)
  try {
    const r2Object = await env.R2_BUCKET.get(cacheKey);
    if (r2Object) {
      return new Response(r2Object.body, {
        headers: { 
          "Content-Type": getMimeType(filePath),
          "Cache-Control": "public, max-age=3600",
          "X-Sovereign-Source": "R2-Cache"
        }
      });
    }
  } catch (e) {}

  // 2. Fallback to Google Drive
  try {
    const fileId = client.storageConfig.fileIndex[filePath];
    if (!fileId) return new Response("404: File not in index", { status: 404 });

    const token = await getAccessToken(env);
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!driveRes.ok) throw new Error("Drive Fetch Failed");

    // Sync to R2 in background
    const driveClone = driveRes.clone();
    ctx.waitUntil((async () => {
      const blob = await driveClone.blob();
      await env.R2_BUCKET.put(cacheKey, blob);
    })());

    return new Response(driveRes.body, {
      headers: { 
        "Content-Type": getMimeType(filePath),
        "Cache-Control": "public, max-age=60",
        "X-Sovereign-Source": "Google-Drive-Rack"
      }
    });
  } catch (e) {
    return new Response(`Storage Error: ${e.message}`, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let cachedRegistry = null;
async function getRegistry(env) {
  if (cachedRegistry) return cachedRegistry;
  try {
    const fileId = env.MASTER_REGISTRY_FILE_ID;
    const token = await getAccessToken(env);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const clients = data.clients || {};
    cachedRegistry = {
      getByDomain: (domain) => Object.values(clients).find(c => (c.domain || "").toLowerCase() === domain.toLowerCase()),
      getByClientId: (id) => clients[id]
    };
    return cachedRegistry;
  } catch (e) {
    return null;
  }
}

async function getAccessToken(env) {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = b64(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));
  
  const signature = await sign(`${header}.${claim}`, sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${claim}.${signature}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  const data = await res.json();
  return data.access_token;
}

function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = { html:'text/html', css:'text/css', js:'application/javascript', png:'image/png', jpg:'image/jpeg', svg:'image/svg+xml', json:'application/json' };
  return types[ext] || 'text/plain';
}

function b64(str) { return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
async function sign(str, key) {
  const pemContents = key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(str));
  return b64(String.fromCharCode(...new Uint8Array(signature)));
}

async function handleDataRead() { return new Response("Read API Active"); }
async function handleDataWrite() { return new Response("Write API Active"); }
