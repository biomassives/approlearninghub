// /public/js/auth-service.js

/**
 * Authentication service for handling user auth operations
 */
class AuthService {
    constructor() {
      this.apiBase = '/api/auth';
      this.currentUser = null;
      this.token = localStorage.getItem('auth_token') || localStorage.getItem('token');
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
        console.log('Signup response:', data);
        
        if (data.success && data.user) {
            // Store user data for immediate access
            this.currentUser = data.user;
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('user_info', JSON.stringify(data.user));
            
            // Store token if provided in BOTH locations for compatibility
            if (data.token) {
              this.token = data.token;
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('token', data.token);
              console.log('Tokens stored in localStorage');
            }
            
            // Prevent immediate redirect to avoid loops
            sessionStorage.setItem('signup_success', 'true');
            sessionStorage.setItem('last_auth_action', Date.now().toString());
            sessionStorage.setItem('user_role', data.user.role || 'resources');
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
        window.location.href = redirectUrl;
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check authentication and redirect if needed
   */
  checkAuthAndRedirect() {
    // Check for manual post-signup redirect first
    if (this.manualRedirectAfterSignup()) {
      return;
    }
    
    // Debug the current auth state
    this.debugAuthState();
    
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const currentPage = window.location.pathname;
    
    // Anti-loop mechanism
    const lastRedirect = sessionStorage.getItem('last_redirect');
    const currentTime = Date.now();
    
    // Don't redirect if we've already redirected in the last 5 seconds
    if (lastRedirect && (currentTime - parseInt(lastRedirect)) < 5000) {
      console.log('Preventing redirect loop - too soon since last redirect');
      return;
    }
    
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
      
      // Track this redirect to prevent loops
      sessionStorage.setItem('last_redirect', currentTime.toString());
      
      // Log the redirection happening
      console.log(`Redirecting to ${dashboardRoutes[userRole] || '/dashboard.html'} with role ${userRole}`);
      
      // Perform the redirect
      window.location.href = dashboardRoutes[userRole] || '/dashboard.html';
      return;
    }
    
    // If we don't have a token and we're on a protected page, redirect to login
    if (!token && (
        currentPage.includes('dashboard') || 
        currentPage.includes('resources-dashboard')
      )) {
      // Track this redirect to prevent loops
      sessionStorage.setItem('last_redirect', currentTime.toString());
      
      console.log('No authentication token, redirecting to login page');
      window.location.href = '/login.html';
      return;
    }
  }
  
  /**
   * Debug the current authentication state
   * This helps identify why redirection is happening
   */
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
    console.log('=== End Auth Debug ===');
  }


  
    /**
     * Log in an existing user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<Object>} - Response from login API
     */
    async login(email, password) {
      try {
        const response = await fetch(`${this.apiBase}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
    
        const data = await response.json();
        
        // If login successful
        if (response.ok && data.success) {
          // Store the token securely
          this.token = data.token;
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('token', data.token); // For backward compatibility
          
          // If user info is included in the response, store it as well
          if (data.user) {
            this.currentUser = data.user;
            localStorage.setItem('user_info', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.role);
          }
          
          // Encrypt session data if SessionCrypto is available
          if (window.SessionCrypto && data.user) {
            this.encryptSession(data.user, data.token);
          }
          
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
        const response = await fetch(`${this.apiBase}/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
  
        const data = await response.json();
        
        // Clear stored auth data
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user_info');
        localStorage.removeItem('encrypted_session');
        
        // Redirect to login page
        window.location.href = '/login.html';
        
        return data;
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
      if (!this.token) {
        return { success: false };
      }
  
      try {
        const response = await fetch(`${this.apiBase}/access-check`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
        });
  
        const data = await response.json();
        
        if (data.success && data.user) {
          this.currentUser = data.user;
          return data;
        } else {
          // Clear invalid token
          this.token = null;
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
          return { success: false };
        }
      } catch (error) {
        console.error('Access check error:', error);
        return { success: false, error: error.message };
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
      return this.currentUser;
    }
  
    /**
     * Get current user role
     * @returns {string|null} - User role or null
     */
    getUserRole() {
      return this.currentUser?.role || localStorage.getItem('userRole');
    }
  
    /**
     * Check if user is logged in
     * @returns {boolean} - True if logged in
     */
    isLoggedIn() {
      return !!this.currentUser || !!this.token;
    }
}

// Create singleton instance
const authService = new AuthService();

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', () => {
  authService.checkAuthAndRedirect();
});

// Export the singleton
export default authService;