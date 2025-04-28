// js/expert-dashboard.js
// Unified Expert Dashboard Entry Point (Refactored for Robust Auth)
import authService from './auth-service.js';
import { loadSecureSession, hashMetaLattice, clearSecureSession, createSecureSession } from './session-crypto.js';
import SettingsUI from './settings-ui.js';

// --- Global Error Handlers for Diagnostics ---
window.addEventListener('error', event => {
    console.error('Global error caught:', event.message, event.error);
    if (event.message.includes('JSON.parse')) {
        displayAuthError('Session data corrupted or invalid. Please log in again.');
    }
});
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    displayAuthError('An unexpected error occurred. Please refresh the page or log in again.');
});

// --- DOM Selectors ---
const greetingEl = document.getElementById('greeting');
const latticeInfoEl = document.getElementById('lattice-info');
const toolsListEl = document.getElementById('expert-tools');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');       // optional
const userRoleEl = document.getElementById('user-role');       // optional
const activityFeedEl = document.getElementById('activity-feed'); // optional
const settingsBtn = document.getElementById('settings-btn');   // Get settings button

// New selectors for status and content area
const statusElement = document.getElementById('expert-dashboard-status');
const contentElement = document.getElementById('expert-dashboard-content');

// --- Whitelisted Tool Links for Expert ---
const EXPERT_TOOLS = [
  { label: 'Learning Modules',     href: '/expert/modules.html' },
  { label: 'Clinics Timeline',       href: '/expert/reviews.html' },
  { label: 'Solutions Library',      href: '/library/categories' },
  { label: 'Your Teams',   href: '/expert/mentorship.html' }
];

// --- Helper Function to Display Errors ---
function displayAuthError(message) {
    console.error('Expert Dashboard Auth Failed:', message);
    // Clear any stored sessions
    clearSecureSession();
    authService.clearSession && authService.clearSession();

    if (statusElement) {
        statusElement.textContent = `Error: ${message} Please try logging in again.`;
        statusElement.style.color = '#D8000C'; // Error text color
        statusElement.style.backgroundColor = '#FFD2D2'; // Light red background
        statusElement.style.borderColor = '#D8000C'; // Error border color
        statusElement.style.display = 'block';

        // Manual login button
        const loginButton = document.createElement('button');
        loginButton.textContent = 'Go to Login';
        loginButton.style.marginLeft = '15px';
        loginButton.style.padding = '5px 10px';
        loginButton.onclick = () => { window.location.href = '/login.html'; };
        statusElement.appendChild(loginButton);
    }
    // Hide all other content
    if (contentElement) {
        Array.from(contentElement.children).forEach(child => {
            if (child !== statusElement) child.style.display = 'none';
        });
    }
}

// --- Helper Function to Display Status Messages ---
function displayStatusMessage(message, type = 'info') {
    if (!statusElement) return;
    
    const colorMap = {
        'info': { text: '#31708F', bg: '#D9EDF7', border: '#31708F' },
        'success': { text: '#3C763D', bg: '#DFF0D8', border: '#3C763D' },
        'warning': { text: '#8A6D3B', bg: '#FCF8E3', border: '#8A6D3B' },
        'error': { text: '#D8000C', bg: '#FFD2D2', border: '#D8000C' }
    };
    
    const colors = colorMap[type] || colorMap.info;
    
    statusElement.textContent = message;
    statusElement.style.color = colors.text;
    statusElement.style.backgroundColor = colors.bg;
    statusElement.style.borderColor = colors.border;
    statusElement.style.display = 'block';
}

/**
 * Performs all necessary authentication and session checks for the expert dashboard.
 * @returns {Promise<{success: boolean, user?: object, secureSess?: object, error?: string}>}
 */
