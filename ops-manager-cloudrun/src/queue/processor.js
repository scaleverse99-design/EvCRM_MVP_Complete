/**
 * OPS MANAGER V6.0 — Queue Processor
 * 
 * Processes the pending_writes.json queue in batches.
 * Called by the scheduler every 6 hours (or manually via /api/sync).
 * 
 * This replaces the Apps Script Night Watchman.
 * Runs entirely inside the Node.js server process.
 */

async function processQueue(clientId, storage) {
  const startTime = Date.now();
  const log = [];

  console.log(`[Queue] Processing client: ${clientId}`);

  // 1. Read the queue
  let queue;
  try {
    queue = await storage.read(clientId, 'queue/pending_writes.json');
  } catch (err) {
    console.error(`[Queue] Cannot read queue for ${clientId}:`, err.message);
    return { success: false, error: err.message };
  }

  if (!queue.pending || queue.pending.length === 0) {
    console.log(`[Queue] ${clientId}: Nothing to process`);
    return { success: true, processed: 0, message: 'Queue empty' };
  }

  // 2. Set processing lock
  queue.processing = true;
  await storage.write(clientId, 'queue/pending_writes.json', queue);

  // 3. Load data files once
  const dataFiles = {};
  const loadData = async (file) => {
    if (!dataFiles[file]) {
      try {
        dataFiles[file] = await storage.read(clientId, `data/${file}.json`);
      } catch {
        dataFiles[file] = { version: 1, [file]: [] };
      }
    }
    return dataFiles[file];
  };

  // 4. Process each pending item
  const processed = [];
  const failed = [];

  for (const item of queue.pending) {
    if (item.status === 'synced') continue;

    try {
      await processAction(item, clientId, storage, loadData, log);
      item.status = 'synced';
      item.processedAt = new Date().toISOString();
      processed.push(item.id);
    } catch (err) {
      item.status = 'failed';
      item.error = err.message;
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount >= 3) item.status = 'dead'; // Give up after 3 tries
      failed.push({ id: item.id, error: err.message });
      console.error(`[Queue] Failed to process ${item.type} (${item.id}):`, err.message);
    }
  }

  // 5. Write updated data files back to storage
  for (const [file, data] of Object.entries(dataFiles)) {
    data.version = (data.version || 0) + 1;
    data.lastUpdated = new Date().toISOString();
    await storage.write(clientId, `data/${file}.json`, data);
  }

  // 6. Rebuild read caches from data files
  await rebuildCaches(clientId, storage, dataFiles);

  // 7. Clear processed items from queue
  queue.pending = queue.pending.filter(i => i.status !== 'synced');
  queue.processing = false;
  queue.lastProcessed = new Date().toISOString();
  queue.version = (queue.version || 0) + 1;
  await storage.write(clientId, 'queue/pending_writes.json', queue);

  const duration = Date.now() - startTime;
  console.log(`[Queue] ${clientId}: Processed ${processed.length}, Failed ${failed.length} in ${duration}ms`);

  return {
    success: true,
    processed: processed.length,
    failed: failed.length,
    durationMs: duration,
    remainingQueue: queue.pending.length
  };
}

async function processAction(item, clientId, storage, loadData, log) {
  switch (item.type) {
    case 'PLACE_ORDER': {
      const orders = await loadData('orders');
      orders.orders = orders.orders || [];
      orders.orders.push({
        ...item.data,
        id: item.data.id || `ORD-${item.timestamp}`,
        status: item.data.status || 'placed',
        processedAt: new Date().toISOString()
      });
      log.push(`Order processed: ${item.data.id}`);
      break;
    }
    case 'UPDATE_ORDER_STATUS': {
      const orders = await loadData('orders');
      const order = orders.orders?.find(o => o.id === item.data.orderId);
      if (order) {
        order.status = item.data.status;
        order.updatedAt = new Date().toISOString();
      }
      break;
    }
    case 'ADD_LEAD':
    case 'SUBMIT_ENQUIRY': {
      const leads = await loadData('leads');
      leads.leads = leads.leads || [];
      leads.leads.push({
        ...item.data,
        id: item.data.id || `LEAD-${item.timestamp}`,
        status: 'new',
        createdAt: new Date().toISOString()
      });
      break;
    }
    case 'UPDATE_INVENTORY': {
      const products = await loadData('products_data');
      const product = products.products?.find(p => p.id === item.data.productId);
      if (product) {
        product.stockCount = (product.stockCount || 0) + (item.data.quantityChange || 0);
        product.inStock = product.stockCount > 0;
      }
      break;
    }
    case 'SAVE_NOTE': {
      const notesData = await loadData('notes');
      notesData.notes = notesData.notes || [];
      const note = item.data;
      const index = notesData.notes.findIndex(n => n.id === note.id);
      if (index !== -1) {
        notesData.notes[index] = {
          ...notesData.notes[index],
          ...note,
          updated_at: new Date().toISOString()
        };
      } else {
        notesData.notes.unshift({
          ...note,
          created_at: note.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      log.push(`Note saved: ${note.id}`);
      break;
    }
    case 'DELETE_NOTE': {
      const notesData = await loadData('notes');
      notesData.notes = notesData.notes || [];
      const id = item.data.id;
      notesData.notes = notesData.notes.filter(n => n.id !== id);
      log.push(`Note deleted: ${id}`);
      break;
    }
    case 'SAVE_SETTINGS': {
      const settings = await loadData('settings');
      Object.assign(settings, item.data, {
        updated_at: new Date().toISOString()
      });
      log.push(`Settings saved`);
      break;
    }
    default:
      log.push(`Unknown action type: ${item.type} — skipping`);
  }
}

async function rebuildCaches(clientId, storage, dataFiles) {
  // Rebuild orders_live.json from last 100 orders
  if (dataFiles.orders) {
    const liveOrders = {
      version: 1,
      orders: (dataFiles.orders.orders || []).slice(-100),
      lastUpdated: new Date().toISOString()
    };
    await storage.write(clientId, 'cache/orders_live.json', liveOrders);
  }

  // Rebuild notes.json
  if (dataFiles.notes) {
    const liveNotes = {
      version: 1,
      notes: dataFiles.notes.notes || [],
      lastUpdated: new Date().toISOString()
    };
    await storage.write(clientId, 'cache/notes.json', liveNotes);
  }

  // Rebuild settings.json
  if (dataFiles.settings) {
    await storage.write(clientId, 'cache/settings.json', dataFiles.settings);
  }
}

module.exports = { processQueue };
