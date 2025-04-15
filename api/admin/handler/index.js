// api/admin/index.js

const handleAllUsers = require('./handlers/handleAllUsers');
const handleUpdateUserRole = require('./handlers/handleUpdateUserRole');
const handlePendingItems = require('./handlers/handlePendingItems');
const handleNotifications = require('./handlers/handleNotifications');
const handleApproveItem = require('./handlers/handleApproveItem');

module.exports = async function adminRouter(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const type = searchParams.get('type');

  switch (type) {
    case 'users':
      return handleAllUsers(req, res);
    case 'update-role':
      return handleUpdateUserRole(req, res);
    case 'pending':
      return handlePendingItems(req, res);
    case 'notify':
      return handleNotifications(req, res);
    case 'approve':
      return handleApproveItem(req, res);
    default:
      return res.status(400).json({ success: false, error: 'Invalid admin type' });
  }
};
