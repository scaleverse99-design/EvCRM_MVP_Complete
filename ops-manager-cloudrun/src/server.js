/**
 * OPS MANAGER V6.0 — Main Server
 * 
 * A portable, self-contained HTTP server.
 * Deploys on Cloud Run, any VPS, or Docker host.
 * Cloudflare Workers fallback available in cloudflare-worker.js
 * 
 * Environment variables:
 *   STORAGE_ADAPTER = google-drive | s3 | local (default: google-drive)
 *   MASTER_REGISTRY_FILE_ID = Google Drive file ID of master-registry.json
 *   MASTER_ADMIN_TOKEN = Secret token for /api/master/* endpoints
 *   PORT = 8080 (default)
 */

'use strict';

const express = require('express');
const cors = require('cors');

// ── Storage Adapters ──────────────────────────────────────────────────────────
const { GoogleDriveAdapter } = require('./storage/google-drive');
const { S3Adapter } = require('./storage/s3');
const { ShadowCache, withCache } = require('./middleware/shadow-cache');

// ── Engines ───────────────────────────────────────────────────────────────────
const { handleRead } = require('./engine/read');
const { handleWrite } = require('./engine/write');
const { handleAdmin } = require('./engine/admin');
const { handleHealth, handleMasterHealth } = require('./engine/health');

// ── Middleware ────────────────────────────────────────────────────────────────
const { authMiddleware } = require('./middleware/auth');
const { Router } = require('./router');

// ── Queue ─────────────────────────────────────────────────────────────────────
const { Scheduler } = require('./queue/scheduler');

// ── Registry ──────────────────────────────────────────────────────────────────
const registry = createRegistry();

// ── Init Storage ──────────────────────────────────────────────────────────────
const cache = new ShadowCache({ maxEntries: 1000, defaultTtlMs: 60_000 });
const baseStorage = createStorageAdapter();
const storage = withCache(baseStorage, cache); // Wrap with cache

// ── Init Server ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
// Payment feature flag – set to true to enable payment-related endpoints
const ENABLE_PAYMENT = false;
if (!ENABLE_PAYMENT) {
  // Middleware to block payment and credit endpoints when disabled
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/payments') || req.path.startsWith('/api/credits')) {
      return res.status(404).json({ error: 'Payment endpoints are disabled' });
    }
    next();
  });
}

// ── Router (subdomain → clientId) ─────────────────────────────────────────────
const router = new Router(registry, baseStorage);
app.use(router.middleware());

// ── Scheduler ─────────────────────────────────────────────────────────────────
const scheduler = new Scheduler(storage, registry);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/data?file=products
 * Public data read — serves cache JSON files.
 */
app.get('/api/data', async (req, res) => {
  await handleRead(req, res, storage, registry);
});

/**
 * POST /api/act
 * Write action — queues the action and returns instantly.
 * { action: "PLACE_ORDER", data: {...}, token: "..." }
 */
app.post('/api/act', async (req, res) => {
  await handleWrite(req, res, storage, registry);
});

/**
 * POST /api/admin
 * Business owner dashboard API. Requires owner/manager token.
 */
app.post('/api/admin', authMiddleware(storage, 'manager'), async (req, res) => {
  await handleAdmin(req, res, storage);
});

/**
 * GET /api/health
 * Per-client health check.
 */
app.get('/api/health', async (req, res) => {
  await handleHealth(req, res, storage, registry);
});

/**
 * POST /api/ai/query
 * Securely query Gemini, OpenAI, or Anthropic using the user's custom API key.
 * Resolves browser CORS blocks for Anthropic/OpenAI keys.
 */