async function checkExpertAuthentication() {
    try {
        console.log('Expert Dashboard: Checking primary session...');
        const session = await authService.getSession();
        if (!session || !session.success || !session.user) {
            return { success: false, error: 'Primary authentication failed or session expired.' };
        }
        if (session.user.role !== 'expert') {
            return { success: false, error: `Access denied. Required role: expert, found: ${session.user.role || 'unknown'}` };
        }
        console.log('Expert Dashboard: Primary session OK.');

        console.log('Expert Dashboard: Checking secure session...');
        let secureSess = await loadSecureSession();
        if (!secureSess) {
            console.log('Expert Dashboard: No secure session found, creating one...');
            // No secure session found, create one
            try {
                secureSess = await createSecureSession(session.user);
                console.log('Expert Dashboard: Secure session created.');
            } catch (err) {
                console.error('Failed to create secure session:', err);
                return { success: false, error: 'Failed to initialize secure session.' };
            }
        } else {
            // Validate integrity of lattice data
            const computedHash = hashMetaLattice(secureSess.metaLatticeData);
            if (computedHash !== secureSess.hash) {
                console.warn('Expert Dashboard: Secure session integrity failed.');
                await clearSecureSession();
                
                // Try to recreate the secure session
                try {
                    secureSess = await createSecureSession(session.user);
                    console.log('Expert Dashboard: Secure session recreated after integrity failure.');
                } catch (err) {
                    return { success: false, error: 'Secure session integrity check failed and recreation failed.' };
                }
            }
        }
        console.log('Expert Dashboard: Secure session OK.');

        return { success: true, user: session.user, secureSess };
    } catch (err) {
        console.error('Expert Dashboard Auth Error:', err);
        const msg = err instanceof SyntaxError ? 'Session parsing error.' : 'Unexpected error during authentication.';
        return { success: false, error: msg };
    }
}

/**
 * Loads mock data for the expert dashboard
 * @returns {Promise<object>} Dashboard data
 */
async function loadDashboardData() {
    // In production, this would fetch from the API
    // For now, return mock data
    return {
        activeModules: 3,
        pendingReviews: 2,
        upcomingMentorships: 1,
        recentActivity: [
            { type: 'review', title: 'Reviewed "Introduction to Cognitive Psychology"', timestamp: '2025-04-22T15:30:00Z' },
            { type: 'module', title: 'Updated module "Advanced Research Methods"', timestamp: '2025-04-20T09:15:00Z' },
            { type: 'mentorship', title: 'Completed mentorship session with John Doe', timestamp: '2025-04-18T14:00:00Z' }
        ]
    };
}

/**
 * Renders activity feed from data
 * @param {Array} activities - Activity data
 */
function renderActivityFeed(activities) {
    if (!activityFeedEl || !activities || !activities.length) return;
    
    // Clear existing content
    activityFeedEl.innerHTML = '';
    
    // Add activity items
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        // Format date
        const date = new Date(activity.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        // Set icon based on activity type
        let icon = '📝'; // Default
        if (activity.type === 'review') icon = '🔍';
        if (activity.type === 'module') icon = '📚';
        if (activity.type === 'mentorship') icon = '👨‍🏫';
        
        // Set content
        activityItem.innerHTML = `
            <span class="activity-icon">${icon}</span>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-date">${formattedDate}</div>
            </div>
        `;
        
        activityFeedEl.appendChild(activityItem);
    });
}

/**
 * Initializes the dashboard UI after successful authentication.
 */
async function initDashboard() {
    // Display loading status
    displayStatusMessage('Loading dashboard...', 'info');
    
    const { success, user, secureSess, error } = await checkExpertAuthentication();
    if (!success) {
        displayAuthError(error);
        return;
    }

    try {
        // Load dashboard data
        const dashboardData = await loadDashboardData();

        // Populate user info
        if (greetingEl) greetingEl.textContent = `Welcome, ${user.name || 'Expert'}!`;
        if (userNameEl) userNameEl.textContent = user.name || '';
        if (userRoleEl) userRoleEl.textContent = user.role;

        // Display lattice/session info
        if (latticeInfoEl) latticeInfoEl.textContent = `Session ID: ${secureSess.sessionId}`;

        // Render tools list
        if (toolsListEl) {
            toolsListEl.innerHTML = ''; // Clear existing content
            EXPERT_TOOLS.forEach(tool => {
                const link = document.createElement('a');
                link.href = tool.href;
                link.textContent = tool.label;
                link.classList.add('tool-link');
                toolsListEl.appendChild(link);
            });
        }

        // Render activity feed
        if (dashboardData.recentActivity) {
            renderActivityFeed(dashboardData.recentActivity);
        }

        // Settings modal
        const settingsUI = new SettingsUI();
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => settingsUI.open());
        }

        // Logout behavior
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await clearSecureSession();
                await authService.logout();
                window.location.href = '/index.html';
            });
        }

        // Show main content, hide status
        if (statusElement) statusElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';
        
        console.log('Expert Dashboard: Initialization complete');
    } catch (err) {
        console.error('Error initializing dashboard:', err);
        displayAuthError('Failed to initialize dashboard: ' + (err.message || 'Unknown error'));
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);
