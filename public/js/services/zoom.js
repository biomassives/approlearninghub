// lib/zoom.js OR utils/zoom.js (Choose a location)

// Assuming 'jsonwebtoken' is installed if using JWT auth.
// For modern Node/Vercel, fetch is often global. Remove 'node-fetch' dependency if not needed.
// const fetch = require('node-fetch'); // Remove if fetch is global
import jwt from 'jsonwebtoken'; // Use import if your project uses ES Modules

/**
 * Configuration object for Zoom API credentials from environment variables
 */
const zoomConfig = {
    // JWT App Type (might be deprecated by Zoom for new apps)
    apiKey: process.env.ZOOM_API_KEY,
    apiSecret: process.env.ZOOM_API_SECRET,
    // Server-to-Server OAuth App Type (Recommended)
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    // Standard OAuth App Type (Requires user interaction flow - less likely for server backend)
    // redirectUri: process.env.ZOOM_REDIRECT_URI
};

// Validate essential config for the chosen method (Server-to-Server OAuth is preferred)
if (!zoomConfig.accountId || !zoomConfig.clientId || !zoomConfig.clientSecret) {
    console.warn("Zoom Server-to-Server OAuth credentials (ACCOUNT_ID, CLIENT_ID, CLIENT_SECRET) are not fully configured in environment variables. Zoom API calls may fail.");
}

/**
 * Get Zoom authorization token using Server-to-Server OAuth.
 * @returns {Promise<string>} Access token for Zoom API
 */
// Example Cache Implementation (inside lib/zoom.js)
let cachedToken = null;
let tokenExpiry = 0; // Store expiry time (timestamp in milliseconds)

async function getZoomToken() {
    const now = Date.now();
    // Check cache first (give 1 min buffer before expiry)
    if (cachedToken && tokenExpiry > (now + 60 * 1000)) {
        console.log("Using cached Zoom token.");
        return cachedToken;
    }

    // --- Preferred: Server-to-Server OAuth ---
    if (zoomConfig.accountId && zoomConfig.clientId && zoomConfig.clientSecret) {
        console.log("Fetching new Zoom token using Server-to-Server OAuth...");
        try {
            // ... (fetch logic as before) ...
            const tokenData = await response.json();

            // Cache the new token and calculate expiry
            cachedToken = tokenData.access_token;
            // expires_in is in seconds, convert to milliseconds timestamp
            tokenExpiry = now + (tokenData.expires_in * 1000);

            console.log("Successfully obtained and cached Zoom token.");
            return cachedToken;
        } catch (error) {
            // Clear cache on error
            cachedToken = null;
            tokenExpiry = 0;
            console.error('Error getting Zoom Server-to-Server OAuth token:', error);
            throw error;
        }
    }
    // --- JWT Fallback (Remove if not needed) ---
    // else if (zoomConfig.apiKey && zoomConfig.apiSecret) { ... }
    else {
         console.error("No valid Zoom API credentials configured.");
         throw new Error('Zoom API credentials are not configured.');
    }
}


/**
 * List all Zoom meeting templates for the authenticated user.
 * @returns {Promise<Array>} List of meeting templates
 */
export async function listZoomMeetingTemplates() { // <-- Make sure this is exported
    console.log("Fetching Zoom meeting templates...");
    try {
        const token = await getZoomToken();
        const authType = (zoomConfig.accountId && zoomConfig.clientId) ? 'OAuth' : 'JWT'; // Determine auth type for logging
        console.log(`Using Zoom ${authType} token for request.`);

        // Note: The API endpoint might depend on the App type (User-managed vs Account-level)
        // '/users/me/meeting_templates' is for user-level templates.
        // Check Zoom docs if you need account-level templates.
        const response = await fetch('https://api.zoom.us/v2/users/me/meeting_templates', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Zoom API error fetching templates: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to fetch meeting templates: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        const data = await response.json();
        console.log(`Successfully fetched ${data.templates?.length || 0} Zoom templates.`);
        return data.templates || [];
    } catch (error) {
        console.error('Error in listZoomMeetingTemplates:', error);
        // Don't just return []; throw the error so the API route can handle it
        throw error;
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
    


;