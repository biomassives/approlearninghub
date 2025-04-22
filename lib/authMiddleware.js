const supabase = require('./supabaseClient');

/**
 * Express middleware to require a valid Supabase JWT.
 * Expects the token in the Authorization header (Bearer <token>),
 * or as `token` in query string or request body.
 * On success, attaches `req.user = { id, email, ... }`.
 */
async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header or fallback to query/body
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    // Verify the JWT with Supabase
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    if (tokenError || !tokenData?.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    // Attach user info to the request object
    req.user = tokenData.user;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Internal error during authentication' });
  }
}

module.exports = { requireAuth };