app.post('/api/ai/query', async (req, res) => {
  const { apiKey, messages, responseSchema } = req.body;
  if (!apiKey || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing apiKey or messages list' });
  }

  // Auto-detect provider based on key prefix
  let provider = 'gemini';
  if (apiKey.startsWith('sk-ant-')) {
    provider = 'anthropic';
  } else if (apiKey.startsWith('sk-')) {
    provider = 'openai';
  }

  try {
    let url;
    let headers = { 'Content-Type': 'application/json' };
    let body;

    const isGemini = provider === 'gemini';
    const isOpenAI = provider === 'openai';
    const isAnthropic = provider === 'anthropic';

    if (isGemini) {
      const contents = messages.map(m => {
        const text = m.content || (m.parts && m.parts[0]?.text) || '';
        return {
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        };
      });

      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      body = {
        contents,
        generationConfig: responseSchema ? {
          responseMimeType: 'application/json',
          responseSchema
        } : undefined
      };
    } else if (isOpenAI) {
      const formattedMessages = messages.map(m => {
        const content = m.content || (m.parts && m.parts[0]?.text) || '';
        return {
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content
        };
      });

      url = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        response_format: responseSchema ? { type: 'json_object' } : undefined
      };
    } else if (isAnthropic) {
      const formattedMessages = messages.map(m => {
        const content = m.content || (m.parts && m.parts[0]?.text) || '';
        
        // Filter out developer system prompt instruction to separate system block if needed
        return {
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content
        };
      });

      // Simple handling for system prompt in Anthropic: combine or extract
      // To keep it clean and inline with Anthropic's expectations (must alternate user/assistant, starting with user)
      // If the first message contains system prompt, we can leave it as user or inject system separately.
      url = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: formattedMessages
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const resJson = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: resJson.error || resJson });
    }

    let textResult = '';
    if (isGemini) {
      textResult = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (isOpenAI) {
      textResult = resJson.choices?.[0]?.message?.content || '';
    } else if (isAnthropic) {
      textResult = resJson.content?.[0]?.text || '';
    }

    return res.json({ success: true, text: textResult, provider });
  } catch (err) {
    console.error('[AI Query Proxy] Error:', err.message);
    return res.status(500).json({ error: 'AI request failed', detail: err.message });
  }
});

/**
 * GET /api/master/health
 * Master admin — returns health of ALL clients.
 * Requires master admin token.
 */
app.get('/api/master/health', requireMasterToken, async (req, res) => {
  await handleMasterHealth(req, res, storage, registry);
});

/**
 * POST /api/master/provision
 * Master admin — provisions folder structure for a new clientId.
 */
app.post('/api/master/provision', requireMasterToken, async (req, res) => {
  const { clientId, businessName } = req.body;
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });
  try {
    const result = await baseStorage.provisionClient(clientId, { businessName });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Provisioning failed', detail: err.message });
  }
});

/**
 * POST /api/master/upload
 * Master admin — uploads files or writes data for any client.
 */
