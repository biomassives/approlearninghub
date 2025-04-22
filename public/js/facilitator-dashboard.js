// facilitator-dashboard.js - Integration with Settings UI
import { loadSecureSession, hashMetaLattice, clearSecureSession } from './session-crypto.js';
import SettingsUI from './settings-ui.js';
import { listZoomMeetingTemplates } from '../lib/zoomHandlers.js';

// DOM Elements
const userNameDisplay = document.getElementById('user-name');
const latticeInfoDisplay = document.getElementById('lattice-info');
const logoutButton = document.getElementById('logout-btn');
const upcomingSessionsList = document.getElementById('upcoming-sessions');
const participantsList = document.getElementById('participants-list');
const feedbackList = document.getElementById('feedback-list');

// Dashboard state
const state = {
  user: null,
  sessions: [],
  participants: [],
  feedback: [],
  zoomTemplates: []
};

/**
 * Initialize the facilitator dashboard
 */
async function init() {
  try {
    // Load and verify session
    const session = await loadSecureSession();
    if (!session || (session.role !== 'facilitator' && session.role !== 'expert')) {
      window.location.href = '/login.html?error=unauthorized';
      return;
    }
    
    // Store user info in state
    state.user = {
      email: session.email,
      role: session.role,
      displayName: session.email.split('@')[0] // Default to username from email
    };
    
    // Update lattice security display
    updateLatticeDisplay(session);
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize Settings UI for facilitator
    initializeSettingsUI(session);
    
    // Fetch dashboard data
    await Promise.all([
      fetchUpcomingSessions(),
      fetchParticipantsData(),
      fetchFeedbackData(),
      fetchZoomTemplates()
    ]);
    
    // Update UI with fetched data
    updateDashboardUI();
    
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError('Failed to initialize dashboard. Please try refreshing the page.');
  }
}

/**
 * Initialize Settings UI for the facilitator dashboard
 * @param {Object} session - User session data
 */
function initializeSettingsUI(session) {
  // Create Settings UI instance with facilitator-specific configuration
  const settingsUI = new SettingsUI({
    containerId: 'settings-container',
    modalId: 'facilitator-settings-modal',
    // Enable all sections for facilitators
    enabledSections: ['profile', 'security', 'notifications', 'language', 'appearance'],
    onSave: handleSettingsSave,
    onSessionInvalidated: handleSessionInvalidated
  });
  
  // Add settings button to header 
  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.className = 'btn-icon';
    settingsBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13.75C12.0711 13.75 13.75 12.0711 13.75 10C13.75 7.92893 12.0711 6.25 10 6.25C7.92893 6.25 6.25 7.92893 6.25 10C6.25 12.0711 7.92893 13.75 10 13.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16.25 13.75C16.0877 14.1339 16.0715 14.5592 16.205 14.9521C16.3385 15.345 16.614 15.6851 16.9812 15.9125L17.0375 15.9687C17.3399 16.2707 17.5099 16.6753 17.5099 17.0969C17.5099 17.5184 17.3399 17.923 17.0375 18.225C16.7355 18.5274 16.3309 18.6974 15.9094 18.6974C15.4878 18.6974 15.0832 18.5274 14.7812 18.225L14.725 18.1687C14.4976 17.8016 14.1575 17.526C13.7646 17.3925 13.3393 17.4087 12.9554 17.571C12.5807 17.7267 12.2798 18.0232 12.115 18.3925C11.9502 18.7618 11.933 19.1784 12.0672 19.5604C12.2015 19.9425 12.4784 20.2654 12.8375 20.4562C13.1966 20.647 13.6132 20.7032 14.016 20.6152C14.4189 20.5272 14.7776 20.3001 15.025 19.975" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.3875 6.3875C15.7454 6.14009 16.0036 5.77516 16.1212 5.35348C16.2389 4.93179 16.2088 4.48195 16.0362 4.0805C15.8637 3.67905 15.5591 3.34893 15.1712 3.14357C14.7833 2.93822 14.335 2.87104 13.9063 2.95377C13.4776 3.0365 13.0912 3.26382 12.8137 3.60008C12.5362 3.93635 12.3863 4.36085 12.388 4.79952C12.3883 5.02994 12.4324 5.25765 12.5177 5.47125L11.8687 6.12C11.2687 6.72 10.6687 7.32 10.0687 7.91875L9.8625 8.125C9.32326 7.93196 8.73731 7.9476 8.21036 8.16844C7.68341 8.38929 7.25465 8.79882 7.00624 9.31926C6.75782 9.8397 6.7076 10.4329 6.86483 10.9874C7.02207 11.5418 7.37631 12.0198 7.85996 12.3242C8.34362 12.6285 8.92048 12.7375 9.48326 12.6294C10.046 12.5213 10.5531 12.2029 10.9131 11.7366C11.2731 11.2702 11.4616 10.6871 11.4444 10.0893C11.4272 9.49156 11.2054 8.92078 10.8187 8.475L11.025 8.26875C11.6187 7.675 12.2187 7.075 12.8187 6.475L13.4675 5.825C13.685 5.91081 13.9168 5.95513 14.1512 5.95625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Insert before logout button if it exists, or append to header actions
    if (logoutButton) {
      headerActions.insertBefore(settingsBtn, logoutButton);
    } else {
      headerActions.appendChild(settingsBtn);
    }
    
    // Add event listener to open settings
    settingsBtn.addEventListener('click', () => {
      settingsUI.open();
    });
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Logout button
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await clearSecureSession();
      window.location.href = '/login.html?msg=logged_out';
    });
  }
  
  // Navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section) {
        activateSection(section);
      } else {
        const href = link.getAttribute('href');
        if (href) {
          window.location.href = href;
        }
      }
    });
  });
  
  // Add session button
  const addSessionBtn = document.getElementById('add-session-btn');
  if (addSessionBtn) {
    addSessionBtn.addEventListener('click', () => {
      showAddSessionModal();
    });
  }
}

