// auth-token-manager.js
// This implements a strict token management system to prevent inconsistencies

class AuthTokenManager {
    constructor() {
      this.TOKEN_KEY = 'auth_token';
      this.LEGACY_TOKEN_KEY = 'token';
      this.USER_INFO_KEY = 'user_info';
      this.ROLE_KEY = 'userRole';
      this.LAST_VERIFY_KEY = 'last_token_verify';
      this.REDIRECT_TRACK_KEY = 'auth_redirects';
      this.VERIFICATION_COOLDOWN = 5000; // 5 seconds between verifications
    }
    
    /**
     * Set the auth token, ensuring consistency across storage
     * @param {string} token - The auth token to store
     * @returns {boolean} - Success status
     */
    setToken(token) {
      if (!token) {
        console.error('Attempted to set empty token');
        return false;
      }
      
      try {
        // Store in both locations for consistency
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.LEGACY_TOKEN_KEY, token);
        console.log('Token successfully set in both storage locations');
        
        // Update last verify timestamp to prevent immediate verification
        localStorage.setItem(this.LAST_VERIFY_KEY, Date.now().toString());
        
        return true;
      } catch (error) {
        console.error('Error setting token:', error);
        return false;
      }
    }
    
    /**
     * Get the current auth token
     * @returns {string|null} - The current token or null
     */
    getToken() {
      // Try primary token first
      const primaryToken = localStorage.getItem(this.TOKEN_KEY);
      
      // If it exists, return it
      if (primaryToken) {
        return primaryToken;
      }
      
      // Try legacy token as fallback
      const legacyToken = localStorage.getItem(this.LEGACY_TOKEN_KEY);
      if (legacyToken) {
        // Sync to primary location if only legacy exists
        this.setToken(legacyToken);
        return legacyToken;
      }
      
      return null;
    }
    
    /**
     * Set user info
     * @param {Object} user - User object
     * @returns {boolean} - Success status
     */
    setUserInfo(user) {
      if (!user) {
        console.error('Attempted to set empty user info');
        return false;
      }
      
      try {
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(user));
        
        // Also set role for easy access
        if (user.role) {
          localStorage.setItem(this.ROLE_KEY, user.role);
        }
        
        return true;
      } catch (error) {
        console.error('Error setting user info:', error);
        return false;
      }
    }
    
    /**
     * Get user info
     * @returns {Object|null} - User object or null
     */
    getUserInfo() {
      const userInfoStr = localStorage.getItem(this.USER_INFO_KEY);
      
      if (!userInfoStr) {
        return null;
      }
      
      try {
        return JSON.parse(userInfoStr);
      } catch (error) {
        console.error('Error parsing user info:', error);
        return null;
      }
    }
    
    /**
     * Get user role
     * @returns {string|null} - User role or null
     */
    getUserRole() {
      // Try from dedicated role storage first
      const role = localStorage.getItem(this.ROLE_KEY);
      if (role) {
        return role;
      }
      
      // Try from user info as fallback
      const user = this.getUserInfo();
      return user?.role || null;
    }
    
    /**
     * Clear all auth data
     */
    clearAuth() {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.LEGACY_TOKEN_KEY);
      localStorage.removeItem(this.USER_INFO_KEY);
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.LAST_VERIFY_KEY);
      localStorage.removeItem(this.REDIRECT_TRACK_KEY);
      
      console.log('All auth data cleared');
    }
    
    /**
     * Check if token verification is allowed (prevents rapid checks)
     * @returns {boolean} - True if verification is allowed
     */
    canVerifyToken() {
      const lastVerify = parseInt(localStorage.getItem(this.LAST_VERIFY_KEY) || '0');
      const now = Date.now();
      
      return (now - lastVerify) >= this.VERIFICATION_COOLDOWN;
    }
    
    /**
     * Update last verify timestamp
     */
    updateVerifyTimestamp() {
      localStorage.setItem(this.LAST_VERIFY_KEY, Date.now().toString());
    }
    
    /**
     * Track a redirect to prevent loops
     * @param {string} destination - Destination URL
     * @returns {boolean} - True if redirect is allowed
     */
    trackRedirect(destination) {
      try {
        const now = Date.now();
        let redirects = [];
        
        // Get existing redirect history
        const redirectsStr = localStorage.getItem(this.REDIRECT_TRACK_KEY);
        if (redirectsStr) {
          redirects = JSON.parse(redirectsStr);
          
          // Clean up old redirects (older than 10 seconds)
          redirects = redirects.filter(r => (now - r.time) < 10000);
        }
        
        // Check for loops - if the last 2 redirects are to the same places back and forth
        if (redirects.length >= 2) {
          const lastTwo = redirects.slice(-2);
          if (lastTwo[0].to === destination && lastTwo[1].from === destination) {
            console.error('Redirect loop detected! Blocking redirect to:', destination);
            return false;
          }
        }
        
        // Check if we've had more than 3 redirects in the last 10 seconds
        if (redirects.length >= 3) {
          console.error('Too many redirects in short period! Blocking redirect to:', destination);
          return false;
        }
        
        // Add this redirect to history
        redirects.push({
          from: window.location.pathname,
          to: destination,
          time: now
        });
        
        // Store updated history
        localStorage.setItem(this.REDIRECT_TRACK_KEY, JSON.stringify(redirects));
        
        return true;
      } catch (error) {
        console.error('Error tracking redirect:', error);
        return false;
      }
    }
    
    /**
     * Check if we're currently in a redirect loop
     * @returns {boolean} - True if in a redirect loop
     */
    inRedirectLoop() {
      try {
        const redirectsStr = localStorage.getItem(this.REDIRECT_TRACK_KEY);
        if (!redirectsStr) {
          return false;
        }
        
        const redirects = JSON.parse(redirectsStr);
        const now = Date.now();
        
        // Filter recent redirects (last 10 seconds)
        const recentRedirects = redirects.filter(r => (now - r.time) < 10000);
        
        // Check for rapid redirects (more than 3 in 10 seconds)
        if (recentRedirects.length >= 3) {
          return true;
        }
        
        // Check for back-and-forth pattern
        if (recentRedirects.length >= 4) {
          const paths = recentRedirects.map(r => r.to);
          const uniquePaths = new Set(paths);
          
          // If we have 4+ redirects but only 2 unique destinations, it's a loop
          if (uniquePaths.size <= 2) {
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error checking redirect loop:', error);
        return false;
      }
    }
  }
  
  // Create singleton instance
  const tokenManager = new AuthTokenManager();
  
  // Export the singleton
  export default tokenManager;