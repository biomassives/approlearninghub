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
/**
 * Performs authentication and role check for the researcher dashboard.
 * Displays errors directly on the page instead of redirecting.
 * @returns {Promise<boolean>} - True if authentication is successful and role matches, false otherwise.
 */
async function checkAuthenticationAndRole() {
    try {
        console.log("Researcher Dashboard: Checking authentication...");

        // 1. Primary Authentication Check (using authService's checkAccess)
        const authResult = await authService.checkAccess(); // Use checkAccess() here

        // Check if the primary authentication failed (e.g., invalid token, network error)
        if (!authResult || !authResult.success) {
            // Use the error message from authResult if available, otherwise provide a default
            const errorMessage = authResult?.error || "Authentication failed or session expired.";
            // The 'transient' flag indicates a network-like issue, maybe word it differently?
            const messagePrefix = authResult?.transient ? "Temporary Issue: " : "Error: ";
            throw new Error(messagePrefix + errorMessage);
        }

        // Check if user data (including role) is present after successful auth
        if (!authResult.user || !authResult.user.role) {
             console.error("Auth success but user data or role missing:", authResult);
             throw new Error("Authentication succeeded but user role information is missing.");
        }

        // Check if the role matches 'researcher'
        if (authResult.user.role !== 'researcher') {
            throw new Error(`Access Denied: Required role 'researcher', but found role '${authResult.user.role}'.`);
        }

        // 2. Secondary Secure Session Check (Optional - consider removing if checkAccess is sufficient)
        // console.log("Researcher Dashboard: Checking secure session...");
        // const secureSess = await loadSecureSession();
        // if (!secureSess || secureSess.role !== 'researcher') {
        //    console.warn("Secure session check failed or mismatch. Proceeding with primary auth.");
        // }

        console.log("Researcher Dashboard: Authentication successful for role 'researcher'.");
        // You might want to store the user info if needed later in the dashboard
        // authService.currentUser = authResult.user; // Or similar if authService doesn't handle this automatically
        return true; // Authenticated and role matches

    } catch (error) {
        console.error("Researcher Dashboard Auth Check Failed:", error);
        if (statusMessageElement) {
            // Display the error message caught
            statusMessageElement.textContent = `${error.message} `; // Display the full error message
            statusMessageElement.style.color = 'red';
            statusMessageElement.style.display = 'block'; // Make sure it's visible

            // Add a manual login button only if it's not already there
            if (!statusMessageElement.querySelector('button')) {
                const loginButton = document.createElement('button');
                loginButton.textContent = 'Go to Login';
                loginButton.style.marginLeft = '10px';
                loginButton.onclick = () => {
                    // Use safeRedirect if appropriate, or direct navigation if loop risk is low here
                    // authService.safeRedirect('/login.html'); // If safeRedirect is robust
                    window.location.href = '/login.html'; // Direct navigation
                };
                statusMessageElement.appendChild(loginButton);
            }
        }
        // Hide the main content container if auth fails
        if (container) {
            container.innerHTML = ''; // Clear any default content
            container.style.display = 'none';
        }
        return false; // Authentication failed or role mismatch
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