/**
 * Update lattice security display
 * @param {Object} session - User session data
 */
async function updateLatticeDisplay(session) {
  if (!latticeInfoDisplay) return;
  
  try {
    const { metaLattice, latticeHash, email } = session;
    const recomputedHash = await hashMetaLattice(metaLattice);
    const isValid = recomputedHash === latticeHash;
    
    latticeInfoDisplay.textContent = `Email: ${email}\nLattice ID: ${session.latticeId.substring(0, 8)}...\nStatus: ${isValid ? '✅ Verified' : '⚠️ Mismatch'}`;
    
    // Update user name display
    if (userNameDisplay) {
      userNameDisplay.textContent = state.user.displayName;
    }
  } catch (error) {
    console.error('Error updating lattice display:', error);
    latticeInfoDisplay.textContent = 'Error verifying session security';
  }
}

/**
 * Fetch upcoming facilitation sessions
 */
async function fetchUpcomingSessions() {
  try {
    const session = await loadSecureSession();
    
    const response = await fetch('/api/facilitator/sessions', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }
    
    const data = await response.json();
    state.sessions = data.sessions || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    // Use placeholder data if needed
    state.sessions = [
      {
        id: 'session-1',
        title: 'Water Conservation Workshop',
        date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        participants: 12,
        zoomLink: 'https://zoom.us/j/123456789',
        status: 'upcoming'
      },
      {
        id: 'session-2',
        title: 'Solar Panel Installation Basics',
        date: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
        participants: 8,
        zoomLink: 'https://zoom.us/j/987654321',
        status: 'upcoming'
      }
    ];
  }
}

/**
 * Fetch participants data
 */
async function fetchParticipantsData() {
  try {
    const session = await loadSecureSession();
    
    const response = await fetch('/api/facilitator/participants', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch participants: ${response.statusText}`);
    }
    
    const data = await response.json();
    state.participants = data.participants || [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    // Use placeholder data if needed
    state.participants = [
      { id: 'p1', name: 'Jane Doe', email: 'jane@example.com', sessions: 3 },
      { id: 'p2', name: 'John Smith', email: 'john@example.com', sessions: 2 },
      { id: 'p3', name: 'Maria Garcia', email: 'maria@example.com', sessions: 1 }
    ];
  }
}

/**
 * Fetch feedback data
 */
async function fetchFeedbackData() {
  try {
    const session = await loadSecureSession();
    
    const response = await fetch('/api/facilitator/feedback', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feedback: ${response.statusText}`);
    }
    
    const data = await response.json();
    state.feedback = data.feedback || [];
  } catch (error) {
    console.error('Error fetching feedback:', error);
    // Use placeholder data if needed
    state.feedback = [
      { id: 'f1', sessionId: 'session-1', rating: 4.5, comment: 'Very informative and engaging', date: '2025-04-10' },
      { id: 'f2', sessionId: 'session-2', rating: 4.2, comment: 'Great content, but would like more hands-on examples', date: '2025-04-05' }
    ];
  }
}

/**
 * Fetch Zoom meeting templates
 */
async function fetchZoomTemplates() {
  try {
    // Use the imported function from zoomHandlers.js
    const templates = await listZoomMeetingTemplates();
    state.zoomTemplates = templates || [];
  } catch (error) {
    console.error('Error fetching Zoom templates:', error);
    state.zoomTemplates = [];
  }
}

/**
 * Update dashboard UI with current state data
 */
