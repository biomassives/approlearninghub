// auth.js - Authentication management for Approvideo Hub

// Initialize Dexie.js database for local authentication
const db = new Dexie('ApprovideoHub');
db.version(1).stores({
  users: '++id, email, password, name, role, createdAt'
});

// Initialize Supabase client (you'll need to replace with your actual credentials)
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-supabase-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Auth configuration object
const authConfig = {
  // Default to local authentication using Dexie.js
  useSupabase: false,
  
  // Load config from localStorage if available
  loadConfig() {
    const savedConfig = localStorage.getItem('authConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      this.useSupabase = parsedConfig.useSupabase;
    }
    return this;
  },
  
  // Save config to localStorage
  saveConfig() {
    localStorage.setItem('authConfig', JSON.stringify({
      useSupabase: this.useSupabase
    }));
    return this;
  },
  
  // Toggle authentication method
  toggleAuthMethod(useSupabase) {
    this.useSupabase = useSupabase;
    this.saveConfig();
    return this;
  }
};

// Authentication service
const authService = {
  // Current user state
  currentUser: null,
  
  // Initialize auth service
  async init() {
    // Load auth configuration
    authConfig.loadConfig();
    
    // Try to restore session
    if (authConfig.useSupabase) {
      // Check for existing Supabase session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          this.currentUser = {
            id: userData.user.id,
            email: userData.user.email,
            name: userData.user.user_metadata.name || 'User',
            role: userData.user.user_metadata.role || 'user'
          };
        }
      }
    } else {
      // Check for local session
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    }
    
    // Update UI based on authentication state
    this.updateAuthUI();
  },
  
  // Register a new user
  async register(email, password, name, role = 'user') {
    try {
      if (authConfig.useSupabase) {
        // Register with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role }
          }
        });
        
        if (error) throw error;
        
        // Set current user if registration was successful
        if (data.user) {
          this.currentUser = {
            id: data.user.id,
            email: data.user.email,
            name,
            role
          };
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          this.updateAuthUI();
          return { success: true, user: this.currentUser };
        }
      } else {
        // Check if user already exists in local DB
        const existingUser = await db.users.where({ email }).first();
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
        
        // Add user to local database
        const userId = await db.users.add({
          email,
          // In a real app, you should hash the password
          password, 
          name,
          role,
          createdAt: new Date()
        });
        
        // Set current user
        this.currentUser = {
          id: userId,
          email,
          name,
          role
        };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.updateAuthUI();
        return { success: true, user: this.currentUser };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Login user
  async login(email, password) {
    try {
      if (authConfig.useSupabase) {
        // Login with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Set current user if login was successful
        if (data.user) {
          // Get user metadata
          const { data: userData } = await supabase.auth.getUser();
          
          this.currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: userData.user.user_metadata.name || 'User',
            role: userData.user.user_metadata.role || 'user'
          };
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          this.updateAuthUI();
          return { success: true, user: this.currentUser };
        }
      } else {
        // Find user in local database
        const user = await db.users.where({ email }).first();
        if (!user) {
          throw new Error('User not found');
        }
        
        // In a real app, you should properly compare hashed passwords
        if (user.password !== password) { 
          throw new Error('Invalid password');
        }
        
        // Set current user
        this.currentUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.updateAuthUI();
        return { success: true, user: this.currentUser };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Logout user
  async logout() {
    if (authConfig.useSupabase) {
      // Logout from Supabase
      await supabase.auth.signOut();
    }
    
    // Clear current user
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.updateAuthUI();
    return { success: true };
  },
  
  // Update UI based on authentication state
  updateAuthUI() {
    const isLoggedIn = !!this.currentUser;
    
    // Update top-right auth elements
    const authLoggedInTopRight = document.getElementById('auth-logged-in-top-right');
    const authLoggedOutTopRight = document.getElementById('auth-logged-out-top-right');
    const userNameTopRight = document.getElementById('user-name-top-right');
    
    // Update dashboard elements
    const dashboardLoggedIn = document.getElementById('dashboard-logged-in');
    const dashboardLoggedOut = document.getElementById('dashboard-logged-out');
    const dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    const roleBasedDashboardContent = document.getElementById('role-based-dashboard-content');
    
    // Update chat elements
    const chatContainer = document.getElementById('chat-container');
    
    if (isLoggedIn) {
      // User is logged in
      authLoggedOutTopRight.classList.add('hidden');
      authLoggedInTopRight.classList.remove('hidden');
      
      dashboardLoggedOut.classList.add('hidden');
      dashboardLoggedIn.classList.remove('hidden');
      
      // Set user name and role
      const userName = this.currentUser.name;
      const userRole = this.currentUser.role;
      
      if (userNameTopRight) {
        userNameTopRight.textContent = userName;
      }
      
      if (dashboardWelcomeMessage) {
        dashboardWelcomeMessage.textContent = `Welcome, ${userName}! (${userRole})`;
      }
      
      // Update role-based content
      if (roleBasedDashboardContent) {
        this.renderRoleBasedContent(roleBasedDashboardContent, userRole);
      }
      
      // Show chat for logged in users
      if (chatContainer) {
        chatContainer.classList.remove('hidden');
      }
    } else {
      // User is not logged in
      authLoggedInTopRight.classList.add('hidden');
      authLoggedOutTopRight.classList.remove('hidden');
      
      dashboardLoggedIn.classList.add('hidden');
      dashboardLoggedOut.classList.remove('hidden');
      
      // Hide chat for logged out users
      if (chatContainer) {
        chatContainer.classList.add('hidden');
      }
    }
  },
  
  // Render role-based content
  renderRoleBasedContent(container, role) {
    const roleContent = {
      'user': '<p>Welcome to your user dashboard. Explore learning modules and health clinics.</p>',
      'project leader': '<p>Project Leader Dashboard: Manage projects and team members.</p>',
      'expert mentor': '<p>Expert Mentor Dashboard: Guide and mentor learners.</p>',
      'research assistance': '<p>Research Assistant Dashboard: Contribute to research projects.</p>',
      'member of effected community': '<p>Community Member Dashboard: Access resources and community forums.</p>',
      'software admin': '<p>Software Admin Dashboard: System administration and user management.</p>',
      'default': '<p>Generic dashboard content for logged-in users.</p>'
    };
    
    let content = roleContent[role] || roleContent['default'];
    container.innerHTML = content;
  },
  
  // Get current authentication status
  isAuthenticated() {
    return !!this.currentUser;
  },
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
};

// Export objects for use in other scripts
window.authConfig = authConfig;
window.authService = authService;