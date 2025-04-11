// content-api-client.js
// Client-side utility for interacting with content APIs

import { loadSecureSession } from './session-crypto.js';

// Base API URL - can be adjusted for different environments
const API_BASE_URL = '';

// Generic fetch function for API calls
async function fetchAPI(endpoint, method = 'GET', data = null) {
  try {
    // Get the user's session for authentication
    const sessionData = await loadSecureSession();
    if (!sessionData?.session?.access_token) {
      throw new Error('No active session found. Please log in.');
    }
    
    // Prepare request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }
    
    // Add query params for GET requests
    const url = method === 'GET' && data 
      ? `${API_BASE_URL}${endpoint}${formatQueryParams(data)}`
      : `${API_BASE_URL}${endpoint}`;
    
    // Make the API request
    const response = await fetch(url, options);
    
    // Parse the JSON response
    const result = await response.json();
    
    // Handle API errors
    if (!response.ok) {
      throw new Error(result.error || `API request failed with status ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}

// Helper to format query parameters
function formatQueryParams(params) {
  if (!params || Object.keys(params).length === 0) return '';
  
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle arrays and objects
      if (typeof value === 'object') {
        return `${key}=${encodeURIComponent(JSON.stringify(value))}`;
      }
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join('&');
    
  return queryString ? `?${queryString}` : '';
}

// ------- Video API Methods -------

// Get videos with optional filtering
export async function getVideos(filters = {}) {
  return fetchAPI('/api/content/video-manager', 'GET', filters);
}

// Get a single video by ID
export async function getVideo(id) {
  return fetchAPI('/api/content/video-manager', 'GET', { id });
}

// Create a new video
export async function createVideo(videoData) {
  return fetchAPI('/api/content/video-manager', 'POST', videoData);
}

// Update an existing video
export async function updateVideo(id, updateData) {
  return fetchAPI(`/api/content/video-manager?id=${id}`, 'PUT', updateData);
}

// Delete a video
export async function deleteVideo(id) {
  return fetchAPI(`/api/content/video-manager?id=${id}`, 'DELETE');
}

// Change video status (publish/unpublish)
export async function changeVideoStatus(id, status, statusNote = '') {
  return fetchAPI(`/api/content/video-manager?id=${id}`, 'PATCH', { 
    status, 
    statusNote 
  });
}

// ------- Training Modules API Methods -------

// Get training modules with optional filtering
export async function getTrainingModules(filters = {}) {
  return fetchAPI('/api/content/training-modules', 'GET', filters);
}

// Get a single training module by ID
export async function getTrainingModule(id, includeMaterials = true, includeVideos = true) {
  return fetchAPI('/api/content/training-modules', 'GET', { 
    id, 
    includeMaterials, 
    includeVideos 
  });
}

// Create a new training module
export async function createTrainingModule(moduleData) {
  return fetchAPI('/api/content/training-modules', 'POST', moduleData);
}

// Update an existing training module
export async function updateTrainingModule(id, updateData) {
  return fetchAPI(`/api/content/training-modules?id=${id}`, 'PUT', updateData);
}

// Delete a training module
export async function deleteTrainingModule(id) {
  return fetchAPI(`/api/content/training-modules?id=${id}`, 'DELETE');
}

// ------- User Involvement API Methods -------

// Get user involvement data
export async function getUserInvolvement(userId = null, type = null, includeDetails = true) {
  return fetchAPI('/api/participation/user-involvement', 'GET', { 
    userId, 
    type, 
    includeDetails 
  });
}

// Add user to module, clinic, or library
export async function addUserInvolvement(type, itemId, userId = null, role = 'participant', details = {}) {
  return fetchAPI('/api/participation/user-involvement', 'POST', {
    type,
    itemId,
    userId,
    role,
    details
  });
}

// Update user involvement (progress, status, etc.)
export async function updateUserInvolvement(type, involvementId, updates) {
  return fetchAPI('/api/participation/user-involvement', 'PUT', {
    type,
    involvementId,
    updates
  });
}

// Remove user involvement
export async function removeUserInvolvement(type, involvementId) {
  return fetchAPI(`/api/participation/user-involvement?type=${type}&involvementId=${involvementId}`, 'DELETE');
}

// ------- Gantt Chart Data API Methods -------

// Get data for Gantt chart visualization
export async function getGanttData(options = {}) {
  const defaultOptions = {
    view: 'all',
    userId: null,
    startDate: null,
    endDate: null,
    includeCompleted: true
  };
  
  const queryParams = { ...defaultOptions, ...options };
  
  return fetchAPI('/api/dashboards/gantt-data', 'GET', queryParams);
}

// ------- Example Functions for Common Use Cases -------

// Enroll current user in a training module
export async function enrollInModule(moduleId, initialProgress = 0) {
  return addUserInvolvement('module', moduleId, null, 'participant', {
    status: 'enrolled',
    progress: initialProgress
  });
}

// Update module progress for current user
export async function updateModuleProgress(enrollmentId, progress, status = null) {
  const updates = { progress };
  if (status) updates.status = status;
  
  return updateUserInvolvement('module', enrollmentId, updates);
}

// Register for a clinic
export async function registerForClinic(clinicId, role = 'participant') {
  return addUserInvolvement('clinic', clinicId, null, role);
}

// Record video interaction (view, like, comment)
export async function recordVideoInteraction(videoId, interactionType, details = {}) {
  return addUserInvolvement('video', videoId, null, 'viewer', {
    interactionType,
    ...details
  });
}

// Mark a module as completed
export async function completeModule(enrollmentId) {
  return updateUserInvolvement('module', enrollmentId, {
    status: 'completed',
    progress: 100,
    completion_date: new Date().toISOString()
  });
}

// Add a contribution to a library entry
export async function contributeToLibrary(libraryId, contributionType = 'author', description = '') {
  return addUserInvolvement('library', libraryId, null, contributionType, {
    contributionType,
    description
  });
}

// ------- Tags Management -------

// Get all tags
export async function getTags() {
  return fetchAPI('/api/content/tags', 'GET');
}

// Create a new tag
export async function createTag(name, color = null, description = '') {
  return fetchAPI('/api/content/tags', 'POST', {
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    color,
    description
  });
}

// Update a tag
export async function updateTag(id, updates) {
  return fetchAPI(`/api/content/tags?id=${id}`, 'PUT', updates);
}

// Delete a tag
export async function deleteTag(id) {
  return fetchAPI(`/api/content/tags?id=${id}`, 'DELETE');
}

// ------- Panels Management -------

// Get panels for a video
export async function getPanels(videoId) {
  return fetchAPI('/api/content/panels', 'GET', { video_id: videoId });
}

// Create a new panel
export async function createPanel(videoId, title, content) {
  return fetchAPI('/api/content/panels', 'POST', {
    video_id: videoId,
    title,
    content
  });
}

// Update a panel
export async function updatePanel(id, updates) {
  return fetchAPI(`/api/content/panels?id=${id}`, 'PUT', updates);
}

// Delete a panel
export async function deletePanel(id) {
  return fetchAPI(`/api/content/panels?id=${id}`, 'DELETE');
}

// ------- Dashboard Data -------

// Get user dashboard summary stats
export async function getDashboardStats(userId = null) {
  return fetchAPI('/api/dashboards/user-stats', 'GET', { userId });
}

// Get upcoming clinics for user
export async function getUpcomingClinics(userId = null, limit = 5) {
  return fetchAPI('/api/dashboards/upcoming-clinics', 'GET', { userId, limit });
}

// Get in-progress modules for user
export async function getInProgressModules(userId = null, limit = 5) {
  return fetchAPI('/api/dashboards/in-progress-modules', 'GET', { userId, limit });
}

// ------- Activity Data -------

// Get user activity timeline
export async function getUserActivity(userId = null, limit = 20, page = 1) {
  return fetchAPI('/api/dashboards/user-activity', 'GET', { userId, limit, page });
}

// Record a custom activity
export async function recordActivity(action, details, targetId = null) {
  return fetchAPI('/api/dashboards/record-activity', 'POST', {
    action,
    details,
    targetId
  });
}

// ------- Error Handling Helper -------

// Utility function to handle API errors in UI components
export function handleApiError(error, setErrorState, defaultMessage = 'An error occurred') {
  console.error('API Error:', error);
  
  if (error.message === 'No active session found. Please log in.') {
    // Handle authentication errors by redirecting to login
    window.location.href = '/login.html?message=' + encodeURIComponent('Your session has expired. Please log in again.');
    return;
  }
  
  // Set error state for component to display
  setErrorState(error.message || defaultMessage);
}
