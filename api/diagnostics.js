// api/diagnostics.js
// ApproVideo Diagnostics API Router
// Supports the following diagnostics endpoints via `?action=` query string:
//   - env
//   - health
//   - lattice
//   - test
//   - vercel
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleEnvCheck,
  handleHealthCheck,
  handleLatticeTest,
  handleTestEndpoint,
  handleVercelStructure
} = require('../lib/diagnosticsHandlers');

module.exports = async function diagnosticsRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'env': return handleEnvCheck(req, res);
    case 'health': return handleHealthCheck(req, res);
    case 'lattice': return handleLatticeTest(req, res);
    case 'test': return handleTestEndpoint(req, res);
    case 'vercel': return handleVercelStructure(req, res);
    default: return res.status(404).json({ error: 'Invalid diagnostics action' });
  }
};

