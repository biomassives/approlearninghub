const Router = require('express').Router;
const { requireAuth } = require('../lib/authMiddleware');
const {
  handleEnvCheck,
  handleHealthCheck,
  handleLatticeTest,
  handleTestEndpoint,
  handleVercelStructure,
  handleBugReport,
  handleFeatureRequest,
  handleGetReleaseNotes,
  handleAudioPreflight
} = require('../lib/diagnosticsHandlers');

const router = Router();

// --- Allow CORS preflight for all diagnostics routes ---
router.options('*', (req, res) => {
  res.set(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type'
  );
  return res.sendStatus(200);
});

// --- Core diagnostics ---
// Check environment variables
router.get('/env', handleEnvCheck);
// Basic health status
router.get('/health', handleHealthCheck);
// Echo test endpoint
router.route('/test')
  .get(handleTestEndpoint)
  .post(handleTestEndpoint);
// Vercel configuration structure
router.get('/vercel', handleVercelStructure);

// --- Lattice security test (protected) ---
router.post('/lattice', requireAuth, handleLatticeTest);

// --- Software support endpoints ---
// Submit a bug report (protected)
router.post('/bug-report', requireAuth, handleBugReport);
// Submit a feature request (protected)
router.post('/feature-request', requireAuth, handleFeatureRequest);
// Fetch release notes (public)
router.get('/release-notes', handleGetReleaseNotes);

// --- Meeting preflight diagnostics ---
// Check microphone and speaker capabilities before Zoom
router.get('/audio-preflight', handleAudioPreflight);

// --- Error handler ---
router.use((err, req, res, next) => {
  console.error('Diagnostics API error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

module.exports = router;
