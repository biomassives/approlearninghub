// /public/js/auth-service.js

/**
 * Authentication service for handling user auth operations
 */
class AuthService {
    constructor() {
      this.apiBase = '/api/auth';
      this.currentUser = null;
      this.token = localStorage.getItem('token');
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
          
          // Store token if provided
          if (data.token) {
            this.token = data.token;
            localStorage.setItem('token', data.token);
          }
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
        console.log(`Logging in user with email: ${email}`);
        const response = await fetch(`${this.apiBase}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
  
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success && data.user) {
          // Store user data in memory
          this.currentUser = data.user;
          localStorage.setItem('userRole', data.user.role);
          
          // If token is provided, store it
          if (data.token) {
            this.token = data.token;
            localStorage.setItem('token', data.token);
          }
        }
        
        return data;
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
        const response = await fetch(`${this.apiBase}/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
  
        const data = await response.json();
        
        // Clear stored auth data
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        
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
  
  // Create and export singleton instance
  const authService = new AuthService();
  export default authService;