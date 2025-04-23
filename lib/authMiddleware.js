// lib/authMiddleware.js
const supabase = require('./supabaseClient');

/**
 * Express middleware to require a valid Supabase JWT.
 * Expects the token in the Authorization header (Bearer <token>),
 * or as `token` in query string or request body.
 * On success, attaches `req.user = { id, email, ... }`.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    if (tokenError || !tokenData?.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    req.user = tokenData.user;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Internal error during authentication' });
  }
}

/**
 * Express middleware to authorize specific user roles or permissions.
 * Call after requireAuth, checks req.user and optionally req.user.role.
 */
function authorize(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (requiredRole && req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, authorize };