app.post('/api/master/upload', requireMasterToken, async (req, res) => {
  const { clientId, path: filePath, content, mimeType, isJson } = req.body;
  if (!clientId || !filePath || content === undefined) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    // Ensure the client storage config is loaded into the storage adapter index
    const clientConfig = registry.getByClientId(clientId);
    if (clientConfig && clientConfig.storageConfig) {
      baseStorage.loadClient(clientId, clientConfig.storageConfig);
    }

    if (isJson) {
      const parsedData = typeof content === 'string' ? JSON.parse(content) : content;
      await baseStorage.write(clientId, filePath, parsedData);
    } else {
      await baseStorage.upload(clientId, filePath, content, mimeType || 'text/html');
    }
    res.json({ success: true, message: `Uploaded ${filePath} successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

/**
 * POST /api/master/register
 * Master admin — registers or updates a client config in the registry.
 */
app.post('/api/master/register', requireMasterToken, async (req, res) => {
  const { clientId, config } = req.body;
  if (!clientId || !config) return res.status(400).json({ error: 'Missing clientId or config' });
  try {
    registry.register(clientId, config);
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
          body: JSON.stringify({ version: 2, clients: registry.listAll() }, null, 2)
        }
      });
    }
    res.json({ success: true, message: `Registered client ${clientId} successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

/**
 * POST /api/sync
 * Manually trigger queue processing for a client.
 * Requires owner token.
 */
app.post('/api/sync', authMiddleware(storage, 'owner'), async (req, res) => {
  const result = await scheduler.triggerSync(req.clientId);
  res.json(result);
});

/**
 * GET /api/cache/stats
 * Returns shadow cache stats for monitoring.
 */
app.get('/api/cache/stats', requireMasterToken, (req, res) => {
  res.json(cache.stats());
});

// ── SmartNotes Credits & Billing Endpoints ────────────────────────────────────

app.get('/api/credits', async (req, res) => {
  const clientId = req.query.clientId || req.clientId || 'notes';
  const clientConfig = registry.getByClientId(clientId);
  if (!clientConfig) {
    return res.status(404).json({ error: 'Client not found' });
  }
  if (!clientConfig.storageConfig) clientConfig.storageConfig = {};
  const balance = clientConfig.storageConfig.credits !== undefined ? clientConfig.storageConfig.credits : 100;
  res.json({ success: true, clientId, credits: balance });
});

app.post('/api/credits/deduct', async (req, res) => {
  const { clientId, amount } = req.body;
  const cid = clientId || req.clientId || 'notes';
  const deductAmount = amount !== undefined ? Number(amount) : 1;

  const clientConfig = registry.getByClientId(cid);
  if (!clientConfig) {
    return res.status(404).json({ error: 'Client not found' });
  }
  if (!clientConfig.storageConfig) clientConfig.storageConfig = {};
  const current = clientConfig.storageConfig.credits !== undefined ? clientConfig.storageConfig.credits : 100;
  const updated = Math.max(0, current - deductAmount);

  clientConfig.storageConfig.credits = updated;

  // Save registry back to Google Drive
  const fileId = process.env.MASTER_REGISTRY_FILE_ID;
  if (fileId) {
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify({ version: 2, clients: registry.listAll() }, null, 2)
        }
      });
    } catch (err) {
      console.error('[Deduct] Registry write failed:', err.message);
    }
  }

  console.log(`[Credits] Deducted ${deductAmount} credits from ${cid}. Remaining: ${updated}`);
  res.json({ success: true, clientId: cid, credits: updated });
});

app.post('/api/payments/create-link', async (req, res) => {
  const { clientId, amount } = req.body;
  if (!amount || amount < 50 || amount > 1000) {
    return res.status(400).json({ error: 'Amount must be between ₹50 and ₹1000' });
  }

  const cid = clientId || req.clientId || 'notes';
  const clientConfig = registry.getByClientId(cid);
  if (!clientConfig) {
    return res.status(404).json({ error: 'Client not found' });
  }
  if (!clientConfig.storageConfig) clientConfig.storageConfig = {};
  if (!clientConfig.storageConfig.orders) clientConfig.storageConfig.orders = [];

  const orderId = `ORDER-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  function calculateCreditsForAmount(amount) {
    if (amount === 100) return 100;
    if (amount === 250) return 300;
    if (amount === 500) return 700;
    return amount;
  }
  const creditsToAward = calculateCreditsForAmount(Number(amount));

  const newOrder = {
    orderId,
    clientId: cid,
    amount: Number(amount),
    credits: creditsToAward,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  clientConfig.storageConfig.orders.push(newOrder);

  // Save registry back to Google Drive
  const fileId = process.env.MASTER_REGISTRY_FILE_ID;
  if (fileId) {
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify({ version: 2, clients: registry.listAll() }, null, 2)
        }
      });
    } catch (err) {
      console.error('[Create Link] Registry write failed:', err.message);
    }
  }

  const host = req.get('host') || 'notes.socialcom.store';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const protocol = isHttps ? 'https' : 'http';

  let checkoutUrl = `${protocol}://${host}/api/payments/simulate-checkout?orderId=${orderId}`;
  
  res.json({
    success: true,
    orderId,
    amount,
    credits: creditsToAward,
    checkoutUrl,
    isLive: false
  });
});

