// js/expert-dashboard.js
// Unified Expert Dashboard Entry Point (Refactored for Robust Auth)
import authService from './auth-service.js';
import { loadSecureSession, hashMetaLattice, clearSecureSession } from './session-crypto.js';
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
  { label: 'Assigned Modules',     href: '/expert/modules.html' },
  { label: 'Expert Reviews',       href: '/expert/reviews.html' },
  { label: 'Research Library',      href: '/library/categories' },
  { label: 'Mentorship Requests',   href: '/expert/mentorship.html' }
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
        const secureSess = await loadSecureSession();
        if (!secureSess) {
            return { success: false, error: 'Secure session missing or expired.' };
        }
        // Validate integrity of lattice data
        const computedHash = hashMetaLattice(secureSess.metaLatticeData);
        if (computedHash !== secureSess.hash) {
            console.warn('Expert Dashboard: Secure session integrity failed.');
            await clearSecureSession();
            return { success: false, error: 'Secure session integrity check failed.' };
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
 * Initializes the dashboard UI after successful authentication.
 */
async function initDashboard() {
    const { success, user, secureSess, error } = await checkExpertAuthentication();
    if (!success) {
        displayAuthError(error);
        return;
    }

    // Populate user info
    if (greetingEl) greetingEl.textContent = `Welcome, ${user.name || 'Expert'}!`;
    if (userNameEl) userNameEl.textContent = user.name || '';
    if (userRoleEl) userRoleEl.textContent = user.role;

    // Display lattice/session info
    if (latticeInfoEl) latticeInfoEl.textContent = `Session ID: ${secureSess.sessionId}`;

    // Render tools list
    if (toolsListEl) {
        EXPERT_TOOLS.forEach(tool => {
            const link = document.createElement('a');
            link.href = tool.href;
            link.textContent = tool.label;
            link.classList.add('tool-link');
            toolsListEl.appendChild(link);
        });
    }

    // Optional activity feed
    if (activityFeedEl && secureSess.activityFeed) activityFeedEl.textContent = secureSess.activityFeed;

    // Settings modal
    const settingsUI = new SettingsUI();
    settingsBtn && settingsBtn.addEventListener('click', () => settingsUI.open());

    // Logout behavior
    logoutBtn && logoutBtn.addEventListener('click', async () => {
        await clearSecureSession();
        await authService.logout();
        window.location.href = '/login.html';
    });

    // Show main content, hide status
    statusElement && (statusElement.style.display = 'none');
    contentElement && (contentElement.style.display = 'block');
}

document.addEventListener('DOMContentLoaded', initDashboard);