function updateDashboardUI() {
  // Update upcoming sessions list
  if (upcomingSessionsList) {
    if (state.sessions.length > 0) {
      upcomingSessionsList.innerHTML = state.sessions
        .filter(session => session.status === 'upcoming')
        .map(session => `
          <div class="session-card">
            <h3 class="session-title">${session.title}</h3>
            <div class="session-details">
              <p class="session-date">${formatDate(session.date)}</p>
              <p class="session-participants">${session.participants} Participants</p>
            </div>
            <div class="session-actions">
              <a href="${session.zoomLink}" class="btn-primary" target="_blank">Join Meeting</a>
              <button class="btn-secondary view-details-btn" data-session-id="${session.id}">View Details</button>
            </div>
          </div>
        `).join('');
    } else {
      upcomingSessionsList.innerHTML = `
        <div class="empty-state">
          <p>No upcoming sessions scheduled</p>
          <button id="schedule-first-session" class="btn-primary">Schedule Your First Session</button>
        </div>
      `;
      
      // Add event listener to the empty state button
      const scheduleFirstSessionBtn = document.getElementById('schedule-first-session');
      if (scheduleFirstSessionBtn) {
        scheduleFirstSessionBtn.addEventListener('click', () => {
          showAddSessionModal();
        });
      }
    }
    
    // Add event listeners to view details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
    viewDetailsButtons.forEach(button => {
      button.addEventListener('click', () => {
        const sessionId = button.getAttribute('data-session-id');
        showSessionDetailsModal(sessionId);
      });
    });
  }
  
  // Update participants list
  if (participantsList) {
    if (state.participants.length > 0) {
      participantsList.innerHTML = state.participants.map(participant => `
        <div class="participant-item">
          <div class="participant-info">
            <h4>${participant.name}</h4>
            <p>${participant.email}</p>
          </div>
          <div class="participant-stats">
            <span class="badge">${participant.sessions} sessions</span>
          </div>
        </div>
      `).join('');
    } else {
      participantsList.innerHTML = `<p class="empty-state">No participants data available</p>`;
    }
  }
  
  // Update feedback list
  if (feedbackList) {
    if (state.feedback.length > 0) {
      feedbackList.innerHTML = state.feedback.map(feedback => {
        // Find the session title
        const session = state.sessions.find(s => s.id === feedback.sessionId);
        const sessionTitle = session ? session.title : 'Unknown Session';
        
        return `
          <div class="feedback-item">
            <div class="feedback-header">
              <h4>${sessionTitle}</h4>
              <div class="rating">
                ${generateStarRating(feedback.rating)}
                <span class="rating-value">${feedback.rating}</span>
              </div>
            </div>
            <p class="feedback-comment">${feedback.comment}</p>
            <p class="feedback-date">${formatDate(feedback.date)}</p>
          </div>
        `;
      }).join('');
    } else {
      feedbackList.innerHTML = `<p class="empty-state">No feedback available yet</p>`;
    }
  }
  
  // Add event listener to any "View details" buttons that were added
  document.querySelectorAll('.view-details-btn').forEach(button => {
    button.addEventListener('click', () => {
      const sessionId = button.getAttribute('data-session-id');
      showSessionDetailsModal(sessionId);
    });
  });
}

/**
 * Generate HTML star rating display
 * @param {number} rating - Rating value (0-5)
 * @returns {string} HTML for star rating display
 */
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  let stars = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars += `
      <svg class="star-full" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
      </svg>
    `;
  }
  
  // Half star if needed
  if (halfStar) {
    stars += `
      <svg class="star-half" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2v15.27z"></path>
        <path d="M12 2v15.27l-6.18 3.73 1.64-7.03L2 9.24l7.19-.61L12 2z" fill="none" stroke="currentColor"></path>
      </svg>
    `;
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars += `
      <svg class="star-empty" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
      </svg>
    `;
  }
  
  return stars;
}

/**
 * Show session details modal
 * @param {string} sessionId - ID of the session to show details for
 */
