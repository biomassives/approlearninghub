// lib/integrationHandlers.js
// Handlers for Zoom and Notion integration settings and templates

// Assume we have DB utilities to fetch settings and Zoom API client for templates
const { getIntegrationSettingsFromDB } = require('./settingsHandlers');
const { listZoomMeetingTemplates } = require('./zoomHandlers');

/**
 * Fetch integration settings for Zoom and Notion for the current user or workspace.
 * @param {object} req - Express request, containing user context (e.g. req.user.id)
 * @param {object} res - Express response
 * @returns {Promise<object>} settings object
 */
async function fetchIntegrationSettings(req, res) {
  // Extract user or workspace ID
  const userId = req.user?.id || req.query.userId || req.body.userId;
  if (!userId) {
    throw new Error('Missing userId to fetch integration settings');
  }

  // Retrieve from DB: { zoomConnected, zoomAccount, notionConnected, notionWorkspace, preferences... }
  const settings = await getIntegrationSettingsFromDB(userId);
  return settings;
}

/**
 * Fetch available Zoom meeting templates for scheduling.
 * @param {object} req - Express request, containing user context (e.g. req.user.id)
 * @param {object} res - Express response
 * @returns {Promise<Array>} list of templates
 */
async function fetchZoomTemplates(req, res) {
  // Extract user or account context
  const userId = req.user?.id || req.query.userId || req.body.userId;
  if (!userId) {
    throw new Error('Missing userId to fetch Zoom templates');
  }

  // Use Zoom API client to list templates
  const templates = await listZoomMeetingTemplates(userId);
  return templates;
}

module.exports = {
  fetchIntegrationSettings,
  fetchZoomTemplates
};
