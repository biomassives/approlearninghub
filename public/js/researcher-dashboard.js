// js/researcher-dashboard.js

// Import necessary services - IMPORTANT: Include authService for primary check
import authService from './auth-service.js';
import { loadSecureSession, clearSecureSession } from './session-crypto.js';

// --- HTML Elements ---
// Ensure these elements exist in your researcher-dashboard.html
const container = document.getElementById('research-feed');
// Add a dedicated element in your HTML to show status/error messages:
const statusMessageElement = document.getElementById('researcher-dashboard-status');

/**
 * Performs authentication and role check for the researcher dashboard.
 * Displays errors directly on the page instead of redirecting.
 * @returns {Promise<boolean>} - True if authentication is successful, false otherwise.
 */
async function checkAuthenticationAndRole() {
    try {
        console.log("Researcher Dashboard: Checking authentication...");

        // 1. Primary Authentication Check (using authService)
        // Replace verifyToken with getSession or checkAccess if more appropriate
        const primaryAuth = await authService.verifyToken(); // Checks token validity and gets role

        if (!primaryAuth || !primaryAuth.success) {
            throw new Error("Authentication failed or session expired.");
        }

        if (primaryAuth.role !== 'researcher') {
            throw new Error(`Access Denied: Required role 'researcher', but found role '${primaryAuth.role}'.`);
        }

        // 2. Secondary Secure Session Check (Optional - re-evaluate if needed)
        // If you keep this, consider if failure should block access or just be a warning
        // console.log("Researcher Dashboard: Checking secure session...");
        // const secureSess = await loadSecureSession();
        // if (!secureSess || secureSess.role !== 'researcher') {
        //    console.warn("Secure session check failed or mismatch. Proceeding with primary auth.");
        //    // Decide how critical this is. Maybe just log it?
        //    // throw new Error("Secure session validation failed."); // Uncomment to make it a hard failure
        // }

        console.log("Researcher Dashboard: Authentication successful.");
        return true; // Authenticated

    } catch (error) {
        console.error("Researcher Dashboard Auth Check Failed:", error);
        if (statusMessageElement) {
            statusMessageElement.textContent = `Error: ${error.message || 'Authentication failed.'} `;
            statusMessageElement.style.color = 'red';
            statusMessageElement.style.display = 'block'; // Make sure it's visible

            // Add a manual login button
            const loginButton = document.createElement('button');
            loginButton.textContent = 'Go to Login';
            loginButton.style.marginLeft = '10px';
            loginButton.onclick = () => { window.location.href = '/login.html'; };
            statusMessageElement.appendChild(loginButton);
        }
        // Hide the main content container if auth fails
        if (container) {
            container.innerHTML = ''; // Clear any default content
            container.style.display = 'none';
        }
        return false; // Authentication failed
    }
}

async function initResearcherDashboard() {
    // First, check authentication. The function now handles error display.
    const isAuthenticated = await checkAuthenticationAndRole();

    if (!isAuthenticated) {
        return; // Stop initialization if authentication failed
    }

    // --- Authentication Successful ---
    // Clear any previous error messages and ensure container is visible
    if (statusMessageElement) statusMessageElement.style.display = 'none';
    if (container) container.style.display = 'block';

    container.textContent = 'Loading research tasks...';

    try {
        // TODO: Fetch research contributions via API and populate
        // Example: Use fetch with authService headers if your API is protected
        // const headers = authService.getAuthHeaders(); // Get { 'Authorization': 'Bearer ...', 'Content-Type': ... }
        // const response = await fetch('/api/researcher/contributions', { headers });
        // if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        // const data = await response.json();
        // Populate 'container' with data...

        // Placeholder if no tasks found after fetch:
         container.textContent = 'No research tasks available at this time.';

    } catch (error) {
        console.error("Failed to load research tasks:", error);
        container.textContent = 'Error loading research tasks. Please try again later.';
        // Optionally show a less severe error in the status element
        if (statusMessageElement) {
             statusMessageElement.textContent = 'Warning: Could not load tasks.';
             statusMessageElement.style.color = 'orange';
             statusMessageElement.style.display = 'block';
        }
    }
}

// Add the status message element to your researcher-dashboard.html:
// <div id="researcher-dashboard-status" style="display: none; color: red; padding: 10px; border: 1px solid red; margin-bottom: 15px;"></div>
// <div id="research-feed"> ... </div>

document.addEventListener('DOMContentLoaded', initResearcherDashboard);