// File: /api/auth/index.js

const { createClient } = require('@supabase/supabase-js');

// Import handler functions
const handleLogin = require('./handlers/handleLogin');
const handleSignup = require('./handlers/handleSignup');
const handleVerify = require('./handlers/handleVerify');
const handleLogout = require('./handlers/handleLogout');
const handleUserData = require('./handlers/handleUserData');
const handleUserRole = require('./handlers/handleUserRole');
const handleAccessCheck = require('./handlers/handleAccessCheck');
const handleUpdateLattice = require('./handlers/handleUpdateLattice');
const handleDashboardsAccess = require('./handlers/handleDashboardsAccess');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Define role levels and redirects
const ROLES = ['guest', 'viewer', 'user', 'expert', 'editor', 'admin', 'developer'];
const ROLE_LEVELS = {
  guest: 0,
  viewer: 1,
  user: 2,
  expert: 3,
  editor: 4,
  admin: 5,
  developer: 6
};
const ROLE_DASHBOARDS = {
  guest: '/login.html',
  viewer: '/dashboard.html',
  user: '/dashboard.html',
  expert: '/expert-dashboard.html',
  editor: '/editor-dashboard.html',
  admin: '/admin-dashboard.html',
  developer: '/dev-dashboard.html'
};

// Auth route dispatcher
module.exports = async function authRouter(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.pathname.split('/auth/')[1]?.split('/')[0];

  try {
    switch (type) {
      case 'login':
        return handleLogin(req, res, supabase, ROLES, ROLE_LEVELS, ROLE_DASHBOARDS);

      case 'signup':
        return handleSignup(req, res, supabase, ROLES);

      case 'verify':
        return handleVerify(req, res, supabase, ROLES, ROLE_LEVELS);

      case 'update-lattice':
        return handleUpdateLattice(req, res, supabase, ROLES, ROLE_LEVELS);

      case 'logout':
        return handleLogout(req, res, supabase);

      case 'user-data':
        return handleUserData(req, res, supabase, ROLES, ROLE_LEVELS, ROLE_DASHBOARDS);

      case 'user-role':
        return handleUserRole(req, res, supabase, ROLES, ROLE_LEVELS, ROLE_DASHBOARDS);

      case 'access-check':
        return handleAccessCheck(req, res, supabase, ROLES, ROLE_LEVELS, ROLE_DASHBOARDS);

      case 'dashboards-access':
        return handleDashboardsAccess(req, res, supabase, ROLES, ROLE_LEVELS, ROLE_DASHBOARDS);

      default:
        return res.status(404).json({ success: false, error: `Unknown auth route: ${type}` });
    }
  } catch (err) {
    console.error(`🚨 Error in /auth/${type}:`, err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
