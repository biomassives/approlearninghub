// api/integrations.js
const { Router } = require('express');
const {
  handleFetchIntegrationSettings,
  handleFetchZoomTemplates
} = require('../lib/integrationHandlers');
const { requireAuth } = require('../lib/authMiddleware');

const router = Router();

// Both routes require a valid JWT / req.user
router.use(requireAuth);

// Fetch saved Zoom & Notion settings
router.get('/settings', handleFetchIntegrationSettings);

// Fetch available Zoom meeting templates
router.get('/zoom-templates', handleFetchZoomTemplates);

module.exports = router;
