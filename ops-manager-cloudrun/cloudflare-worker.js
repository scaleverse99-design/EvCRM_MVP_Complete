/**
 * OPS MANAGER V6.0 — Cloudflare Worker
 * 
 * Fallback deployment target if Cloud Run is unavailable.
 * Deploy with: wrangler deploy cloudflare-worker.js
 * 
 * Free tier: 100,000 requests/day
 * Runs at the edge — Mumbai, Chennai, Delhi nodes
 * 
 * Environment variables (set in Cloudflare dashboard):
 *   MASTER_REGISTRY_URL = Direct URL to master-registry.json on Google Drive
 *   MASTER_ADMIN_TOKEN  = Master admin token
 *   GOOGLE_ACCESS_TOKEN = Service account access token for Drive API
 */

// ─────────────────────────────────────────────────────────────────────────────
// MASTER REGISTRY (cached in Cloudflare KV or fetched fresh every 60s)
// ─────────────────────────────────────────────────────────────────────────────

let _registry = null;
let _registryLoadedAt = 0;

async function getRegistry(env) {
  const now = Date.now();
  if (_registry && now - _registryLoadedAt < 60_000) return _registry; // 60s cache

  try {
    const url = env.MASTER_REGISTRY_URL;
    const token = await getAccessToken(env);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    _registry = await res.json();
    _registryLoadedAt = now;
  } catch {
    _registry = _registry || { clients: {} }; // Use stale cache on failure
  }
  return _registry;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE API HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// ── SERVICE ACCOUNT AUTH ───────────────────────────────────────────────────
async function getAccessToken(env) {
  // Deep clean: force replace all literal \n strings with real newlines
  let privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').trim();
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;
  
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  
  const payload = b64(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  }));
  
  const unsignedToken = `${header}.${payload}`;
  const signature = await sign(unsignedToken, privateKey);
  const jwt = `${unsignedToken}.${signature}`;
  
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function b64(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(content, key) {
  // Super-Clean: extract ONLY valid Base64 characters
  const base64 = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');
    
  // Manual Binary Decoder (More robust than atob for raw bytes)
  const binaryString = atob(base64);
  const binaryKey = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryKey[i] = binaryString.charCodeAt(i);
  }
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(content)
  );
  
  return b64(String.fromCharCode(...new Uint8Array(signature)));
}
// ── END AUTH ────────────────────────────────────────────────────────────────

async function driveRead(fileId, token) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return res.json();
}

