// api/dashboard.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../lib/authMiddleware');
const { query, validationResult } = require('express-validator');
const {
  handleDashboardOverview,
  handleGanttData,
  handleTimelineEvents
} = require('../lib/dashboardHandlers');

// Protect all dashboard routes
router.use(requireAuth);

// Validators for optional query parameters
const dashboardValidators = [
  query('projectId').optional().isUUID().withMessage('projectId must be a valid UUID'),
  query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 date')
];

// GET /dashboards/overview
router.get('/overview', handleDashboardOverview);

// GET /dashboards/gantt with validation
router.get(
  '/gantt',
  ...dashboardValidators,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    return handleGanttData(req, res, next);
  }
);

// GET /dashboards/timeline with validation
router.get(
  '/timeline',
  ...dashboardValidators,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    return handleTimelineEvents(req, res, next);
  }
);

// Catch‑all for unsupported routes (404)
router.use((req, res) => {
  res.status(404).json({ success: false, error: 'Dashboard endpoint not found' });
});

module.exports = router;
