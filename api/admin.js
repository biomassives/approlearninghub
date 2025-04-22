// api/admin.js
const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const { requireAuth } = require('../lib/authMiddleware');
const {
  handleAdminWelcome,
  handleAllUsers,
  handleUpdateUserRole,
  handlePendingItems,
  handleNotifications,
  handleApproveItem,
  handleZoomSchedule,
  handleNotionSync,
  handleModulePrep,
  handleGetIntegrationSettings,
  handleSaveIntegrationSettings,
  handleGetZoomHostLink,
  handleZoomConnectUrl,
  handleNotionConnectUrl
} = require('../lib/adminHandlers');

// Protect all admin routes
router.use(requireAuth);

// Welcome panel
router.get('/welcome', handleAdminWelcome);

// User management
router.get('/users', handleAllUsers);
router.post('/user-role', handleUpdateUserRole);

// Pending submissions
router.get('/pending-items', handlePendingItems);

// Notifications & Approval
router.get('/notifications', handleNotifications);
router.post('/approve-item', handleApproveItem);

// Zoom scheduling
router.post('/zoom/schedule', handleZoomSchedule);

// Notion sync and mapping
router.post('/notion/sync', handleNotionSync);

// Module preparation tasks
router.post('/module-prep', handleModulePrep);

// Integration settings
router.get('/integrations', handleGetIntegrationSettings);
router.put('/integrations', handleSaveIntegrationSettings);

// Zoom & Notion connect URLs
router.get('/zoom/host-link', handleGetZoomHostLink);
router.get('/zoom/connect-url', handleZoomConnectUrl);
router.get('/notion/connect-url', handleNotionConnectUrl);

module.exports = router;