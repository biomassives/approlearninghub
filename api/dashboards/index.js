/**
 * /api/dashboards
 * Provides dashboard data and Gantt-ready timeline events.
 * Used after login to display clinics, modules, and co-authoring workflows.
 */

const ganttData = require('./handlers/ganttData');
const timelineEvents = require('./handlers/timelineEvents');

module.exports = async (req, res) => {
  const view = req.query.view;

  switch (view) {
    case 'gantt': return ganttData(req, res);
    case 'timeline': return timelineEvents(req, res);
    default:
      return res.status(400).json({ error: 'Invalid dashboard view' });
  }
};
