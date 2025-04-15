// auth-service.js
// Client-side authentication service with role-based dashboard access support

class AuthService {
  constructor() {
    this.apiBase = '/api/auth';
    this.latticeKey = this.generateLatticeKey();
    this.token = localStorage.getItem('authToken');
    this.userData = JSON.parse(localStorage.getItem('userData') || '{}');
    this.accessibleDashboards = JSON.parse(localStorage.getItem('userDashboards') || '[]');
    this.permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
  }

  // Generate a secure lattice key
  generateLatticeKey() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Apply lattice security to data before sending
  secureLatticeData(data) {
    const secured = {};
    for (const key in data) {
      if (typeof data[key] === 'string') {
        secured[key] = btoa(data[key] + this.latticeKey);
      }
    }
    return secured;
  }

  // Get authentication headers for API requests
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Login with email and password
  async login(email, password) {
    try {
      // Apply lattice security
      const securedData = this.secureLatticeData({
        email,
        password
      });
      
      const response = await fetch(`${this.apiBase}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(securedData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.token) {
        // Store auth data
        this.token = data.token;
        localStorage.setItem('authToken', data.token);
        
        // Store user data
        this.userData = {
          id: data.user.id,
          email: data.user.email,
          role: data.role,
          lastLogin: new Date().toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(this.userData));
        
        // Store accessible dashboards
        this.accessibleDashboards = data.dashboards || [];
        localStorage.setItem('userDashboards', JSON.stringify(this.accessibleDashboards));
        
        // Store permissions
        this.permissions = data.permissions || {};
        localStorage.setItem('userPermissions', JSON.stringify(this.permissions));
        
        return { 
          success: true, 
          user: this.userData,
          dashboards: this.accessibleDashboards,
          permissions: this.permissions
        };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  }

  // Verify current auth token
  async verifyToken() {
    if (!this.token) {
      return { success: false, message: 'No authentication token found' };
    }
    
    try {
      const response = await fetch(`${this.apiBase}/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        // Clear invalid token
        if (response.status === 401) {
          this.logout(false); // Silent logout (no API call)
        }
        return { success: false, message: 'Invalid or expired token' };
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update user role in case it changed
        this.userData = {
          ...this.userData,
          role: data.role
        };
        localStorage.setItem('userData', JSON.stringify(this.userData));
        
        return { success: true, user: data.user, role: data.role };
      } else {
        return { success: false, message: data.message || 'Token verification failed' };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false, message: error.message };
    }
  }

  // Logout user
  async logout(callApi = true) {
    try {
      // Call logout API if requested and token exists
      if (callApi && this.token) {
        await fetch(`${this.apiBase}/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        }).catch(err => console.error('Logout API error:', err));
      }
      
      // Clear all auth data regardless of API call result
      this.token = null;
      this.userData = {};
      this.accessibleDashboards = [];
      this.permissions = {};
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('userDashboards');
      localStorage.removeItem('userPermissions');
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message };
    }
  }

  // Get user data with role and permissions
  async getUserData() {
    if (!this.token) {
      return { success: false, message: 'Not authenticated' };
    }
    
    try {
      const response = await fetch(`${this.apiBase}/user-data`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.logout(false); // Silent logout
        }
        return { success: false, message: 'Failed to get user data' };
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update stored user data
        this.userData = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          lastLogin: new Date().toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(this.userData));
        
        // Update accessible dashboards
        this.accessibleDashboards = data.user.dashboards || [];
        localStorage.setItem('userDashboards', JSON.stringify(this.accessibleDashboards));
        
        // Update permissions
        this.permissions = data.user.permissions || {};
        localStorage.setItem('userPermissions', JSON.stringify(this.permissions));
        
        return { 
          success: true, 
          user: data.user 
        };
      } else {
        return { success: false, message: data.message || 'Failed to get user data' };
      }
    } catch (error) {
      console.error('Get user data error:', error);
      return { success: false, message: error.message };
    }
  }

  // Check if user has access to a specific dashboard or resource
  async checkAccess(resource, requiredRole = null) {
    if (!this.token) {
      return { success: false, hasAccess: false, message: 'Not authenticated' };
    }
    
    try {
      const response = await fetch(`${this.apiBase}/access-check`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ resource, requiredRole })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.logout(false); // Silent logout
        }
        return { success: false, hasAccess: false, message: 'Access check failed' };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        hasAccess: data.hasAccess,
        userRole: data.userRole,
        resource: data.resource
      };
    } catch (error) {
      console.error('Access check error:', error);
      return