app.get('/api/payments/status', async (req, res) => {
  const orderId = req.query.orderId?.toString();
  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  const allClients = registry.listAll();
  let foundOrder = null;

  for (const client of Object.values(allClients)) {
    const orders = client.storageConfig?.orders || [];
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      foundOrder = order;
      break;
    }
  }

  if (!foundOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({
    success: true,
    orderId: foundOrder.orderId,
    clientId: foundOrder.clientId,
    amount: foundOrder.amount,
    credits: foundOrder.credits,
    status: foundOrder.status,
    createdAt: foundOrder.createdAt,
    updatedAt: foundOrder.updatedAt
  });
});

app.post('/api/payments/simulate-success', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  const allClients = registry.listAll();
  let targetClient = null;
  let targetOrderIndex = -1;

  for (const client of Object.values(allClients)) {
    const orders = client.storageConfig?.orders || [];
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx !== -1) {
      targetClient = client;
      targetOrderIndex = idx;
      break;
    }
  }

  if (!targetClient || targetOrderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = targetClient.storageConfig.orders[targetOrderIndex];
  if (order.status !== 'PENDING') {
    return res.json({ success: true, message: 'Order is already processed', status: order.status });
  }

  order.status = 'SUCCESS';
  order.updatedAt = new Date().toISOString();
  targetClient.storageConfig.orders[targetOrderIndex] = order;

  const currentCredits = targetClient.storageConfig.credits !== undefined ? targetClient.storageConfig.credits : 100;
  const updatedCredits = currentCredits + order.credits;
  targetClient.storageConfig.credits = updatedCredits;

  // Save registry back to Google Drive
  const fileId = process.env.MASTER_REGISTRY_FILE_ID;
  if (fileId) {
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify({ version: 2, clients: registry.listAll() }, null, 2)
        }
      });
    } catch (err) {
      console.error('[Simulate Success] Registry write failed:', err.message);
    }
  }

  console.log(`[Simulation] Payment clear. Awarded ${order.credits} credits to client ${order.clientId}. New balance: ${updatedCredits}`);
  res.json({
    success: true,
    message: 'Payment simulation succeeded.',
    orderId,
    credits: updatedCredits
  });
});

