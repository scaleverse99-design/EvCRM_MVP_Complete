/**
 * OPS MANAGER V6.0 — Auth Middleware
 * Validates security tokens for all protected routes.
 */

/**
 * Reads auth_tokens.json from the client's Drive/storage and validates the token.
 * Public routes (serving static HTML/CSS/JS) skip this entirely.
 */
async function validateToken(token, clientId, storage, requiredRole = 'customer') {
  if (!token) return { valid: false, reason: 'NO_TOKEN' };

  let tokenConfig;
  try {
    tokenConfig = await storage.read(clientId, 'config/auth_tokens.json');
  } catch {
    return { valid: false, reason: 'CONFIG_READ_ERROR' };
  }

  const record = tokenConfig.tokens?.find(t => t.token === token);
  if (!record) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (new Date(record.expires) < new Date()) return { valid: false, reason: 'TOKEN_EXPIRED' };

  const ROLE_HIERARCHY = { public: 0, customer: 1, staff: 2, manager: 3, owner: 4 };
  const hasPermission = (ROLE_HIERARCHY[record.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  if (!hasPermission) return { valid: false, reason: 'INSUFFICIENT_ROLE' };

  // Update last used timestamp (fire and forget)
  record.lastUsed = new Date().toISOString();
  storage.write(clientId, 'config/auth_tokens.json', tokenConfig).catch(() => {});

  return { valid: true, userId: record.userId, role: record.role };
}

/**
 * Express middleware factory — wraps validateToken for route handlers.
 */
function authMiddleware(storage, requiredRole = 'customer') {
  return async (req, res, next) => {
    // Extract token from Authorization header or query param
    const token = req.headers['x-ops-token'] || req.query.token || req.body?.token;
    const clientId = req.clientId; // set by router.js

    if (!clientId) return res.status(400).json({ error: 'No client context' });

    const result = await validateToken(token, clientId, storage, requiredRole);
    if (!result.valid) {
      return res.status(401).json({ error: 'Unauthorized', reason: result.reason });
    }

    req.authUser = { userId: result.userId, role: result.role };
    next();
  };
}

module.exports = { validateToken, authMiddleware };
