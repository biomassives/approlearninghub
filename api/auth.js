// File: api/auth.js
const {
  handleSignup,
  handleLogin,
  handleLogout,
  handleAccessCheck,
  handleUpdateLattice,
  handleUserData,
  handleUserRole,
  handleVerify
} = require('../lib/authHandlers');

module.exports = async function authRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'signup': return handleSignup(req, res);
    case 'login': return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'access-check': return handleAccessCheck(req, res);
    case 'update-lattice': return handleUpdateLattice(req, res);
    case 'get-user': return handleUserData(req, res);
    case 'set-role': return handleUserRole(req, res);
    case 'verify': return handleVerify(req, res);
    default: return res.status(404).json({ error: 'Invalid auth action' });
  }
};
