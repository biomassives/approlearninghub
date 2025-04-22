// api/expert.js
// ApproVideo Expert API Router
// Supports:
//   - home               => aggregated expert dashboard payload
//   - modules            => fetch assigned modules with statuses
//   - reviews            => list pending review items
//   - approve            => approve one or more items
//   - annotate           => add annotations to review items
//   - notifications      => fetch/send expert notifications
//   - sessions           => get upcoming sessions (Gantt/Timeline)
//   - integrations       => fetch Zoom & Notion integration data
//   - zoom-templates     => list available Zoom meeting templates
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
    handleExpertHome,
    handleExpertModules,
    handlePendingReviews,
    handleApproveBatch,
    handleAnnotateReview,
    handleExpertNotifications,
    handleSessionsByExpert,
    handleExpertIntegrations,
    handleZoomTemplates
  } = require('../lib/expertHandlers');
  
  module.exports = async function expertRouter(req, res) {
    const action = req.query.action || req.body?.action;
  
    switch (action) {
      case 'home':
        return handleExpertHome(req, res);
  
      case 'modules':
        return handleExpertModules(req, res);
  
      case 'reviews':
        return handlePendingReviews(req, res);
  
      case 'approve':
        // expects { itemIds: [...] }
        return handleApproveBatch(req, res);
  
      case 'annotate':
        // expects { itemId, text }
        return handleAnnotateReview(req, res);
  
      case 'notifications':
        return handleExpertNotifications(req, res);
  
      case 'sessions':
        return handleSessionsByExpert(req, res);
  
      case 'integrations':
        return handleExpertIntegrations(req, res);
  
      case 'zoom-templates':
        return handleZoomTemplates(req, res);
  
      default:
        return res.status(400).json({ success: false, error: 'Invalid expert action' });
    }
  };
  