/**
 * OPS MANAGER V6.0 — Write Engine (Queue Pattern)
 * 
 * All writes go to pending_writes.json immediately.
 * User gets instant success response.
 * Queue is processed in background every 6 hours.
 * 
 * Supported actions:
 *   PLACE_ORDER, UPDATE_ORDER_STATUS, ADD_LEAD, UPDATE_LEAD,
 *   UPDATE_INVENTORY, ADD_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT,
 *   UPDATE_BUSINESS_INFO, SUBMIT_ENQUIRY
 */

const VALID_ACTIONS = new Set([
  'PLACE_ORDER',
  'UPDATE_ORDER_STATUS',
  'ADD_LEAD',
  'UPDATE_LEAD',
  'UPDATE_INVENTORY',
  'ADD_PRODUCT',
  'UPDATE_PRODUCT',
  'DELETE_PRODUCT',
  'UPDATE_BUSINESS_INFO',
  'SUBMIT_ENQUIRY',
  'SAVE_NOTE',
  'DELETE_NOTE',
  'SAVE_SETTINGS'
]);

function generateActionId() {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function handleWrite(req, res, storage, registry) {
  const { action, data } = req.body;
  const clientId = req.clientId;

  const clientConfig = registry.getByClientId(clientId);
  const isSmartNotes = clientConfig?.templateId === 'smartnotes' || clientId === 'notes' || clientId === 'smartnotes';

  if (isSmartNotes && (action === 'SAVE_NOTE' || action === 'DELETE_NOTE' || action === 'SAVE_SETTINGS')) {
    const client = clientConfig;
    if (client) {
      if (!client.storageConfig) client.storageConfig = {};
      if (!client.storageConfig.notesData) client.storageConfig.notesData = { notes: [] };
      const notes = client.storageConfig.notesData.notes;

      if (action === 'SAVE_NOTE') {
        const note = data;
        
        // Dynamically classify the project of the note based on its context
        let proj = note.project_id ? note.project_id.toLowerCase() : '';
        if (!proj || proj === 'smartnotes') {
          const titleLower = (note.title || '').toLowerCase();
          const contentLower = (note.full_content || '').toLowerCase();
          
          if (titleLower.includes('ev.crm') || titleLower.includes('ev-crm') || contentLower.includes('ev-crm') || contentLower.includes('ev.crm')) {
            proj = 'ev-crm';
          } else if (titleLower.includes('socialcom-store') || titleLower.includes('socialcomstore') || contentLower.includes('socialcom-store')) {
            proj = 'socialcom-store';
          } else if (titleLower.includes('officeconnect') || contentLower.includes('officeconnect')) {
            proj = 'officeconnect';
          } else if (titleLower.includes('taskbarpro') || contentLower.includes('taskbarpro')) {
            proj = 'taskbarpro';
          } else if (titleLower.includes('aura-commerce') || contentLower.includes('auracommerce')) {
            proj = 'aura-commerce';
          } else if (titleLower.includes('craftman') || contentLower.includes('craftman')) {
            proj = 'craftman';
          } else if (titleLower.includes('ops-manager') || titleLower.includes('opsmanager') || contentLower.includes('ops-manager')) {
            proj = 'ops-manager';
          } else if (titleLower.includes('salesverse-crm') || contentLower.includes('salesverse-crm')) {
            proj = 'salesverse-crm';
          } else if (titleLower.includes('socialsell') || contentLower.includes('socialsell')) {
            proj = 'socialsell';
          } else if (titleLower.includes('gogaga') || contentLower.includes('gogaga')) {
            proj = 'gogaga-holidays';
          } else if (titleLower.includes('smartnotes') || titleLower.includes('smart notes') || contentLower.includes('smartnotes')) {
            proj = 'smartnotes';
          } else {
            proj = 'general';
          }
        }
        note.project_id = proj;

        const index = notes.findIndex(n => n.id === note.id);
        if (index !== -1) {
          notes[index] = {
            ...notes[index],
            ...note,
            updated_at: new Date().toISOString()
          };
        } else {
          notes.unshift({
            ...note,
            created_at: note.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else if (action === 'DELETE_NOTE') {
        const id = data.id;
        client.storageConfig.notesData.notes = notes.filter(n => n.id !== id);
      } else if (action === 'SAVE_SETTINGS') {
        client.storageConfig.settingsData = {
          ...(client.storageConfig.settingsData || {}),
          ...data,
          updated_at: new Date().toISOString()
        };
      }

      // Save registry back to Google Drive
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
        }).catch(err => {
          console.error('[Write] Registry write failed:', err.message);
        });
      }
    }
    return res.json({ success: true, message: `${action} processed successfully` });
  }

  if (!action) return res.status(400).json({ error: 'Missing action' });
  if (!VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  const actionId = generateActionId();

  try {
    // 1. Read current queue (with version check)
    let queue;
    try {
      queue = await storage.read(clientId, 'queue/pending_writes.json');
    } catch {
      queue = { version: 1, pending: [], lastProcessed: null };
    }

    // 2. Append new action
    const entry = {
      id: actionId,
      type: action,
      status: 'pending',
      timestamp: Date.now(),
      userId: req.authUser?.userId || 'anonymous',
      data: data || {}
    };
    queue.pending.push(entry);
    queue.version = (queue.version || 0) + 1;

    // 3. Write queue back instantly
    await storage.write(clientId, 'queue/pending_writes.json', queue);

    // 4. For some actions, also update the live cache immediately
    //    so the business owner sees it without waiting for batch sync
    if (action === 'PLACE_ORDER') {
      await updateLiveOrdersCache(clientId, storage, data).catch(() => {});
    } else if (action === 'SAVE_NOTE' || action === 'DELETE_NOTE') {
      await updateLiveNotesCache(clientId, storage, action, data).catch(() => {});
    } else if (action === 'SAVE_SETTINGS') {
      await updateLiveSettingsCache(clientId, storage, data).catch(() => {});
    }

    return res.json({
      success: true,
      actionId,
      message: 'Action queued successfully',
      queueDepth: queue.pending.length
    });

  } catch (err) {
    console.error(`[Write] ${clientId}/${action}:`, err.message);
    return res.status(500).json({ error: 'Write failed', detail: err.message });
  }
}

async function updateLiveOrdersCache(clientId, storage, orderData) {
  let liveOrders;
  try {
    liveOrders = await storage.read(clientId, 'cache/orders_live.json');
  } catch {
    liveOrders = { version: 1, orders: [], lastUpdated: null };
  }

  liveOrders.orders.unshift({
    ...orderData,
    id: orderData.id || `ORD-${Date.now()}`,
    status: 'placed',
    placedAt: new Date().toISOString()
  });

  // Keep only last 100 orders in live cache
  if (liveOrders.orders.length > 100) {
    liveOrders.orders = liveOrders.orders.slice(0, 100);
  }

  liveOrders.lastUpdated = new Date().toISOString();
  liveOrders.version = (liveOrders.version || 0) + 1;

  await storage.write(clientId, 'cache/orders_live.json', liveOrders);
}

async function updateLiveNotesCache(clientId, storage, action, data) {
  let liveNotes;
  try {
    liveNotes = await storage.read(clientId, 'cache/notes.json');
  } catch {
    liveNotes = { version: 1, notes: [], lastUpdated: null };
  }

  if (!liveNotes.notes) liveNotes.notes = [];

  if (action === 'SAVE_NOTE') {
    const note = data;
    const index = liveNotes.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      liveNotes.notes[index] = {
        ...liveNotes.notes[index],
        ...note,
        updated_at: new Date().toISOString()
      };
    } else {
      liveNotes.notes.unshift({
        ...note,
        created_at: note.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  } else if (action === 'DELETE_NOTE') {
    const id = data.id;
    liveNotes.notes = liveNotes.notes.filter(n => n.id !== id);
  }

  liveNotes.lastUpdated = new Date().toISOString();
  liveNotes.version = (liveNotes.version || 0) + 1;

  await storage.write(clientId, 'cache/notes.json', liveNotes);
}

async function updateLiveSettingsCache(clientId, storage, settingsData) {
  let liveSettings;
  try {
    liveSettings = await storage.read(clientId, 'cache/settings.json');
  } catch {
    liveSettings = { version: 1 };
  }

  liveSettings = {
    ...liveSettings,
    ...settingsData,
    updated_at: new Date().toISOString()
  };

  await storage.write(clientId, 'cache/settings.json', liveSettings);
}

module.exports = { handleWrite };
