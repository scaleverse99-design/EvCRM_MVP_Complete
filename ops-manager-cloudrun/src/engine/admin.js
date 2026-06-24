/**
 * OPS MANAGER V6.0 — Admin Engine
 * Business owner dashboard API. Requires owner/manager token.
 */

async function handleAdmin(req, res, storage) {
  const { action } = req.body;
  const clientId = req.clientId;

  const handlers = {
    GET_ORDERS: async () => {
      const data = await storage.read(clientId, 'data/orders.json');
      return data;
    },
    GET_LEADS: async () => {
      const data = await storage.read(clientId, 'data/leads.json');
      return data;
    },
    GET_PRODUCTS: async () => {
      const data = await storage.read(clientId, 'cache/products.json');
      return data;
    },
    GET_LIVE_ORDERS: async () => {
      const data = await storage.read(clientId, 'cache/orders_live.json');
      return data;
    },
    GET_QUEUE_STATUS: async () => {
      const queue = await storage.read(clientId, 'queue/pending_writes.json');
      return {
        pendingCount: queue.pending?.length || 0,
        lastProcessed: queue.lastProcessed,
        pending: queue.pending?.slice(0, 10) // Return first 10 for preview
      };
    },
    UPDATE_BUSINESS_INFO: async () => {
      const current = await storage.read(clientId, 'cache/business_info.json');
      const updated = { ...current, ...req.body.data, version: (current.version || 0) + 1, lastUpdated: new Date().toISOString() };
      await storage.write(clientId, 'cache/business_info.json', updated);
      return updated;
    },
    ADD_PRODUCT: async () => {
      const catalogue = await storage.read(clientId, 'cache/products.json');
      const product = {
        id: `PROD-${Date.now()}`,
        ...req.body.data,
        createdAt: new Date().toISOString()
      };
      catalogue.products = catalogue.products || [];
      catalogue.products.push(product);
      catalogue.version = (catalogue.version || 0) + 1;
      catalogue.lastUpdated = new Date().toISOString();
      await storage.write(clientId, 'cache/products.json', catalogue);
      return { product, totalProducts: catalogue.products.length };
    },
    UPDATE_ORDER_STATUS: async () => {
      const { orderId, status } = req.body.data;
      const orders = await storage.read(clientId, 'data/orders.json');
      const order = orders.orders?.find(o => o.id === orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      order.status = status;
      order.updatedAt = new Date().toISOString();
      orders.version = (orders.version || 0) + 1;
      await storage.write(clientId, 'data/orders.json', orders);
      return order;
    },
    GET_ANALYTICS: async () => {
      try {
        return await storage.read(clientId, 'data/analytics.json');
      } catch {
        return { message: 'Analytics not yet generated. Will be available after first sync.' };
      }
    }
  };

  if (!action || !handlers[action]) {
    return res.status(400).json({ error: `Unknown admin action: ${action}` });
  }

  try {
    const result = await handlers[action]();
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[Admin] ${clientId}/${action}:`, err.message);
    return res.status(500).json({ error: 'Admin action failed', detail: err.message });
  }
}

module.exports = { handleAdmin };
