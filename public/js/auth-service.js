// js/auth-service.js
/**
 * Authentication Service
 * Handles all authentication operations and session management
 */

// Simulated user data (replace with Supabase implementation later)
const MOCK_USERS = [
    {
      id: '1001',
      name: 'Dr. Jane Smith',
      email: 'jane.smith@example.com',
      role: 'expert',
      specialization: 'Cognitive Development'
    },
    {
      id: '1002',
      name: 'Prof. Robert Chen',
      email: 'robert.chen@example.com',
      role: 'expert',
      specialization: 'Educational Technology'
    }
  ];
  
  class AuthService {
    constructor() {
      this.currentUser = null;
      this.sessionKey = 'approvideo_session';
      this.initFromStorage();
    }
  
    /**
     * Initialize service from browser storage if available
     */
    initFromStorage() {
      try {
        const savedSession = localStorage.getItem(this.sessionKey);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.user && parsed.expires > Date.now()) {
            this.currentUser = parsed.user;
            console.log('Session restored from storage');
          } else {
            this.clearSession();
            console.log('Stored session expired or invalid');
          }
        }
      } catch (err) {
        console.error('Error restoring session:', err);
        this.clearSession();
      }
    }
  
    /**
     * Get current session information
     * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
     */
    async getSession() {
      // For now, return the local session
      if (this.currentUser) {
        return {
          success: true,
          user: this.currentUser,
          error: null
        };
      }
  
      // If we have no local session, attempt to refresh from storage
      // This would be where an API refresh token check would go in production
      this.initFromStorage();
      
      if (this.currentUser) {
        return {
          success: true,
          user: this.currentUser,
          error: null
        };
      }
  
      return {
        success: false,
        user: null,
        error: 'No active session found'
      };
    }
  
    /**
     * Login with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
     */
    async login(email, password) {
      // Simulate server authentication
      // In production, this would call Supabase or your auth endpoint
      return new Promise(resolve => {
        setTimeout(() => {
          // Simple mock authentication
          const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
          
          if (user) {
            // Store in memory
            this.currentUser = user;
            
            // Store in localStorage (with expiration)
            const expiresIn = 24 * 60 * 60 * 1000; // 24 hours
            const session = {
              user,
              expires: Date.now() + expiresIn
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            resolve({
              success: true,
              user,
              error: null
            });
          } else {
            resolve({
              success: false,
              user: null,
              error: 'Invalid credentials'
            });
          }
        }, 500); // Simulate network delay
      });
    }
  
    /**
     * Logout the current user
     * @returns {Promise<{success: boolean}>}
     */
    async logout() {
      this.clearSession();
      return { success: true };
    }
  
    /**
     * Clear all session data
     */
    clearSession() {
      this.currentUser = null;
      localStorage.removeItem(this.sessionKey);
    }
  }
  
  // Create and export a singleton instance
  const authService = new AuthService();
  export default authService;
  