app.get('/api/payments/simulate-checkout', async (req, res) => {
  const orderId = req.query.orderId?.toString();
  if (!orderId) {
    return res.status(400).send('Missing orderId');
  }

  const allClients = registry.listAll();
  let foundOrder = null;

  for (const client of Object.values(allClients)) {
    const orders = client.storageConfig?.orders || [];
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      foundOrder = order;
      break;
    }
  }

  if (!foundOrder) {
    return res.status(404).send('Order not found');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paytm Secure UPI Checkout Simulator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        <!-- Brand Header -->
        <div class="bg-[#002970] p-6 text-white text-center relative">
            <div class="absolute left-6 top-6 text-xs bg-sky-500/20 text-sky-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Sandbox</div>
            <h1 class="text-2xl font-black tracking-tight mt-4">paytm</h1>
            <p class="text-slate-300 text-xs mt-1">Secure UPI & Card Checkout</p>
        </div>

        <!-- Order Summary Card -->
        <div class="p-6 border-b border-slate-100 bg-slate-50/50">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchant Name</h2>
                    <p class="text-sm font-bold text-slate-800 mt-0.5">Context Capsule</p>
                </div>
                <div class="text-right">
                    <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount Due</h2>
                    <p class="text-xl font-extrabold text-[#00b9f5] mt-0.5">₹${foundOrder.amount}.00</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-y-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                    <span class="text-slate-400">Order ID:</span>
                    <span class="font-mono font-semibold text-slate-700 ml-1">${foundOrder.orderId}</span>
                </div>
                <div class="text-right">
                    <span class="text-slate-400">Client Space:</span>
                    <span class="font-semibold text-slate-700 ml-1">${foundOrder.clientId}</span>
                </div>
                <div>
                    <span class="text-slate-400">Items:</span>
                    <span class="font-semibold text-slate-700 ml-1">Credits Purchase</span>
                </div>
                <div class="text-right">
                    <span class="text-slate-400">Credits to receive:</span>
                    <span class="font-bold text-emerald-600 ml-1">+${foundOrder.credits}</span>
                </div>
            </div>
        </div>

        <!-- Payment Actions -->
        <div class="p-6 space-y-4">
            <div class="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl text-amber-800 text-xs leading-relaxed flex gap-3">
                <span class="text-lg">ℹ️</span>
                <span>This is a simulated secure sandbox environment. Confirming the mock payment will credit the space balance instantly.</span>
            </div>

            <button onclick="approvePayment()" id="btn-approve" class="w-full bg-[#00b9f5] hover:bg-[#009ed4] text-white py-3.5 px-6 rounded-2xl text-sm font-bold shadow-lg shadow-sky-100 transition duration-200 flex items-center justify-center gap-2">
                <span>⚡</span> Approve simulated transaction
            </button>
            
            <button onclick="window.close()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 px-6 rounded-2xl text-sm font-semibold transition duration-200">
                Cancel
            </button>
        </div>
        
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
            Powered by Paytm Secure Web gateway
        </div>
    </div>

    <script>
        async function approvePayment() {
            const btn = document.getElementById('btn-approve');
            btn.disabled = true;
            btn.innerHTML = 'Processing...';
            
            try {
                const res = await fetch('/api/payments/simulate-success', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: "${foundOrder.orderId}" })
                });
                const data = await res.json();
                if (data && data.success) {
                    btn.innerHTML = '✅ Approved!';
                    btn.classList.remove('bg-[#00b9f5]', 'hover:bg-[#009ed4]');
                    btn.classList.add('bg-emerald-500');
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    alert('Error clearing payment simulator');
                    btn.disabled = false;
                    btn.innerHTML = 'Approve simulated transaction';
                }
            } catch (err) {
                alert('Connection failure');
                btn.disabled = false;
                btn.innerHTML = 'Approve simulated transaction';
            }
        }
    </script>