function showSessionDetailsModal(sessionId) {
  // Find the session in state
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) {
    console.error(`Session with ID ${sessionId} not found`);
    return;
  }
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('session-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'session-details-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  
  // Set modal content
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>${session.title}</h2>
      
      <div class="session-details-grid">
        <div class="detail-item">
          <span class="detail-label">Date & Time</span>
          <span class="detail-value">${formatDate(session.date, true)}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Participants</span>
          <span class="detail-value">${session.participants}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Zoom Link</span>
          <a href="${session.zoomLink}" target="_blank" class="detail-link">${session.zoomLink}</a>
        </div>
      </div>
      
      <div class="session-actions-footer">
        <button class="btn-secondary edit-session-btn" data-session-id="${session.id}">Edit Session</button>
        <button class="btn-primary start-session-btn">Start Session</button>
      </div>
    </div>
  `;
  
  // Show the modal
  modal.style.display = 'block';
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  const editBtn = modal.querySelector('.edit-session-btn');
  editBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    showEditSessionModal(sessionId);
  });
  
  const startBtn = modal.querySelector('.start-session-btn');
  startBtn.addEventListener('click', () => {
    window.open(session.zoomLink, '_blank');
  });
  
  // Close when clicking outside the modal content
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Show add session modal
 */
function showAddSessionModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('add-session-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-session-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  
  // Set modal content with form
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Schedule New Session</h2>
      
      <form id="add-session-form">
        <div class="form-group">
          <label for="session-title">Session Title</label>
          <input type="text" id="session-title" name="title" required>
        </div>
        
        <div class="form-group">
          <label for="session-date">Date & Time</label>
          <input type="datetime-local" id="session-date" name="date" required>
        </div>
        
        <div class="form-group">
          <label for="session-duration">Duration (minutes)</label>
          <input type="number" id="session-duration" name="duration" min="15" max="180" step="15" value="60">
        </div>
        
        <div class="form-group">
          <label for="session-template">Zoom Template (Optional)</label>
          <select id="session-template" name="template">
            <option value="">None (Create new meeting)</option>
            ${state.zoomTemplates.map(template => `
              <option value="${template.id}">${template.name}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="session-description">Description</label>
          <textarea id="session-description" name="description" rows="4"></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn-primary">Schedule Session</button>
        </div>
      </form>
    </div>
  `;
  
  // Show the modal
  modal.style.display = 'block';
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  const cancelBtn = modal.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  const form = modal.querySelector('#add-session-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const sessionData = {
      title: formData.get('title'),
      date: formData.get('date'),
      duration: formData.get('duration'),
      template: formData.get('template'),
      description: formData.get('description')
    };
    
    // Create session (would normally call API)
    console.log('Creating session with data:', sessionData);
    
    // Close modal and refresh data
    modal.style.display = 'none';
    await fetchUpcomingSessions();
    updateDashboardUI();
  });
  
  // Close when clicking outside the modal content
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Show edit session modal
 * @param {string} sessionId - ID of the session to edit
 */
function showEditSessionModal(sessionId) {
  // Similar to showAddSessionModal but pre-filled with session data
  console.log(`Editing session ${sessionId}`);
}

/**
 * Handle settings save callback
 * @param {Object} settings - The saved settings
 */
function handleSettingsSave(settings) {
  console.log('Settings saved:', settings);
  
  // Apply language preference
  if (settings.language && settings.language.preferred) {
    localStorage.setItem('preferredLang', settings.language.preferred);
  }
  
  // Apply display name if changed
  if (settings.profile && settings.profile.displayName) {
    state.user.displayName = settings.profile.displayName;
    
    // Update display name in UI
    if (userNameDisplay) {
      userNameDisplay.textContent = settings.profile.displayName;
    }
  }
  
  // Apply theme settings if available
  if (settings.appearance && settings.appearance.theme) {
    document.documentElement.dataset.theme = settings.appearance.theme;
  }
}

/**
 * Handle session invalidation
 */
function handleSessionInvalidated() {
  console.log('All other sessions have been invalidated');
  
  // Show a notification
  showNotification('All other devices have been logged out', 'success');
}

/**
 * Show a temporary notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after timeout
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  showNotification(message, 'error');
}

/**
 * Format a date for display
 * @param {string} dateString - ISO date string
 * @param {boolean} includeTime - Whether to include time in the display
 * @returns {string} Formatted date
 */
function formatDate(dateString, includeTime = false) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  // For upcoming dates
  if (diffMs < 0) {
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    
    if (Math.abs(diffDay) < 7) {
      return formatter.format(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 'day');
    } else {
      return includeTime 
        ? date.toLocaleString()
        : date.toLocaleDateString();
    }
  }
  
  // For past dates
  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return includeTime 
      ? date.toLocaleString()
      : date.toLocaleDateString();
  }
}

/**
 * Activate a dashboard section
 * @param {string} sectionId - ID of the section to activate
 */
function activateSection(sectionId) {
  // Update active section
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(section => {
    section.classList.toggle('active', section.id === sectionId);
  });
  
  // Update active nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
  });
  
  // Update URL hash
  window.location.hash = sectionId;
}

// Initialize the dashboard
init();

// Export the dashboard module
export default {
  refreshData: async () => {
    await Promise.all([
      fetchUpcomingSessions(),
      fetchParticipantsData(),
      fetchFeedbackData()
    ]);
    updateDashboardUI();
  }
};