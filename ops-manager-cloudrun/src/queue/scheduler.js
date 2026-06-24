/**
 * OPS MANAGER V6.0 — Built-in Scheduler
 * Replaces Apps Script time-based triggers with a Node.js cron.
 * Runs inside the server process — no external dependencies.
 */

const { processQueue } = require('./processor');

class Scheduler {
  constructor(storage, registry) {
    this.storage = storage;
    this.registry = registry;
    this._intervals = [];
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;

    // Process all client queues every 6 hours
    const queueInterval = setInterval(() => this._runQueueSync(), 6 * 60 * 60 * 1000);
    this._intervals.push(queueInterval);

    // Refresh health data every 5 minutes
    const healthInterval = setInterval(() => this._updateHealthData(), 5 * 60 * 1000);
    this._intervals.push(healthInterval);

    // Daily digest at midnight (check every minute if it's midnight)
    const dailyInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this._runDailyJobs();
      }
    }, 60 * 1000);
    this._intervals.push(dailyInterval);

    console.log('🕐 Scheduler started: queue sync every 6h, health every 5m, daily at midnight');
  }

  stop() {
    this._intervals.forEach(clearInterval);
    this._intervals = [];
    this._running = false;
    console.log('🛑 Scheduler stopped');
  }

  async _runQueueSync() {
    const clients = this.registry.listAll();
    console.log(`[Scheduler] Running queue sync for ${Object.keys(clients).length} clients`);
    for (const clientId of Object.keys(clients)) {
      try {
        await processQueue(clientId, this.storage);
      } catch (err) {
        console.error(`[Scheduler] Queue sync failed for ${clientId}:`, err.message);
      }
    }
  }

  async _updateHealthData() {
    const clients = this.registry.listAll();
    for (const [clientId, config] of Object.entries(clients)) {
      try {
        const storageUsed = await this.storage.getStorageUsed(clientId);
        this.registry.updateStatus(clientId, {
          storageUsedMB: Math.round(storageUsed / 1024 / 1024 * 100) / 100,
          lastHealthCheck: new Date().toISOString()
        });
      } catch {
        // Non-fatal — just skip this client
      }
    }
  }

  async _runDailyJobs() {
    console.log('[Scheduler] Running daily jobs');
    const clients = this.registry.listAll();
    for (const clientId of Object.keys(clients)) {
      try {
        await this._generateAnalytics(clientId);
      } catch (err) {
        console.error(`[Scheduler] Daily jobs failed for ${clientId}:`, err.message);
      }
    }
  }

  async _generateAnalytics(clientId) {
    try {
      const orders = await this.storage.read(clientId, 'data/orders.json');
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = (orders.orders || []).filter(o =>
        o.placedAt?.startsWith(today)
      );
      const analytics = {
        date: today,
        ordersToday: todayOrders.length,
        revenueToday: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalOrders: orders.orders?.length || 0,
        generatedAt: new Date().toISOString()
      };
      await this.storage.write(clientId, 'data/analytics.json', analytics);
    } catch {
      // Silently skip if no orders yet
    }
  }

  /**
   * Manually trigger a queue sync for a specific client.
   * Called via POST /api/sync from the admin panel.
   */
  async triggerSync(clientId) {
    return processQueue(clientId, this.storage);
  }
}

module.exports = { Scheduler };
