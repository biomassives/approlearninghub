// api/admin.js
// ApproVideo Admin API Router
// Supports:
//   - welcome             => personalized admin panel setup
//   - users               => view/manage users
//   - update-role         => assign roles
//   - pending             => review submissions
//   - notify              => send internal messages
//   - approve             => confirm/approve items
//   - zoom-schedule       => schedule Zoom learning events (future-ready)
//   - notion-sync         => map and sync Notion content to modules
//   - module-prep         => track and store contributor prep for meetings
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleAdminWelcome,
  handleAllUsers,
  handleUpdateUserRole,
  handlePendingItems,
  handleNotifications,
  handleApproveItem,
  handleZoomSchedule,
  handleNotionSync,
  handleModulePrep
} = require('../lib/adminHandlers');

module.exports = async function adminRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'welcome': return handleAdminWelcome(req, res);
    case 'users': return handleAllUsers(req, res);
    case 'update-role': return handleUpdateUserRole(req, res);
    case 'pending': return handlePendingItems(req, res);
    case 'notify': return handleNotifications(req, res);
    case 'approve': return handleApproveItem(req, res);
    case 'zoom-schedule': return handleZoomSchedule(req, res);
    case 'notion-sync': return handleNotionSync(req, res);
    case 'module-prep': return handleModulePrep(req, res);
    default:
      return res.status(400).json({ success: false, error: 'Invalid admin action' });
  }
};

