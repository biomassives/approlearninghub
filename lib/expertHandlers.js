// lib/expertHandlers.js
// Expert-specific handler implementations for ApproVideo

const { handleUserData } = require('./authHandlers');
const {
  handleAllUsers,
  handleAdminWelcome,
  handleNotifications: handleAdminNotifications
} = require('./adminHandlers');
const {
  handlePendingItems,
  handleApproveItem
} = require('./adminHandlers');
const {
  handleGanttData,
  handleTimelineEvents
} = require('./dashboardHandlers');
const {
  fetchZoomTemplates,
  fetchIntegrationSettings
} = require('./integrationHandlers');

// Load static categories metadata
const categories = require('../categories.json');
// Profile storage for user topics (stubbed)
const { getUserTopics, updateUserTopics } = require('./profileHandlers');

/**
 * GET /api/expert?action=home
 * Returns aggregated payload: user profile, welcome text, peers list,
 * pending review counts, upcoming sessions, integration status.
 */
async function handleExpertHome(req, res) {
  try {
    const user = await handleUserData(req, res);
    const welcome = await handleAdminWelcome(req, res);
    const peers = await handleAllUsers(req, res);
    const pendingItems = await handlePendingItems(req, res);
    const sessions = await handleTimelineEvents(req, res);
    const integrations = await handleExpertIntegrations(req, res);

    res.json({
      success: true,
      data: {
        user,
        welcome,
        peers,
        pendingCount: Array.isArray(pendingItems) ? pendingItems.length : 0,
        sessions,
        integrations
      }
    });
  } catch (err) {
    console.error('Expert Home error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/expert?action=modules
 * Returns list of assigned modules with metadata, next session, review counts.
 */
async function handleExpertModules(req, res) {
  // TODO: implement using moduleHandlers.listModules
  res.status(501).json({ success: false, error: 'Not implemented' });
}

/**
 * GET /api/expert?action=reviews
 * Returns detailed items awaiting expert review.
 */
async function handlePendingReviews(req, res) {
  return handlePendingItems(req, res);
}

/**
 * POST /api/expert?action=approve
 * Body: { itemIds: [string] }
 */
async function handleApproveBatch(req, res) {
  try {
    const { itemIds } = req.body;
    const results = [];
    for (const id of itemIds) {
      results.push(await handleApproveItem({ ...req, body: { id } }, res));
    }
    res.json({ success: true, results });
  } catch (err) {
    console.error('Approve Batch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/expert?action=annotate
 * Body: { itemId: string, text: string }
 */
async function handleAnnotateReview(req, res) {
  try {
    const { itemId, text } = req.body;
    await require('./reviewHandlers').handleAnnotate({ ...req, body: { itemId, text } }, res);
    res.json({ success: true });
  } catch (err) {
    console.error('Annotate Review error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET/POST /api/expert?action=notifications
 * Fetch or send notifications specifically for this expert.
 */
async function handleExpertNotifications(req, res) {
  if (req.method === 'GET') return handleAdminNotifications(req, res);
  // POST: create notification for user
  try {
    const { recipientId, message } = req.body;
    // reuse admin notification logic
    await handleAdminNotifications({ ...req, body: { recipientId, message } }, res);
  } catch (err) {
    console.error('Send Notification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/expert?action=sessions
 * Returns upcoming sessions (Gantt/Timeline) for this expert.
 */
async function handleSessionsByExpert(req, res) {
  return handleTimelineEvents(req, res);
}

/**
 * GET /api/expert?action=integrations
 * Returns Zoom & Notion integration status and mappings.
 */
async function handleExpertIntegrations(req, res) {
  try {
    const settings = await fetchIntegrationSettings(req, res);
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Integrations error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/expert?action=zoom-templates
 * Returns list of available Zoom meeting templates.
 */
async function handleZoomTemplates(req, res) {
  try {
    const templates = await fetchZoomTemplates(req, res);
    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error('Zoom Templates error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/expert?action=categories
 * Returns all topic areas, subcategories, and tags.
 */
async function handleFetchCategories(req, res) {
  try {
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Fetch Categories error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/expert?action=user-topics
 * Returns selected categories/subcategories/tags for a user/expert/clinic.
 */
async function handleGetUserTopics(req, res) {
  try {
    const userId = req.query.userId || req.body.userId;
    const selections = await getUserTopics(userId);
    res.json({ success: true, data: selections });
  } catch (err) {
    console.error('Get User Topics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/expert?action=update-topics
 * Body: { userId: string, selections: { area, subcategory, tags[] }[] }
 */
async function handleUpdateUserTopics(req, res) {
  try {
    const { userId, selections } = req.body;
    await updateUserTopics(userId, selections);
    res.json({ success: true });
  } catch (err) {
    console.error('Update User Topics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  handleExpertHome,
  handleExpertModules,
  handlePendingReviews,
  handleApproveBatch,
  handleAnnotateReview,
  handleExpertNotifications,
  handleSessionsByExpert,
  handleExpertIntegrations,
  handleZoomTemplates,
  handleFetchCategories,
  handleGetUserTopics,
  handleUpdateUserTopics
};