</body>
</html>
  `;
  res.set('Content-Type', 'text/html');
  res.send(html);
});

// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /* — Serve client website static files from Drive/S3
 * This is the main website serving route.
 */
app.get('*', async (req, res) => {
  const path = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');

  if (req.clientId === 'notes' || req.clientId === 'smartnotes' || req.clientConfig?.templateId === 'smartnotes') {
    const hasExt = path.includes('.');
    if (!hasExt || path === 'index.html' || path === '') {
      const fs = require('fs');
      const pathLib = require('path');
      const localPath = pathLib.join(__dirname, 'public/notes.html');
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.send(content);
      }
    }
  }

  if (req.clientId === 'toolsbase') {
    if (path === 'index.html' || path === '') {
      const fs = require('fs');
      const pathLib = require('path');
      const localPath = pathLib.join(__dirname, 'public/toolsbase.html');
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        res.set('Content-Type', 'text/html');
        return res.send(content);
      }
    }
  }

  if (req.clientId === 'socialcom' || req.clientId === 'socialcomstore') {
    if (path === 'index.html' || path === '') {
      const fs = require('fs');
      const pathLib = require('path');
      const localPath = pathLib.join(__dirname, 'public/index.html');
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        res.set('Content-Type', 'text/html');
        return res.send(content);
      }
    }
  }

  if (!req.clientId) {
    if (path === 'index.html' || path === '') {
      const fs = require('fs');
      const pathLib = require('path');
      const localPath = pathLib.join(__dirname, 'public/index.html');
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        res.set('Content-Type', 'text/html');
        return res.send(content);
      }
    }
    return res.status(404).send('No client configured for this domain.');
  }

  // Serve static files directly from local public folder if they exist
  const fs = require('fs');
  const pathLib = require('path');
  const localFilePath = pathLib.join(__dirname, 'public', path);
  if (fs.existsSync(localFilePath) && !fs.lstatSync(localFilePath).isDirectory()) {
    const content = fs.readFileSync(localFilePath);
    const mimeType = getMimeType(path);
    res.set('Content-Type', mimeType);
    return res.send(content);
  }

  const client = registry.getByClientId(req.clientId);
  if (client && client.status && client.status !== 'live' && client.status !== 'ACTIVE' && client.status !== 'active') {
    return res.status(402).send(`
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
    `);
  }

  const hasExtension = path.includes('.') || path === 'index.html';
  const storePath = `cache/${path}${!hasExtension ? '.html' : ''}`;

  try {
    const content = await storage.read(req.clientId, storePath);
    const mimeType = getMimeType(path);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=60');
    // If content is an object (JSON was returned instead of raw string), re-stringify
    res.send(typeof content === 'string' ? content : JSON.stringify(content));
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).send(`
        <html>
          <body style="font-family:sans-serif;padding:40px;text-align:center">
            <h1>404 — Page Not Found</h1>
            <p>The page <strong>${path}</strong> doesn't exist on this site.</p>
          </body>
        </html>
      `);
    }
    console.error(`[Server] File serve error ${req.clientId}/${path}:`, err.message);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function requireMasterToken(req, res, next) {
  const token = req.headers['x-master-token'] || req.query.masterToken;
  if (!token || token !== process.env.MASTER_ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Master token required' });
  }
  next();
}

function getMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff2: 'font/woff2',
    vsix: 'application/vsix',
    zip: 'application/zip'
  };
  return types[ext] || 'text/plain';
}

function createStorageAdapter() {
  const adapter = process.env.STORAGE_ADAPTER || 'google-drive';
  console.log(`[Server] Using storage adapter: ${adapter}`);

  if (adapter === 'google-drive') {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    return new GoogleDriveAdapter(auth);
  }

  if (adapter === 's3') {
    return new S3Adapter();
  }

  throw new Error(`Unknown storage adapter: ${adapter}. Use 'google-drive' or 's3'`);
}

function createRegistry() {
  // In-memory registry with periodic refresh from master file
  const clients = {};
  let lastRefresh = null;

  return {
    load(data) {
      Object.assign(clients, data.clients || {});
      lastRefresh = new Date().toISOString();
    },
    getByClientId(clientId) {
      return clients[clientId] || null;
    },
    getByDomain(domain) {
      return Object.values(clients).find(c => c.domain === domain) || null;
    },
    listAll() {
      return { ...clients };
    },
    register(clientId, config) {
      clients[clientId] = { ...config, registeredAt: new Date().toISOString() };
    },
    updateStatus(clientId, updates) {
      if (clients[clientId]) {
        Object.assign(clients[clientId], updates);
      }
    },
    getStats() {
      return { total: Object.keys(clients).length, lastRefresh };
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap() {
  // Load master registry
  try {
    const fileId = process.env.MASTER_REGISTRY_FILE_ID;
    if (fileId) {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      const drive = google.drive({ version: 'v3', auth });
      const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
      registry.load(res.data);
      console.log(`[Server] Loaded ${Object.keys(res.data.clients || {}).length} clients from master registry`);
    } else {
      console.warn('[Server] MASTER_REGISTRY_FILE_ID is not set. Starting with empty registry.');
    }
  } catch (err) {
    console.warn(`[Server] Could not load master registry (ID: ${process.env.MASTER_REGISTRY_FILE_ID}):`, err.message);
  }

  // Start scheduler
  scheduler.start();

  // Start HTTP server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Ops Manager V6.0 running on port ${PORT}`);
    console.log(`   Storage: ${process.env.STORAGE_ADAPTER || 'google-drive'}`);
    console.log(`   Clients: ${Object.keys(registry.listAll()).length}`);
  });
}

bootstrap().catch(err => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

module.exports = app; // For testing
