// /api/middleware/auth.js
const { getSupabase } = require('../lib/supabaseClient')
const supabase = getSupabase()

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies['sb-access-token']

  if (!token) {
    return res.status(401).json({ success: false, message: 'Auth required' })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    console.error('[Auth] getUser:', error)
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }

  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('id, email, role, is_admin')
    .eq('id', user.id)
    .single()

  if (profErr) {
    console.error('[Auth] fetch profile:', profErr)
    return res.status(401).json({ success: false, message: 'Profile lookup failed' })
  }

  req.user = {
    id:      profile.id,
    email:   profile.email,
    role:    profile.role || 'learner',
    isAdmin: profile.is_admin
  }
  next()
}

function authorize(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (req.user.isAdmin || roles.includes(req.user.role)) {
      return next()
    }
    return res.status(403).json({ success: false, message: 'Forbidden' })
  }
}

module.exports = { authenticate, authorize }
