// api/dashboards.js
// ApproVideo Dashboards API Router
// Supports the following endpoints via `?action=` query string:
//   - gantt
//   - timeline
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleGanttData,
  handleTimelineEvents
} = require('../lib/dashboardHandlers');

module.exports = async function dashboardsRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'gantt': return handleGanttData(req, res);
    case 'timeline': return handleTimelineEvents(req, res);
    default: return res.status(404).json({ error: 'Invalid dashboards action' });
  }
};

