/**
 * OPS MANAGER V6.0 — Health Engine
 * Returns health status for a client deployment.
 * Used by the Master Admin Panel to monitor all deployed sites.
 */

const startTime = Date.now();

async function handleHealth(req, res, storage, registry) {
  const clientId = req.clientId || req.query.clientId;

  try {
    const [queue, settings] = await Promise.allSettled([
      storage.read(clientId, 'queue/pending_writes.json'),
      storage.read(clientId, 'config/settings.json')
    ]);

    const queueData = queue.status === 'fulfilled' ? queue.value : null;
    const settingsData = settings.status === 'fulfilled' ? settings.value : null;

    const health = {
      status: 'live',
      clientId,
      businessName: settingsData?.businessName || clientId,
      domain: settingsData?.domain || 'unknown',
      templateId: settingsData?.templateId || 'unknown',
      queueDepth: queueData?.pending?.length || 0,
      lastSync: queueData?.lastProcessed || null,
      storageAdapter: process.env.STORAGE_ADAPTER || 'google-drive',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      errors: []
    };

    if (queue.status === 'rejected') {
      health.errors.push('Cannot read queue file');
      health.status = 'degraded';
    }
    if (settings.status === 'rejected') {
      health.errors.push('Cannot read settings file');
      health.status = 'degraded';
    }

    return res.json(health);
  } catch (err) {
    return res.json({
      status: 'error',
      clientId,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Master health check — returns a summary of ALL clients.
 * Only accessible with the master admin token.
 */
async function handleMasterHealth(req, res, storage, registry) {
  const clients = registry.listAll();
  const results = await Promise.allSettled(
    Object.entries(clients).map(async ([clientId, config]) => {
      try {
        const queue = await storage.read(clientId, 'queue/pending_writes.json');
        return {
          clientId,
          businessName: config.businessName,
          domain: config.domain,
          status: 'live',
          queueDepth: queue.pending?.length || 0,
          lastSync: queue.lastProcessed || null,
          storageUsedMB: config.storageUsedMB || 0,
          provisionedAt: config.provisionedAt
        };
      } catch {
        return {
          clientId,
          businessName: config.businessName,
          domain: config.domain,
          status: 'error',
          queueDepth: -1,
          lastSync: null
        };
      }
    })
  );

  const summary = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' });
  return res.json({
    totalClients: summary.length,
    live: summary.filter(c => c.status === 'live').length,
    degraded: summary.filter(c => c.status === 'degraded').length,
    error: summary.filter(c => c.status === 'error').length,
    clients: summary,
    serverUptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString()
  });
}

module.exports = { handleHealth, handleMasterHealth };
