// /public/js/auth-service.js

/**
 * Authentication service for handling user auth operations
 */
class AuthService {
    constructor() {
      this.apiBase = '/api/auth';
      this.currentUser = null;
      this.token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      this.redirectInProgress = false;
      this.lastAuthCheck = 0;
    }
  
    debugAuthState() {
        const authToken = localStorage.getItem('auth_token');
        const legacyToken = localStorage.getItem('token');
        const userInfo = localStorage.getItem('user_info');
        const userRole = localStorage.getItem('userRole');
        
        console.log('=== Auth State Debug ===');
        console.log('auth_token exists:', !!authToken);
        console.log('token exists:', !!legacyToken);
        console.log('user_info exists:', !!userInfo);
        console.log('userRole:', userRole);
        console.log('Current page:', window.location.pathname);
        console.log('this.token:', !!this.token);
        console.log('this.currentUser:', !!this.currentUser);
      }
      
   
      

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} role - User's role
 * @returns {Promise<Object>} - Response from signup API
 */
async signup(email, password, role) {
    try {
      console.log(`Signing up user with email: ${email}, role: ${role}`);
      
      const response = await fetch(`${this.apiBase}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });
  
      const data = await response.json();
      console.log('Signup response:', data.success ? 'Success' : 'Failed');
      
      if (data.success && data.user) {
        console.log('Signup successful, storing user data');
        
        // Store user data for immediate access
        this.currentUser = data.user;
        localStorage.setItem('userRole', data.user.role || role);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        
        // Store token if provided in BOTH locations for consistency
        if (data.token) {
          this.token = data.token;
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('token', data.token);
          console.log('Token stored in both localStorage locations');
        } else {
          console.warn('No token received from signup API');
        }
        
        // Store signup success info in sessionStorage with careful timing
        const now = Date.now();
        sessionStorage.setItem('signup_success', 'true');
        sessionStorage.setItem('signup_time', now.toString());
        sessionStorage.setItem('user_role', data.user.role || role);
        console.log('Signup success data stored in sessionStorage');
      }
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }



        
    // Add this to manage manual redirection after signup
    manualRedirectAfterSignup() {
        if (sessionStorage.getItem('signup_success') === 'true') {
          const lastAction = parseInt(sessionStorage.getItem('last_auth_action') || '0');
          const now = Date.now();
          
          // Only redirect if it's been at least 2 seconds since signup
          if (now - lastAction > 2000) {
            const role = sessionStorage.getItem('user_role') || 'resources';
            
            // Clear the signup flags
            sessionStorage.removeItem('signup_success');
            sessionStorage.removeItem('last_auth_action');
            sessionStorage.removeItem('user_role');
            
            // Build the redirect URL
            const dashboardRoutes = {
              expert: '/expert-dashboard.html',
              learner: '/learner-dashboard.html',
              researcher: '/researcher-dashboard.html',
              resources: '/resources-dashboard.html',
              organizer: '/organizer-dashboard.html'
            };
            
            const redirectUrl = dashboardRoutes[role] || '/dashboard.html';
            console.log(`Manual redirect to ${redirectUrl} with role ${role}`);
            
            // Perform the redirect
            this.safeRedirect(redirectUrl);
            return true;
          }
        }
        return false;
      }
  
    /**
     * Safely redirect to prevent loops
     * @param {string} url - URL to redirect to
     */
    safeRedirect(url) {
      // Don't redirect if already on this page
      if (window.location.pathname === url) {
        console.log(`Already on ${url}, no redirect needed`);
        return;
      }
      
      // Set redirect flag
      this.redirectInProgress = true;
      sessionStorage.setItem('last_redirect', Date.now().toString());
      
      // Perform redirect
      console.log(`Redirecting to: ${url}`);
      window.location.href = url;
    }
    
    /**
     * Check authentication and redirect if needed
     */
    checkAuthAndRedirect() {
      // Prevent running too frequently
      const now = Date.now();
      if (now - this.lastAuthCheck < 2000) {
        console.log('Auth check ran too recently, skipping');
        return;
      }
      this.lastAuthCheck = now;
      
      // Check for manual post-signup redirect first
      if (this.manualRedirectAfterSignup()) {
        return;
      }
      
      // Prevent redirect loops
      if (this.redirectInProgress) {
        console.log('Redirect already in progress, skipping auth check');
        return;
      }
      
      // Check for recent redirect
      const lastRedirect = sessionStorage.getItem('last_redirect');
      if (lastRedirect && (now - parseInt(lastRedirect)) < 10000) {
        console.log('Recent redirect detected, skipping auth check to prevent loop');
        return;
      }
      
      // Debug the current auth state
      this.debugAuthState();
      
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const currentPage = window.location.pathname;
      
      // If we have a token and we're on the login page, redirect to dashboard
      if (token && (
          currentPage.includes('login.html') || 
          currentPage === '/' || 
          currentPage.includes('signup')
        )) {
        // Get user role for proper dashboard redirection
        const userRole = this.getUserRole() || 'resources';
        const dashboardRoutes = {
          expert: '/expert-dashboard.html',
          learner: '/learner-dashboard.html',
          researcher: '/researcher-dashboard.html',
          resources: '/resources-dashboard.html',
          organizer: '/organizer-dashboard.html'
        };
        
        this.safeRedirect(dashboardRoutes[userRole] || '/dashboard.html');
        return;
      }
      
      // If we don't have a token and we're on a protected page, redirect to login
      if (!token && (
          currentPage.includes('dashboard') || 
          currentPage.includes('resources-dashboard')
        )) {
        this.safeRedirect('/login.html');
        return;
      }
    }
    
    
/**
 * Log in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Response from login API
 */
async login(email, password) {
    try {
      console.log(`Attempting login for email: ${email}`);
      
      const response = await fetch(`${this.apiBase}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
  
      const data = await response.json();
      console.log('Login response:', data.success ? 'Success' : 'Failed');
      
      // If login successful
      if (response.ok && data.success && data.token) {
        console.log('Login successful, saving token and user data');
        
        // Store the token in BOTH storage locations to ensure consistency
        this.token = data.token;
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('token', data.token);
        
        // If user info is included in the response, store it as well
        if (data.user) {
          this.currentUser = data.user;
          localStorage.setItem('user_info', JSON.stringify(data.user));
          localStorage.setItem('userRole', data.user.role || 'resources');
        }
        
        // Log that we've stored everything properly
        console.log('Auth token stored in both locations');
        console.log('User role set to:', data.user ? data.user.role : 'unknown');
        
        return data; // Return the full response for the login page to handle
      } else {
        // Handle login failure
        console.error('Login failed:', data.message || 'Unknown error');
        return data;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

    /**
     * Encrypt and store session data
     * @param {Object} user - User object
     * @param {string} token - Auth token
     * @returns {Promise<void>}
     */
    async encryptSession(user, token) {
      if (!window.SessionCrypto) return;
      
      try {
        const sessionData = {
          user: user,
          token: token,
          timestamp: new Date().getTime()
        };
        
        const encryptedSession = await window.SessionCrypto.encrypt(
          JSON.stringify(sessionData)
        );
        
        localStorage.setItem('encrypted_session', encryptedSession);
      } catch (error) {
        console.error('Session encryption error:', error);
      }
    }

    /**
     * Log out the current user
     * @returns {Promise<Object>} - Response from logout API
     */
    async logout() {
      try {
        // Send logout request - but don't let failure stop us
        try {
          const response = await fetch(`${this.apiBase}/logout`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
          });
          const data = await response.json();
        } catch (err) {
          console.warn('Error during logout request, continuing anyway', err);
        }
        
        // Always clear stored auth data regardless of server response
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user_info');
        localStorage.removeItem('encrypted_session');
        sessionStorage.removeItem('last_redirect');
        
        // Redirect to login page
        this.safeRedirect('/login.html');
        
        return { success: true };
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    }
  
    
/**
 * Check if user has valid access token
 * @returns {Promise<Object>} - Current user if valid, null otherwise
 */
async checkAccess() {
    // Get token from localStorage - try both storage keys
    const authToken = localStorage.getItem('auth_token');
    const legacyToken = localStorage.getItem('token');
    
    // Use whichever token exists, preferring auth_token
    const token = authToken || legacyToken;
    
    // Update the instance token to match what's in storage
    this.token = token;
    
    // No token means no valid access
    if (!token) {
      console.log('No token found in storage, access invalid');
      return { success: false };
    }
  
    try {
      console.log('Checking access with token:', token.substring(0, 10) + '...');
      
      // Make API request to validate token
      const response = await fetch(`${this.apiBase}/access-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
  
      // Parse the response
      const data = await response.json();
      
      if (data.success && data.user) {
        // Token is valid, update current user
        console.log('Token valid, user:', data.user.email);
        this.currentUser = data.user;
        
        // Ensure user info is stored
        localStorage.setItem('user_info', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.role);
        
        // Ensure both token storage locations have the same token
        if (authToken && !legacyToken) {
          localStorage.setItem('token', authToken);
        } else if (!authToken && legacyToken) {
          localStorage.setItem('auth_token', legacyToken);
        }
        
        return data;
      } else {
        // Invalid token response from server
        console.warn('Server rejected token as invalid');
        
        // Only clear tokens if the server explicitly says it's invalid
        // This prevents network errors from logging users out
        if (data.error === 'invalid_token' || data.error === 'token_expired') {
          this.token = null;
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
        }
        
        return { success: false };
      }
    } catch (error) {
      // Network or server error - don't clear tokens to prevent logout on temporary issues
      console.error('Access check error:', error);
      return { 
        success: false, 
        error: error.message,
        transient: true  // Flag to indicate this might be a temporary error
      };
    }
  }
  
    /**
     * Get auth headers including token if available
     * @returns {Object} - Headers object
     */
    getAuthHeaders() {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      return headers;
    }
  
    /**
     * Get current user
     * @returns {Object|null} - Current user object or null
     */
    getUser() {
      if (!this.currentUser && localStorage.getItem('user_info')) {
        try {
          this.currentUser = JSON.parse(localStorage.getItem('user_info'));
        } catch (e) {
          console.error('Error parsing stored user info:', e);
        }
      }
      return this.currentUser;
    }
  
    /**
     * Get current user role
     * @returns {string|null} - User role or null
     */
    getUserRole() {
      if (this.currentUser?.role) {
        return this.currentUser.role;
      }
      
      // Try to get from localStorage directly
      const role = localStorage.getItem('userRole');
      if (role) return role;
      
      // Try to parse from user_info
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          return user.role;
        } catch (e) {
          console.error('Error parsing user info for role:', e);
        }
      }
      
      return null;
    }
  
    /**
     * Check if user is logged in
     * @returns {boolean} - True if logged in
     */
    isLoggedIn() {
      return !!this.getUser() || !!this.token;
    }
}

// Create singleton instance
const authService = new AuthService();

// Initialize auth check on page load - but with a delay to prevent immediate redirects
document.addEventListener('DOMContentLoaded', () => {
  // Add a small delay to allow other scripts to initialize first
  setTimeout(() => {
    authService.checkAuthAndRedirect();
  }, 500);
});

// Export the singleton
export default authService;