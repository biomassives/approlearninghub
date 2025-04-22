// lib/zoomHandlers.js
const fetch = require('node-fetch');

/**
 * Configuration object for Zoom API credentials
 * These would typically be loaded from environment variables
 */
const zoomConfig = {
  apiKey: process.env.ZOOM_API_KEY,
  apiSecret: process.env.ZOOM_API_SECRET,
  accountId: process.env.ZOOM_ACCOUNT_ID,
  clientId: process.env.ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET,
  redirectUri: process.env.ZOOM_REDIRECT_URI
};

/**
 * Get Zoom authorization token
 * @returns {Promise<string>} JWT token for Zoom API
 */
async function getZoomToken() {
  try {
    // For JWT app type
    if (zoomConfig.apiKey && zoomConfig.apiSecret) {
      // Generate JWT token
      const payload = {
        iss: zoomConfig.apiKey,
        exp: Math.floor(Date.now() / 1000) + 60 * 60
      };
      
      // In a production environment, use a proper JWT library
      // This is a simplified placeholder
      const token = require('jsonwebtoken').sign(payload, zoomConfig.apiSecret);
      return token;
    }
    
    // For OAuth app type
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${zoomConfig.clientId}:${zoomConfig.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: zoomConfig.accountId
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Zoom token: ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting Zoom token:', error);
    throw error;
  }
}

/**
 * List all Zoom meeting templates
 * @returns {Promise<Array>} List of meeting templates
 */
async function listZoomMeetingTemplates() {
  try {
    const token = await getZoomToken();
    
    const response = await fetch('https://api.zoom.us/v2/users/me/meeting_templates', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch meeting templates: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('Error listing Zoom meeting templates:', error);
    return [];
  }
}

/**
 * Create a Zoom meeting
 * @param {Object} meetingDetails - Meeting details including topic, start_time, duration, etc.
 * @param {string} templateId - Optional template ID to apply
 * @returns {Promise<Object>} Created meeting details
 */
async function createZoomMeeting(meetingDetails, templateId = null) {
  try {
    const token = await getZoomToken();
    
    const payload = {
      ...meetingDetails,
      type: 2, // Scheduled meeting
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        approval_type: 0,
        audio: 'both',
        auto_recording: 'none',
        ...(meetingDetails.settings || {})
      }
    };
    
    // Apply template if provided
    if (templateId) {
      payload.template_id = templateId;
    }
    
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create meeting: ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    throw error;
  }
}

/**
 * Get Zoom meeting details
 * @param {string} meetingId - ID of the meeting to retrieve
 * @returns {Promise<Object>} Meeting details
 */
async function getZoomMeeting(meetingId) {
  try {
    const token = await getZoomToken();
    
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get meeting: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting Zoom meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Update an existing Zoom meeting
 * @param {string} meetingId - ID of the meeting to update
 * @param {Object} updateDetails - Details to update
 * @returns {Promise<Object>} Updated meeting details
 */
async function updateZoomMeeting(meetingId, updateDetails) {
  try {
    const token = await getZoomToken();
    
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateDetails)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update meeting: ${response.statusText}`);
    }
    
    // Get the updated meeting
    return await getZoomMeeting(meetingId);
  } catch (error) {
    console.error(`Error updating Zoom meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Delete a Zoom meeting
 * @param {string} meetingId - ID of the meeting to delete
 * @param {boolean} cancelInstance - Whether to cancel a meeting instance
 * @returns {Promise<boolean>} Success status
 */
async function deleteZoomMeeting(meetingId, cancelInstance = false) {
  try {
    const token = await getZoomToken();
    
    const query = cancelInstance ? '?schedule_for_reminder=true' : '';
    
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}${query}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete meeting: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting Zoom meeting ${meetingId}:`, error);
    return false;
  }
}

/**
 * List upcoming Zoom meetings for the user
 * @param {number} limit - Maximum number of meetings to return
 * @returns {Promise<Array>} List of upcoming meetings
 */
async function listUpcomingZoomMeetings(limit = 20) {
  try {
    const token = await getZoomToken();
    
    const response = await fetch(`https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming meetings: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.meetings || [];
  } catch (error) {
    console.error('Error listing upcoming Zoom meetings:', error);
    return [];
  }
}

/**
 * Generate a Zoom meeting invitation
 * @param {string} meetingId - ID of the meeting
 * @returns {Promise<string>} Meeting invitation text
 */
async function generateZoomInvitation(meetingId) {
  try {
    const token = await getZoomToken();
    
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/invitation`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate invitation: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.invitation || '';
  } catch (error) {
    console.error(`Error generating Zoom invitation for meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Create a webinar
 * @param {Object} webinarDetails - Webinar details
 * @returns {Promise<Object>} Created webinar details
 */
async function createZoomWebinar(webinarDetails) {
  try {
    const token = await getZoomToken();
    
    const response = await fetch('https://api.zoom.us/v2/users/me/webinars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webinarDetails)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create webinar: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating Zoom webinar:', error);
    throw error;
  }
}

/**
 * Get a user's Zoom profile info
 * @param {string} userId - User ID (default: 'me' for the authenticated user)
 * @returns {Promise<Object>} User profile
 */
async function getZoomUserProfile(userId = 'me') {
  try {
    const token = await getZoomToken();
    
    const response = await fetch(`https://api.zoom.us/v2/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting Zoom user profile for ${userId}:`, error);
    throw error;
  }
}

// Export all handlers
module.exports = {
  listZoomMeetingTemplates,
  createZoomMeeting,
  getZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  listUpcomingZoomMeetings,
  generateZoomInvitation,
  createZoomWebinar,
  getZoomUserProfile,
  getZoomToken
};