async function driveWrite(token, folderId, fileName, content) {
  const q = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;
  
  const listRes = await fetch(listUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listData = await listRes.json();
  
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  if (listData.files && listData.files.length > 0) {
    // Update existing
    const fileId = listData.files[0].id;
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
      body
    });
    if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);
    return updateRes.json();
  } else {
    // Create new (Multipart)
    const meta = { name: fileName, parents: [folderId] };
    const boundary = '-------314159265358979323846';
    const multipartBody = 
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${body}\r\n` +
      `--${boundary}--`;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    if (!createRes.ok) {
        const errData = await createRes.text();
        throw new Error(`Create failed (${createRes.status}): ${errData}`);
    }
    return createRes.json();
  }
}

async function findOrCreateFolder(token, name, parentId) {
  const q = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      parents: [parentId],
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const folder = await createRes.json();
  if (!folder.id) throw new Error(`Folder creation failed for ${name}: ${JSON.stringify(folder)}`);
  return folder.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Resolve client from hostname
    const registry = await getRegistry(env);
    
    // 1. Get client ID with aggressive fallback
    const clientId = url.searchParams.get('clientId') || 
                  (hostname.includes('evcrm') || hostname.includes('sovereign') ? 'ev-crm' : 
                  (hostname.split('.').length >= 3 ? hostname.split('.')[0] : 'ev-crm'));

    let client = null;

    // Hardcoded seed for ev-crm (The Master Client) - DIRECT HOTLINKS
    if (clientId === 'ev-crm' || clientId === 'sovereign-gateway' || hostname.includes('workers.dev')) {
      client = {
        clientId: 'ev-crm',
        storageConfig: {
          folderId: '1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn',
          fileIndex: {
            'cache/pulse.json': '1Hq_tiNAwIk9q9SDQbT__-gZmdQrQbZedH8d969qZdMI',
            'cache/pending_reviews.json': '1nZcoX-bdVdozyoOf_Ht81JPFVzXPj3qx35sOXyMiHsg',
            'queue/pending_writes.json': '1VL5o3133TpTdEpzRqQZ7SUZXR0k-oIhI',
            'data/leads.json': null,
            'config/settings.json': null
          }
        }
      };
    } else {
      client = clientId ? registry.clients?.[clientId] : null;
    }

    // ── DEBUG ENDPOINT ──────────────────────────────────────────────────────
    if (url.pathname === '/api/debug') {
        let authStatus = 'Testing...';
        let driveTest = 'Testing...';
        try {
            const testToken = await getAccessToken(env);
            authStatus = 'Authenticated OK';
            
            // Move folderId resolution here for debug
            const fid = client.storageConfig?.folderId || '1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn';
            
            const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fid}?fields=name`, {
                headers: { Authorization: `Bearer ${testToken}` }
            });
            const driveData = await driveRes.json();
            driveTest = driveRes.ok ? `Connected to folder: ${driveData.name}` : `Drive error: ${JSON.stringify(driveData)}`;
        } catch (err) {
            authStatus = `Auth Failed: ${err.message}`;
        }

        return new Response(JSON.stringify({
            hostname,
            clientId,
            resolvedClient: client ? client.clientId : 'null',
            auth: authStatus,
            drive: driveTest,
            keyInfo: {
                length: env.GOOGLE_PRIVATE_KEY ? env.GOOGLE_PRIVATE_KEY.length : 0,
                prefix: env.GOOGLE_PRIVATE_KEY ? env.GOOGLE_PRIVATE_KEY.substring(0, 30) : 'MISSING'
            },
            timestamp: new Date().toISOString()
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (!client) {
      return new Response(`No site found for ${hostname} (ClientId: ${clientId})`, { status: 404 });
    }

    // ── SUBSCRIPTION STATUS LOCK SCREEN ─────────────────────────────────────
    if (client.status && client.status !== 'live' && client.status !== 'ACTIVE' && client.status !== 'active') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Subscription Suspended | Ev.CRM</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Plus Jakarta Sans', sans-serif; }
            </style>
        </head>
        <body class="bg-[#0b0f19] text-white min-h-screen flex items-center justify-center p-6">
            <div class="max-w-md w-full bg-[#111827] border border-gray-800 p-10 rounded-[2.5rem] text-center shadow-2xl">
                <div class="text-6xl mb-6">🔒</div>
                <h1 class="text-3xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">
                    Access Suspended
                </h1>
                <p class="text-gray-400 mb-8 leading-relaxed text-sm">
                    Access to your sovereign EvCRM instance for <span class="text-white font-bold">${client.businessName || client.clientId}</span> is currently suspended due to an inactive subscription.
                </p>
                <div class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-semibold mb-8">
                    Please renew your subscription or contact support to restore live access.
                </div>
                <div class="text-gray-600 text-xs border-t border-gray-900 pt-6">
                    Your data remains safe, sovereign, and encrypted in your private Google Drive folder.
                </div>
            </div>
        </body>
        </html>
      `, {
        status: 402,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // ── GET DYNAMIC ACCESS TOKEN ─────────────────────────────────────────────
    const token = await getAccessToken(env);
    
    // ── SMART DISCOVERY: Find missing file IDs by name ───────────────
    const folderId = client.storageConfig.folderId;
    const fileIndex = client.storageConfig.fileIndex || {};

    async function getFileId(path) {
        if (fileIndex[path]) return fileIndex[path];
        
        const parts = path.split('/');
        const fileName = parts.pop();
        
        // Traverse folders recursively
        let currentParentId = folderId;
        for (const dirName of parts) {
            currentParentId = await findOrCreateFolder(token, dirName, currentParentId);
        }
        
        const q = `name = '${fileName}' and '${currentParentId}' in parents and trashed = false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, mimeType)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.files && data.files.length > 0) {
            // Verify it's not a folder if we expect a file
            if (data.files[0].mimeType === 'application/vnd.google-apps.folder') {
                throw new Error(`Path collision: ${path} resolved to a folder, but a file was expected.`);
            }
            fileIndex[path] = data.files[0].id;
            return fileIndex[path];
        }

        // Create it if missing
        const newFile = await driveWrite(token, currentParentId, fileName, path.includes('pulse') || path.includes('reviews') ? [] : { version: 1 });
        fileIndex[path] = newFile.id;
        return fileIndex[path];
    }

    const path = url.pathname;

    // ── API: Initialize Rack Architecture ──────────────────────────────────
    if (path === '/api/init') {
      const folderId = client.storageConfig.folderId;
      console.log(`🚀 Bootstrapping Rack for ${clientId} in folder ${folderId}`);

      try {
        // 1. Create Folders
        const cacheId = await findOrCreateFolder(token, 'cache', folderId);
        const dataId = await findOrCreateFolder(token, 'data', folderId);
        const configId = await findOrCreateFolder(token, 'config', folderId);

        // 2. Seed Initial Files
        const now = new Date().toISOString();
        const files = [
          { folder: cacheId, name: 'pulse.json', content: { version: 1, lastUpdated: now, articles: [] } },
          { folder: cacheId, name: 'pending_reviews.json', content: { version: 1, lastUpdated: now, articles: [] } },
          { folder: dataId, name: 'leads.json', content: { version: 1, leads: [], lastUpdated: now } },
          { folder: configId, name: 'settings.json', content: { version: 1, clientId, storageAdapter: 'google-drive', provisionedAt: now } }
        ];

        for (const f of files) {
          await driveWrite(token, f.folder, f.name, f.content);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Rack architecture initialized successfully',
          folders: { cache: cacheId, data: dataId, config: configId }
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ── API: Read data ──────────────────────────────────────────────────────
    if (path === '/api/data') {
      const file = url.searchParams.get('file');
      const fileId = await getFileId(`cache/${file}.json`);
      if (!fileId) return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
      try {
        const data = await driveRead(fileId, token);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // ── API: Write action ───────────────────────────────────────────────────
    if (path === '/api/act' && request.method === 'POST') {
      try {
        const body = await request.json();
        const queueFileId = await getFileId('queue/pending_writes.json');

        let queue = { version: 1, pending: [] };
        try { 
            const data = await driveRead(queueFileId, token); 
            if (data && typeof data === 'object') queue = data;
        } catch {}

        if (!Array.isArray(queue.pending)) queue.pending = [];

        queue.pending.push({
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: body.action,
          data: body.data || {},
          timestamp: Date.now(),
          status: 'pending'
        });
        queue.version = (queue.version || 0) + 1;

        await driveWrite(token, queueFileId, 'pending_writes.json', queue);

        // ── EDITORIAL WORKFLOW (Baremetal Drive) ───────────────────────────
        
        // 1. STAGE_NEWS: Drop into Pending Review
        if (body.action === 'STAGE_NEWS') {
            try {
                const pendingFileId = await getFileId('cache/pending_reviews.json');
                let pending = [];
                try { 
                    const data = await driveRead(pendingFileId, token);
                    if (Array.isArray(data)) pending = data;
                } catch {}
                
                const newArticles = body.data.articles || [];
                pending = [...newArticles, ...pending].slice(0, 100);
                
                await driveWrite(token, pendingFileId, 'pending_reviews.json', pending);
            } catch (err) { console.warn("[Gateway] Staging failed:", err.message); }
        }

        // 2. APPROVE_NEWS: Move from Pending to Live Pulse
        if (body.action === 'APPROVE_NEWS') {
            try {
                const pulseFileId = await getFileId('cache/pulse.json');
                const pendingFileId = await getFileId('cache/pending_reviews.json');
                
                let [pulse, pending] = await Promise.all([
                    driveRead(pulseFileId, token).catch(() => []),
                    driveRead(pendingFileId, token).catch(() => [])
                ]);

                if (!Array.isArray(pulse)) pulse = [];
                if (!Array.isArray(pending)) pending = [];

                const articleId = body.data.id;
                const article = pending.find(a => a.id === articleId);
                
                if (article) {
                    pulse = [body.data.article, ...pulse].slice(0, 100);
                    const filteredPending = pending.filter(a => a.id !== articleId);
                    
                    await Promise.all([
                        driveWrite(token, pulseFileId, 'pulse.json', pulse),
                        driveWrite(token, pendingFileId, 'pending_reviews.json', filteredPending)
                    ]);
                }
            } catch (err) { console.warn("[Gateway] Approval failed:", err.message); }
        }

        // 3. PUBLISH_NEWS: Direct to Live (Bypass Review)
        if (body.action === 'PUBLISH_NEWS') {
            try {
                const pulseFileId = await getFileId('cache/pulse.json');
                let masterPulse = [];
                try { 
                    const data = await driveRead(pulseFileId, token);
                    if (Array.isArray(data)) masterPulse = data;
                } catch {}
                
                const newArticles = body.data.articles || [];
                masterPulse = [...newArticles, ...masterPulse].slice(0, 100);
                await driveWrite(token, pulseFileId, 'pulse.json', masterPulse);
            } catch (err) { console.warn("[Gateway] Direct Publish failed:", err.message); }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ── Health check ────────────────────────────────────────────────────────
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status: 'live',
        clientId,
        domain: hostname,
        runtime: 'cloudflare-worker',
        timestamp: new Date().toISOString()
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── Serve static file from Drive ────────────────────────────────────────
    let filePath = path === '/' ? 'cache/index.html' : `cache${path}`;
    
    // Clean URLs fallback: if path has no extension and is not root, append .html
    const lastSegment = path.split('/').pop() || "";
    if (path !== '/' && !lastSegment.includes('.')) {
      filePath += '.html';
    }
    
    const fileId = await getFileId(filePath);

    if (!fileId) {
      return new Response(`File not found: ${filePath}`, { status: 404 });
    }

    try {
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const content = await fileRes.text();
      const mimeType = filePath.endsWith('.html') ? 'text/html' :
        filePath.endsWith('.css') ? 'text/css' :
        filePath.endsWith('.js') ? 'application/javascript' : 'text/plain';

      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=60'
        }
      });
    } catch (err) {
      return new Response('Error serving file: ' + err.message, { status: 500 });
    }
  }
};
