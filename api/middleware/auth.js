// /api/middleware/auth.js
const { getSupabase } = require('../lib/supabaseClient');
const supabase = getSupabase();

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData.user) {
    console.error('[Auth] getUser error:', authErr);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('id, email, role, is_admin')
    .eq('id', authData.user.id)
    .single();

  if (userErr) {
    console.error('[Auth] fetch profile error:', userErr);
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  req.user = {
    id:      userData.id,
    email:   userData.email,
    role:    userData.role || 'learner',
    isAdmin: userData.is_admin
  };
  next();
}

function authorize(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (req.user.isAdmin || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  };
}

module.exports = { authenticate, authorize };
