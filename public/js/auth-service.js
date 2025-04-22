// auth-service.js - Rewritten with improved token handling and redirect prevention

import tokenManager from './auth-token-manager.js';

/**
 * Authentication service for handling user auth operations
 */
class AuthService {
  constructor() {
    this.apiBase = '/api/auth';
    this.currentUser = null;
    this.token = tokenManager.getToken();
    this.lastAuthCheck = 0;
    this.redirectInProgress = false;
    this.MIN_AUTH_CHECK_INTERVAL = 3000; // 3 seconds between auth checks
  }
  
  debugAuthState() {
    const authToken = tokenManager.getToken();
    const userInfo = tokenManager.getUserInfo();
    const userRole = tokenManager.getUserRole();
    
    console.log('=== Auth State Debug ===');
    console.log('auth_token exists:', !!authToken);
    console.log('user_info exists:', !!userInfo);
    console.log('userRole:', userRole);
    console.log('Current page:', window.location.pathname);
    console.log('this.token:', !!this.token);
    console.log('this.currentUser:', !!this.currentUser);
  }
  
  /**
   * Safely redirect to prevent loops
   * @param {string} url - URL to redirect to
   * @returns {boolean} - Success status
   */
  safeRedirect(url) {
    // Don't redirect if already on this page
    if (window.location.pathname === url) {
      console.log(`Already on ${url}, no redirect needed`);
      return false;
    }
    
    // Check if we're in a redirect loop
    if (tokenManager.inRedirectLoop()) {
      console.error('Redirect loop detected, blocking redirect to:', url);
      
      // Show warning to user
      this.showRedirectBlockedWarning(url);
      return false;
    }
    
    // Track this redirect to detect loops
    if (!tokenManager.trackRedirect(url)) {
      console.error('Redirect tracking prevented redirect to:', url);
      
      // Show warning to user
      this.showRedirectBlockedWarning(url);
      return false;
    }
    
    // Set redirect flag
    this.redirectInProgress = true;
    
    // Perform redirect
    console.log(`Redirecting to: ${url}`);
    window.location.href = url;
    return true;
  }
  
  /**
   * Show warning when redirect is blocked
   * @param {string} url - Blocked URL
   */
  showRedirectBlockedWarning(url) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 4px;
      z-index: 10000;
      max-width: 300px;
      font-family: sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    warning.innerHTML = `
      <div style="margin-bottom: 10px;"><strong>Redirect Loop Prevented</strong></div>
      <div>Too many redirects detected. Navigation to ${url} was blocked.</div>
      <div style="margin-top: 10px;">
        <a href="${url}" style="color: white; text-decoration: underline;">Click here to go there manually</a>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Remove after 10 seconds
    setTimeout(() => {
      try {
        document.body.removeChild(warning);
      } catch (e) {
        // Element might already be removed
      }
    }, 10000);
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
      console.log('Signup response success:', data.success);
      
      if (data.success && data.user) {
        // Store user data
        this.currentUser = data.user;
        tokenManager.setUserInfo(data.user);
        
        // Store token if provided
        if (data.token) {
          this.token = data.token;
          tokenManager.setToken(data.token);
          console.log('Token stored after signup');
        } else {
          console.warn('No token received from signup API');
        }
        
        // Store signup info in sessionStorage
        sessionStorage.setItem('signup_success', 'true');
        sessionStorage.setItem('last_auth_action', Date.now().toString());
        sessionStorage.setItem('user_role', data.user.role || role);
      }
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
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
      console.log('Login response success:', data.success);
      
      // If login successful
      if (response.ok && data.success) {
        // Store token securely
        if (data.token) {
          this.token = data.token;
          tokenManager.setToken(data.token);
          console.log('Token stored after login');
        } else {
          console.warn('No token received from login API');
        }
        
        // If user info is included in the response, store it as well
        if (data.user) {
          this.currentUser = data.user;
          tokenManager.setUserInfo(data.user);
        }
        
        return data;
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
   * Log out the current user
   * @returns {Promise<Object>} - Response from logout API
   */
  async logout() {
    try {
      // Try to send logout request, but continue even if it fails
      try {
        const response = await fetch(`${this.apiBase}/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
        const data = await response.json();
      } catch (err) {
        console.warn('Error during logout request, continuing anyway', err);
      }
      
      // Clear stored auth data
      this.currentUser = null;
      this.token = null;
      tokenManager.clearAuth();
      
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
    // Get fresh token from manager
    const token = tokenManager.getToken();
    this.token = token;
    
    if (!token) {
      console.log('No token found, access invalid');
      return { success: false };
    }
    
    // Check if we can verify token (prevent rapid checks)
    if (!tokenManager.canVerifyToken()) {
      console.log('Token verification on cooldown, skipping check');
      
      // Return cached user if available
      const cachedUser = tokenManager.getUserInfo();
      if (cachedUser) {
        this.currentUser = cachedUser;
        return { success: true, user: cachedUser };
      }
      
      return { success: false, error: 'verification_cooldown' };
    }

    try {
      console.log('Verifying token with server');
      tokenManager.updateVerifyTimestamp();
      
      const response = await fetch(`${this.apiBase}/access-check`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        console.log('Token verified successfully');
        this.currentUser = data.user;
        tokenManager.setUserInfo(data.user);
        return data;
      } else {
        console.warn('Token verification failed');
        
        // Only clear token if explicitly invalid
        if (data.error === 'invalid_token' || data.error === 'token_expired') {
          this.token = null;
          tokenManager.clearAuth();
        }
        
        return { success: false };
      }
    } catch (error) {
      console.error('Access check error:', error);
      
      // Don't clear token on network errors
      return { 
        success: false, 
        error: error.message,
        transient: true
      };
    }
  }
  
  /**
   * Check authentication and redirect if needed
   */
  checkAuthAndRedirect() {
    // Prevent running too frequently
    const now = Date.now();
    if (now - this.lastAuthCheck < this.MIN_AUTH_CHECK_INTERVAL) {
      console.log('Auth check ran too recently, skipping');
      return;
    }
    this.lastAuthCheck = now;
    
    // Prevent concurrent auth checks
    if (this.redirectInProgress) {
      console.log('Redirect already in progress, skipping auth check');
      return;
    }
    
    // Debug the current auth state
    this.debugAuthState();
    
    const token = tokenManager.getToken();
    const currentPage = window.location.pathname;
    
    // If we have a token and we're on the login page, redirect to dashboard
    if (token && (
        currentPage.includes('login.html') || 
        currentPage === '/' || 
        currentPage.includes('signup')
      )) {
      
      // Get user role for proper dashboard redirection
      const userRole = tokenManager.getUserRole() || 'resources';
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
   * Get auth headers including token if available
   * @returns {Object} - Headers object
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Use fresh token from manager
    const token = tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  /**
   * Get current user
   * @returns {Object|null} - Current user object or null
   */
  getUser() {
    if (!this.currentUser) {
      this.currentUser = tokenManager.getUserInfo();
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
    return tokenManager.getUserRole();
  }
  
  /**
   * Check if user is logged in
   * @returns {boolean} - True if logged in
   */
  isLoggedIn() {
    return !!this.getUser() || !!tokenManager.getToken();
  }
}

// Create singleton instance
const authService = new AuthService();

// Export the singleton
export default authService;