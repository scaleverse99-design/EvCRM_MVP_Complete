/**
 * OPS MANAGER V6.0 — Read Engine
 * Handles fast cache reads from Drive/S3 JSON files.
 * Typical response time: 20-50ms (served from shadow cache or CDN).
 */

async function handleRead(req, res, storage, registry) {
  const { file } = req.query;
  const clientId = req.clientId;

  const clientConfig = registry.getByClientId(clientId);
  const isSmartNotes = clientConfig?.templateId === 'smartnotes' || clientId === 'notes' || clientId === 'smartnotes';

  if (isSmartNotes && file === 'notes') {
    const notes = clientConfig?.storageConfig?.notesData?.notes || [];
    return res.json({ success: true, data: { notes } });
  }

  if (isSmartNotes && file === 'settings') {
    const settings = clientConfig?.storageConfig?.settingsData || { geminiApiKey: "AIzaSyAqJ7wd0crPXZwRE3cJUtXk3StMFm_6lms" };
    return res.json({ success: true, data: settings });
  }

  if (!file) {
    return res.status(400).json({ error: 'Missing ?file= parameter' });
  }

  // Only allow reads from the cache/ folder for public API
  const ALLOWED_PUBLIC_FILES = [
    'products', 'homepage', 'business_info', 'orders_live', 'menu', 'inventory', 'notes', 'settings'
  ];

  // Allow owner to read from data/ folder too (checked by authMiddleware before this)
  const isAdminRead = req.authUser?.role === 'owner' || req.authUser?.role === 'manager';
  const folder = isAdminRead && req.query.folder === 'data' ? 'data' : 'cache';

  if (!isAdminRead && !ALLOWED_PUBLIC_FILES.includes(file)) {
    return res.status(403).json({ error: 'File not accessible via public API' });
  }

  try {
    const data = await storage.read(clientId, `${folder}/${file}.json`);
    res.set('Cache-Control', 'public, max-age=30'); // Browser cache 30s
    return res.json({ success: true, data });
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: `File '${file}' not found` });
    }
    console.error(`[Read] ${clientId}/${file}:`, err.message);
    return res.status(500).json({ error: 'Read failed', detail: err.message });
  }
}

module.exports = { handleRead };
