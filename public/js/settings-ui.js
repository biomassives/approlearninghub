// settings-ui.js
// ApproVideo Hub Settings UI Module
// Provides a class-based approach for user settings management
// that can be integrated with expert and facilitator dashboards.
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

/**
 * SettingsUI class to handle user settings interface and operations
 */
class SettingsUI {
    /**
     * Initialize the Settings UI module
     * @param {Object} options - Configuration options for the Settings UI
     */
    constructor(options = {}) {
      // Default options
      this.options = {
        containerId: 'settings-container',
        modalId: 'settings-modal',
        onSave: null,
        onCancel: null,
        onSessionInvalidated: null,
        enabledSections: ['profile', 'security', 'notifications', 'language', 'appearance'],
        ...options
      };
      
      // State management
      this.state = {
        isOpen: false,
        isDirty: false,
        currentTab: 'profile',
        originalSettings: null,
        currentSettings: null,
        sessionData: null,
        loading: true,
        error: null
      };
      
      // Bind methods
      this.open = this.open.bind(this);
      this.close = this.close.bind(this);
      this.toggle = this.toggle.bind(this);
      this.render = this.render.bind(this);
      this.saveSettings = this.saveSettings.bind(this);
      this.loadSettings = this.loadSettings.bind(this);
      this.switchTab = this.switchTab.bind(this);
      this.handleInputChange = this.handleInputChange.bind(this);
      this.invalidateOtherSessions = this.invalidateOtherSessions.bind(this);
      this.handleTwoFactorToggle = this.handleTwoFactorToggle.bind(this);
      this.verifyLatticeIntegrity = this.verifyLatticeIntegrity.bind(this);
      
      // Create DOM references
      this.container = null;
      this.modal = null;
      
      // Initialize
      this.init();
    }
    
    /**
     * Initialize the settings UI
     */
    async init() {
      // Create container if it doesn't exist
      if (!document.getElementById(this.options.containerId)) {
        this.container = document.createElement('div');
        this.container.id = this.options.containerId;
        document.body.appendChild(this.container);
      } else {
        this.container = document.getElementById(this.options.containerId);
      }
      
      // Load session data
      try {
        // Import session-crypto (dynamically to avoid circular dependencies)
        const { loadSecureSession, hashMetaLattice } = await import('./session-crypto.js');
        
        const session = await loadSecureSession();
        if (!session) {
          this.state.error = 'No active session found';
          this.state.loading = false;
          return;
        }
        this.state.sessionData = session;
        
        // Load user settings
        await this.loadSettings();
      } catch (error) {
        console.error('Settings initialization error:', error);
        this.state.error = error.message || 'Failed to initialize settings';
        this.state.loading = false;
      }
      
      // Add event listener for ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.state.isOpen) {
          this.close();
        }
      });
      
      // Initial render (hidden)
      this.render();
    }
    
    /**
     * Load user settings from the server
     */
    async loadSettings() {
      this.state.loading = true;
      this.render();
      
      try {
        const { sessionData } = this.state;
        if (!sessionData || !sessionData.token) {
          throw new Error('Invalid session data');
        }
        
        // Fetch user settings from the server
        const response = await fetch('/api/user/settings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          // If API fails, use default settings
          console.warn('Failed to load settings from server, using defaults');
          this.initializeDefaultSettings();
          return;
        }
        
        const settings = await response.json();
        
        // Default settings if some are missing
        const defaultSettings = this.getDefaultSettings();
        
        // Merge with defaults
        const mergedSettings = {
          profile: { ...defaultSettings.profile, ...(settings.profile || {}) },
          notifications: { ...defaultSettings.notifications, ...(settings.notifications || {}) },
          security: { ...defaultSettings.security, ...(settings.security || {}) },
          language: { ...defaultSettings.language, ...(settings.language || {}) },
          appearance: { ...defaultSettings.appearance, ...(settings.appearance || {}) }
        };
        
        // Store the settings
        this.state.originalSettings = JSON.parse(JSON.stringify(mergedSettings)); // Deep clone
        this.state.currentSettings = mergedSettings;
        this.state.loading = false;
        this.render();
      } catch (error) {
        console.error('Error loading settings:', error);
        this.state.error = error.message || 'Failed to load settings';
        this.state.loading = false;
        
        // Initialize default settings on error
        this.initializeDefaultSettings();
      }
    }
    
    /**
     * Initialize default settings when API fails
     */
    initializeDefaultSettings() {
      const defaultSettings = this.getDefaultSettings();
      this.state.originalSettings = JSON.parse(JSON.stringify(defaultSettings));
      this.state.currentSettings = defaultSettings;
      this.state.loading = false;
      this.render();
    }
    
    /**
     * Get default settings object
     * @returns {Object} Default settings
     */
    getDefaultSettings() {
      // Get browser language and other defaults
      const browserLang = navigator.language.slice(0, 2);
      const savedLang = localStorage.getItem('preferredLang');
      const preferredLang = savedLang || browserLang || 'en';
      
      // Get preferred color scheme
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDarkMode ? 'dark' : 'light';
      
      // Get display name from session if available
      const displayName = this.state.sessionData?.email?.split('@')[0] || 'User';
      
      return {
        profile: {
          displayName: displayName,
          bio: '',
          expertise: [],
          showPublicProfile: true
        },
        notifications: {
          email: true,
          browser: true,
          clinicReminders: true,
          contentUpdates: true,
          mentionAlerts: true
        },
        security: {
          twoFactorEnabled: false,
          sessionTimeout: 24, // hours
          notifyOnLogin: true,
          alertOnNewDevice: true
        },
        language: {
          preferred: preferredLang,
          contentTranslation: true
        },
        appearance: {
          theme: theme,
          fontSize: 'medium',
          highContrast: false,
          reducedMotion: false
        }
      };
    }
    
    /**
     * Save user settings to the server
     */
    async saveSettings() {
      this.state.loading = true;
      this.render();
      
      try {
        const { sessionData, currentSettings } = this.state;
        if (!sessionData || !sessionData.token) {
          throw new Error('Invalid session data');
        }
        
        // Send settings to the server
        const response = await fetch('/api/user/settings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(currentSettings)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to save settings');
        }
        
        // Update original settings after successful save
        this.state.originalSettings = JSON.parse(JSON.stringify(currentSettings));
        this.state.isDirty = false;
        this.state.loading = false;
        
        // Call onSave callback if provided
        if (typeof this.options.onSave === 'function') {
          this.options.onSave(currentSettings);
        }
        
        // Show success message
        this.showMessage('success', 'Settings saved successfully');
        this.render();
        
        // Apply immediate settings changes
        this.applySettings(currentSettings);
        
      } catch (error) {
        console.error('Error saving settings:', error);
        this.state.error = error.message || 'Failed to save settings';
        this.state.loading = false;
        
        // Show error message
        this.showMessage('error', this.state.error);
        this.render();
      }
    }
    
    /**
     * Apply settings changes immediately where possible
     * @param {Object} settings - The settings to apply
     */
    applySettings(settings) {
      // Apply language preference
      if (settings.language?.preferred) {
        localStorage.setItem('preferredLang', settings.language.preferred);
      }
      
      // Apply theme changes
      if (settings.appearance?.theme) {
        document.documentElement.setAttribute('data-theme', settings.appearance.theme);
        localStorage.setItem('theme', settings.appearance.theme);
      }
      
      // Apply font size
      if (settings.appearance?.fontSize) {
        document.documentElement.setAttribute('data-font-size', settings.appearance.fontSize);
        localStorage.setItem('fontSize', settings.appearance.fontSize);
      }
      
      // Apply high contrast mode
      if (settings.appearance?.highContrast) {
        document.documentElement.classList.toggle('high-contrast', settings.appearance.highContrast);
        localStorage.setItem('highContrast', settings.appearance.highContrast);
      }
      
      // Apply reduced motion
      if (settings.appearance?.reducedMotion) {
        document.documentElement.classList.toggle('reduced-motion', settings.appearance.reducedMotion);
        localStorage.setItem('reducedMotion', settings.appearance.reducedMotion);
      }
    }
    
    /**
     * Show a temporary message in the settings UI
     * @param {string} type - Message type ('success', 'error', 'info', 'warning')
     * @param {string} text - Message text
     */
    showMessage(type, text) {
      if (!this.modal) return;
      
      const messageContainer = this.modal.querySelector('.settings-message');
      if (!messageContainer) return;
      
      // Clear existing messages
      messageContainer.innerHTML = '';
      
      // Create message element
      const message = document.createElement('div');
      message.className = `settings-message-${type}`;
      message.textContent = text;
      
      // Add to container
      messageContainer.appendChild(message);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (messageContainer.contains(message)) {
          message.remove();
        }
      }, 5000);
    }
    
    /**
     * Switch to a different settings tab
     * @param {string} tab - Tab identifier
     */
    switchTab(tab) {
      // Only switch if tab is different and is in enabled sections
      if (tab !== this.state.currentTab && this.options.enabledSections.includes(tab)) {
        this.state.currentTab = tab;
        this.render();
      }
    }
    
    /**
     * Handle input changes and update state
     * @param {Event} e - Input change event
     */
    handleInputChange(e) {
      const target = e.target;
      const name = target.name;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      
      // Parse the name to determine section and field
      const [section, field] = name.split('.');
      
      if (section && field && this.state.currentSettings[section]) {
        // Update the setting
        this.state.currentSettings[section][field] = value;
        
        // Mark as dirty (changed from original)
        this.state.isDirty = JSON.stringify(this.state.currentSettings) !== JSON.stringify(this.state.originalSettings);
        
        // Rerender
        this.render();
      }
    }
    
    /**
     * Invalidate all other active sessions for this user
     */
    async invalidateOtherSessions() {
      if (!confirm('Are you sure you want to log out all other devices? This will require those devices to log in again.')) {
        return;
      }
      
      this.state.loading = true;
      this.render();
      
      try {
        const { sessionData } = this.state;
        if (!sessionData || !sessionData.token) {
          throw new Error('Invalid session data');
        }
        
        // Call the API to invalidate other sessions
        const response = await fetch('/api/auth/invalidate-other-sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to invalidate other sessions');
        }
        
        // Show success message
        this.showMessage('success', 'All other sessions have been logged out');
        
        // Call onSessionInvalidated callback if provided
        if (typeof this.options.onSessionInvalidated === 'function') {
          this.options.onSessionInvalidated();
        }
      } catch (error) {
        console.error('Error invalidating sessions:', error);
        this.showMessage('error', error.message || 'Failed to invalidate other sessions');
      } finally {
        this.state.loading = false;
        this.render();
      }
    }
    
    /**
     * Handle two-factor authentication toggle
     * @param {boolean} enable - Whether to enable or disable 2FA
     */
    async handleTwoFactorToggle(enable) {
      this.state.loading = true;
      this.render();
      
      try {
        const { sessionData } = this.state;
        if (!sessionData || !sessionData.token) {
          throw new Error('Invalid session data');
        }
        
        // This would typically open a modal flow for 2FA setup/removal
        // For this implementation, we'll simulate the process
        
        if (enable) {
          // In a real app, this would generate a QR code and verification flow
          this.showMessage('info', 'Two-factor authentication setup would start here');
          
          // Set the current setting to reflect the change
          this.state.currentSettings.security.twoFactorEnabled = true;
        } else {
          // In a real app, this would require verification before disabling
          this.showMessage('warning', 'Two-factor authentication has been disabled');
          
          // Set the current setting to reflect the change
          this.state.currentSettings.security.twoFactorEnabled = false;
        }
        
        // Mark as dirty
        this.state.isDirty = JSON.stringify(this.state.currentSettings) !== JSON.stringify(this.state.originalSettings);
      } catch (error) {
        console.error('Error handling 2FA:', error);
        this.showMessage('error', error.message || 'Failed to update two-factor authentication');
      } finally {
        this.state.loading = false;
        this.render();
      }
    }
    
    /**
     * Verify the integrity of the lattice security
     */
    async verifyLatticeIntegrity() {
      try {
        const { sessionData } = this.state;
        if (!sessionData || !sessionData.metaLattice || !sessionData.latticeHash) {
          throw new Error('Invalid session data for verification');
        }
        
        // Import hashMetaLattice function
        const { hashMetaLattice } = await import('./session-crypto.js');
        
        const recomputedHash = await hashMetaLattice(sessionData.metaLattice);
        const isValid = recomputedHash === sessionData.latticeHash;
        
        if (isValid) {
          this.showMessage('success', 'Lattice verification successful ✅');
        } else {
          this.showMessage('error', 'Lattice verification failed! Session may be compromised ⚠️');
          // In a real app, you might want to invalidate the session here
        }
        
        return isValid;
      } catch (error) {
        console.error('Error verifying lattice:', error);
        this.showMessage('error', error.message || 'Failed to verify session security');
        return false;
      }
    }
    
    /**
     * Open the settings modal
     */
    open() {
      this.state.isOpen = true;
      this.render();
      
      // Add body class to prevent scrolling
      document.body.classList.add('settings-modal-open');
    }
    
    /**
     * Close the settings modal
     */
    close() {
      // Check if there are unsaved changes
      if (this.state.isDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to close settings?')) {
          return;
        }
        
        // Reset to original settings
        this.state.currentSettings = JSON.parse(JSON.stringify(this.state.originalSettings));
        this.state.isDirty = false;
      }
      
      this.state.isOpen = false;
      this.render();
      
      // Remove body class
      document.body.classList.remove('settings-modal-open');
      
      // Call onCancel callback if provided
      if (typeof this.options.onCancel === 'function') {
        this.options.onCancel();
      }
    }
    
    /**
     * Toggle the settings modal
     */
    toggle() {
      if (this.state.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
    
    /**
     * Render the settings UI
     */
    render() {
      const { isOpen, loading, error, currentTab, currentSettings, isDirty, sessionData } = this.state;
      
      // Create modal if it doesn't exist
      if (!this.modal) {
        this.modal = document.createElement('div');
        this.modal.id = this.options.modalId;
        this.modal.className = 'settings-modal';
        this.container.appendChild(this.modal);
        
        // Add initial CSS
        const style = document.createElement('style');
        style.textContent = `
          .settings-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            overflow-y: auto;
            padding: 20px;
          }
          
          .settings-modal-open {
            overflow: hidden;
          }
          
          .settings-content {
            background-color: white;
            margin: 0 auto;
            max-width: 900px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            height: calc(100vh - 40px);
            overflow: hidden;
          }
          
          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .settings-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #111827;
            margin: 0;
          }
          
          .settings-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
          }
          
          .settings-body {
            display: flex;
            flex: 1;
            overflow: hidden;
          }
          
          .settings-sidebar {
            width: 220px;
            border-right: 1px solid #e5e7eb;
            padding: 16px 0;
            overflow-y: auto;
          }
          
          .settings-nav {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .settings-nav-item {
            margin: 4px 0;
          }
          
          .settings-nav-link {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            color: #4b5563;
            text-decoration: none;
            border-left: 3px solid transparent;
            cursor: pointer;
          }
          
          .settings-nav-link:hover {
            background-color: #f3f4f6;
          }
          
          .settings-nav-link.active {
            background-color: #eff6ff;
            color: #2563eb;
            border-left-color: #2563eb;
            font-weight: 500;
          }
          
          .settings-nav-icon {
            margin-right: 12px;
            width: 20px;
            height: 20px;
          }
          
          .settings-main {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
          }
          
          .settings-section {
            display: none;
          }
          
          .settings-section.active {
            display: block;
          }
          
          .settings-section-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 16px;
            color: #111827;
          }
          
          .settings-section-description {
            color: #6b7280;
            margin-bottom: 24px;
          }
          
          .settings-form-group {
            margin-bottom: 20px;
          }
          
          .settings-label {
            display: block;
            font-weight: 500;
            margin-bottom: 6px;
            color: #374151;
          }
          
          .settings-input,
          .settings-select,
          .settings-textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.875rem;
          }
          
          .settings-input:focus,
          .settings-select:focus,
          .settings-textarea:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
          }
          
          .settings-checkbox-group {
            display: flex;
            align-items: center;
          }
          
          .settings-checkbox {
            margin-right: 8px;
          }
          
          .settings-help-text {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 4px;
          }
          
          .settings-footer {
            display: flex;
            justify-content: flex-end;
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            background-color: #f9fafb;
          }
          
          .settings-btn {
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
          }
          
          .settings-btn-primary {
            background-color: #2563eb;
            color: white;
            border: none;
          }
          
          .settings-btn-primary:hover {
            background-color: #1d4ed8;
          }
          
          .settings-btn-primary:disabled {
            background-color: #93c5fd;
            cursor: not-allowed;
          }
          
          .settings-btn-secondary {
            background-color: white;
            color: #4b5563;
            border: 1px solid #d1d5db;
            margin-right: 12px;
          }
          
          .settings-btn-secondary:hover {
            background-color: #f3f4f6;
          }
          
          .settings-btn-danger {
            background-color: #ef4444;
            color: white;
            border: none;
          }
          
          .settings-btn-danger:hover {
            background-color: #dc2626;
          }
          
          .settings-message {
            margin-bottom: 16px;
          }
          
          .settings-message-success {
            background-color: #d1fae5;
            color: #065f46;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #10b981;
          }
          
          .settings-message-error {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #ef4444;
          }
          
          .settings-message-info {
            background-color: #dbeafe;
            color: #1e40af;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #3b82f6;
          }
          
          .settings-message-warning {
            background-color: #fffbeb;
            color: #92400e;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #f59e0b;
          }
          
          .settings-divider {
            margin: 24px 0;
            border: none;
            border-top: 1px solid #e5e7eb;
          }
          
          .settings-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 16px;
            background-color: #f9fafb;
          }
          
          .settings-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
          }
          
          .settings-spinner {
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 3px solid #2563eb;
            width: 24px;
            height: 24px;
            animation: settings-spin 1s linear infinite;
            margin-right: 8px;
          }
          
          @keyframes settings-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .settings-error {
            color: #991b1b;
            background-color: #fee2e2;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            text-align: center;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .settings-body {
              flex-direction: column;
            }
            
            .settings-sidebar {
              width: 100%;
              border-right: none;
              border-bottom: 1px solid #e5e7eb;
              padding: 0;
            }
            
            .settings-nav {
              display: flex;
              overflow-x: auto;
              white-space: nowrap;
            }
            
            .settings-nav-item {
              margin: 0;
            }
            
            .settings-nav-link {
              padding: 12px 16px;
              border-left: none;
              border-bottom: 3px solid transparent;
            }
            
            .settings-nav-link.active {
              border-left-color: transparent;
              border-bottom-color: #2563eb;
            }
            
            .settings-nav-icon {
              display: none;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Update visibility
      this.modal.style.display = isOpen ? 'block' : 'none';
      
      // Early return if not open
      if (!isOpen) return;
      
      // Main content render
      this.modal.innerHTML = `
        <div class="settings-content">
          <div class="settings-header">
            <h2 class="settings-title">User Settings</h2>
            <button class="settings-close" aria-label="Close Settings">&times;</button>
          </div>
          
          <div class="settings-message"></div>
          
          ${loading ? `
            <div class="settings-loading">
              <div class="settings-spinner"></div>
              <span>Loading settings...</span>
            </div>
          ` : error ? `
            <div class="settings-error">
              ${error}
              <button class="settings-btn settings-btn-primary" style="margin-top: 12px;" id="retry-settings-btn">Try Again</button>
            </div>
          ` : `
            <div class="settings-body">
              <!-- Settings sidebar navigation -->
              <div class="settings-sidebar">
                <ul class="settings-nav">
                  ${this.options.enabledSections.includes('profile') ? `
                    <li class="settings-nav-item">
                      <a class="settings-nav-link ${currentTab === 'profile' ? 'active' : ''}" data-tab="profile">
                        <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </a>
                    </li>
                  ` : ''}
                  
                  ${this.options.enabledSections.includes('security') ? `
                    <li class="settings-nav-item">
                      <a class="settings-nav-link ${currentTab === 'security' ? 'active' : ''}" data-tab="security">
                        <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Security
                      </a>
                    </li>
                  ` : ''}
                  
                  ${this.options.enabledSections.includes('notifications') ? `
                    <li class="settings-nav-item">
                      <a class="settings-nav-link ${currentTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
                        <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notifications
                      </a>
                    </li>
                  ` : ''}
                  
                  ${this.options.enabledSections.includes('language') ? `
                    <li class="settings-nav-item">
                      <a class="settings-nav-link ${currentTab === 'language' ? 'active' : ''}" data-tab="language">
                        <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Language
                      </a>
                    </li>
                  ` : ''}
                  
                  ${this.options.enabledSections.includes('appearance') ? `
                    <li class="settings-nav-item">
                      <a class="settings-nav-link ${currentTab === 'appearance' ? 'active' : ''}" data-tab="appearance">
                        <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        Appearance
                      </a>
                    </li>
                  ` : ''}
                  
                  <!-- Account Danger Zone -->
                  <li class="settings-nav-item" style="margin-top: auto;">
                    <a class="settings-nav-link ${currentTab === 'danger' ? 'active' : ''}" data-tab="danger">
                      <svg class="settings-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #ef4444;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Account
                    </a>
                  </li>
                </ul>
              </div>
              
              <!-- Settings main content area -->
              <div class="settings-main">
                <!-- Profile Section -->
                <div class="settings-section ${currentTab === 'profile' ? 'active' : ''}">
                  <h3 class="settings-section-title">Profile Settings</h3>
                  <p class="settings-section-description">Customize how others see you on ApproVideo Hub.</p>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="profile.displayName">Display Name</label>
                    <input 
                      type="text" 
                      id="profile.displayName" 
                      name="profile.displayName" 
                      class="settings-input" 
                      value="${currentSettings?.profile?.displayName || ''}"
                    >
                    <p class="settings-help-text">This is how your name will appear in comments, workshops, and throughout the platform.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="profile.bio">Bio</label>
                    <textarea 
                      id="profile.bio" 
                      name="profile.bio" 
                      class="settings-textarea" 
                      rows="4"
                    >${currentSettings?.profile?.bio || ''}</textarea>
                    <p class="settings-help-text">Share a brief description about yourself and your expertise.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-label">Areas of Expertise</label>
                    <div class="settings-card">
                      <p>Select your areas of expertise to help users find your content and workshops.</p>
                      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 12px;">
                        <label class="settings-checkbox-group">
                          <input type="checkbox" class="settings-checkbox" name="expertise" value="water" ${currentSettings?.profile?.expertise?.includes('water') ? 'checked' : ''}>
                          Water Management
                        </label>
                        <label class="settings-checkbox-group">
                          <input type="checkbox" class="settings-checkbox" name="expertise" value="energy" ${currentSettings?.profile?.expertise?.includes('energy') ? 'checked' : ''}>
                          Renewable Energy
                        </label>
                        <label class="settings-checkbox-group">
                          <input type="checkbox" class="settings-checkbox" name="expertise" value="agriculture" ${currentSettings?.profile?.expertise?.includes('agriculture') ? 'checked' : ''}>
                          Sustainable Agriculture
                        </label>
                        <label class="settings-checkbox-group">
                          <input type="checkbox" class="settings-checkbox" name="expertise" value="waste" ${currentSettings?.profile?.expertise?.includes('waste') ? 'checked' : ''}>
                          Waste Management
                        </label>
                        <label class="settings-checkbox-group">
                          <input type="checkbox" class="settings-checkbox" name="expertise" value="construction" ${currentSettings?.profile?.expertise?.includes('construction') ? 'checked' : ''}>
                          Green Construction
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="profile.showPublicProfile" 
                        name="profile.showPublicProfile" 
                        class="settings-checkbox" 
                        ${currentSettings?.profile?.showPublicProfile ? 'checked' : ''}
                      >
                      Show my profile publicly
                    </label>
                    <p class="settings-help-text">When enabled, other users can view your profile and contributions.</p>
                  </div>
                </div>
                
                <!-- Security Section -->
                <div class="settings-section ${currentTab === 'security' ? 'active' : ''}">
                  <h3 class="settings-section-title">Security Settings</h3>
                  <p class="settings-section-description">Manage your account security and session preferences.</p>
                  
                  <div class="settings-card">
                    <h4 style="margin-top: 0; font-size: 1rem;">Lattice Security Status</h4>
                    <p style="color: #4b5563; font-size: 0.875rem;">
                      Your account is protected by our Lattice Security system, providing enhanced protection against unauthorized access.
                    </p>
                    
                    <div style="display: flex; align-items: center; margin-top: 12px;">
                      <div style="background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; font-size: 0.875rem;">
                        <svg class="settings-nav-icon" style="width: 16px; height: 16px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Lattice Protected
                      </div>
                      <button id="verify-lattice-btn" class="settings-btn settings-btn-secondary" style="margin-left: 12px; font-size: 0.75rem;">Verify Now</button>
                    </div>
                  </div>
                  
                  <hr class="settings-divider">
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="security.twoFactorEnabled">Two-Factor Authentication</label>
                    <div class="settings-card">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <p style="margin-top: 0; font-weight: 500;">
                            ${currentSettings?.security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p style="color: #4b5563; font-size: 0.875rem; margin-bottom: 0;">
                            Two-factor authentication adds an additional layer of security to your account.
                          </p>
                        </div>
                        <button class="settings-btn ${currentSettings?.security?.twoFactorEnabled ? 'settings-btn-danger' : 'settings-btn-primary'}" id="toggle-2fa-btn">
                          ${currentSettings?.security?.twoFactorEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="security.sessionTimeout">Session Timeout</label>
                    <select 
                      id="security.sessionTimeout" 
                      name="security.sessionTimeout" 
                      class="settings-select"
                    >
                      <option value="4" ${currentSettings?.security?.sessionTimeout === 4 ? 'selected' : ''}>4 hours</option>
                      <option value="8" ${currentSettings?.security?.sessionTimeout === 8 ? 'selected' : ''}>8 hours</option>
                      <option value="24" ${currentSettings?.security?.sessionTimeout === 24 ? 'selected' : ''}>24 hours</option>
                      <option value="168" ${currentSettings?.security?.sessionTimeout === 168 ? 'selected' : ''}>7 days</option>
                    </select>
                    <p class="settings-help-text">How long until your login session expires due to inactivity.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="security.notifyOnLogin" 
                        name="security.notifyOnLogin" 
                        class="settings-checkbox" 
                        ${currentSettings?.security?.notifyOnLogin ? 'checked' : ''}
                      >
                      Email me when a new login occurs
                    </label>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="security.alertOnNewDevice" 
                        name="security.alertOnNewDevice" 
                        class="settings-checkbox" 
                        ${currentSettings?.security?.alertOnNewDevice ? 'checked' : ''}
                      >
                      Alert me when my account is accessed from a new device
                    </label>
                  </div>
                  
                  <hr class="settings-divider">
                  
                  <h4>Active Sessions</h4>
                  <p style="color: #4b5563; font-size: 0.875rem;">
                    Manage devices and browsers where you're currently logged in.
                  </p>
                  
                  <div class="settings-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <p style="margin-top: 0; font-weight: 500;">Current Session</p>
                        <p style="color: #4b5563; font-size: 0.75rem; margin-bottom: 0;">
                          This device • ${new Date(sessionData?.created || Date.now()).toLocaleString()}
                        </p>
                      </div>
                      <div style="background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
                        Active
                      </div>
                    </div>
                  </div>
                  
                  <button id="invalidate-sessions-btn" class="settings-btn settings-btn-secondary" style="margin-top: 12px;">
                    Sign Out From All Other Devices
                  </button>
                </div>
                
                <!-- Notifications Section -->
                <div class="settings-section ${currentTab === 'notifications' ? 'active' : ''}">
                  <h3 class="settings-section-title">Notification Preferences</h3>
                  <p class="settings-section-description">Control how and when you receive notifications.</p>
                  
                  <div class="settings-form-group">
                    <label class="settings-label">Notification Methods</label>
                    <div class="settings-card">
                      <label class="settings-checkbox-group">
                        <input 
                          type="checkbox" 
                          id="notifications.email" 
                          name="notifications.email" 
                          class="settings-checkbox" 
                          ${currentSettings?.notifications?.email ? 'checked' : ''}
                        >
                        Email Notifications
                      </label>
                      
                      <label class="settings-checkbox-group" style="margin-top: 8px;">
                        <input 
                          type="checkbox" 
                          id="notifications.browser" 
                          name="notifications.browser" 
                          class="settings-checkbox" 
                          ${currentSettings?.notifications?.browser ? 'checked' : ''}
                        >
                        Browser Notifications
                      </label>
                    </div>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-label">Notification Categories</label>
                    
                    <div class="settings-card">
                      <label class="settings-checkbox-group">
                        <input 
                          type="checkbox" 
                          id="notifications.clinicReminders" 
                          name="notifications.clinicReminders" 
                          class="settings-checkbox" 
                          ${currentSettings?.notifications?.clinicReminders ? 'checked' : ''}
                        >
                        Clinic & Workshop Reminders
                      </label>
                      
                      <p class="settings-help-text">Receive reminders for upcoming clinics you're scheduled to lead or attend.</p>
                    </div>
                    
                    <div class="settings-card" style="margin-top: 12px;">
                      <label class="settings-checkbox-group">
                        <input 
                          type="checkbox" 
                          id="notifications.contentUpdates" 
                          name="notifications.contentUpdates" 
                          class="settings-checkbox" 
                          ${currentSettings?.notifications?.contentUpdates ? 'checked' : ''}
                        >
                        Content Updates
                      </label>
                      
                      <p class="settings-help-text">Get notified when content you've created receives comments or is updated by others.</p>
                    </div>
                    
                    <div class="settings-card" style="margin-top: 12px;">
                      <label class="settings-checkbox-group">
                        <input 
                          type="checkbox" 
                          id="notifications.mentionAlerts" 
                          name="notifications.mentionAlerts" 
                          class="settings-checkbox" 
                          ${currentSettings?.notifications?.mentionAlerts ? 'checked' : ''}
                        >
                        Mention Alerts
                      </label>
                      
                      <p class="settings-help-text">Receive alerts when someone mentions you in comments or discussions.</p>
                    </div>
                  </div>
                </div>
                
                <!-- Language Section -->
                <div class="settings-section ${currentTab === 'language' ? 'active' : ''}">
                  <h3 class="settings-section-title">Language Settings</h3>
                  <p class="settings-section-description">Choose your preferred language and translation options.</p>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="language.preferred">Preferred Language</label>
                    <select 
                      id="language.preferred" 
                      name="language.preferred" 
                      class="settings-select"
                    >
                      <option value="en" ${currentSettings?.language?.preferred === 'en' ? 'selected' : ''}>English</option>
                      <option value="fr" ${currentSettings?.language?.preferred === 'fr' ? 'selected' : ''}>Français</option>
                      <option value="es" ${currentSettings?.language?.preferred === 'es' ? 'selected' : ''}>Español</option>
                      <option value="de" ${currentSettings?.language?.preferred === 'de' ? 'selected' : ''}>Deutsch</option>
                      <option value="hi" ${currentSettings?.language?.preferred === 'hi' ? 'selected' : ''}>हिंदी</option>
                      <option value="bn" ${currentSettings?.language?.preferred === 'bn' ? 'selected' : ''}>বাংলা</option>
                      <option value="sw" ${currentSettings?.language?.preferred === 'sw' ? 'selected' : ''}>Kiswahili</option>
                    </select>
                    <p class="settings-help-text">This will change the language across the entire platform.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="language.contentTranslation" 
                        name="language.contentTranslation" 
                        class="settings-checkbox" 
                        ${currentSettings?.language?.contentTranslation ? 'checked' : ''}
                      >
                      Enable automatic content translation
                    </label>
                    <p class="settings-help-text">When enabled, content in other languages will be automatically translated to your preferred language.</p>
                  </div>
                </div>
                
                <!-- Appearance Section -->
                <div class="settings-section ${currentTab === 'appearance' ? 'active' : ''}">
                  <h3 class="settings-section-title">Appearance Settings</h3>
                  <p class="settings-section-description">Customize how ApproVideo Hub looks for you.</p>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="appearance.theme">Theme</label>
                    <select 
                      id="appearance.theme" 
                      name="appearance.theme" 
                      class="settings-select"
                    >
                      <option value="system" ${currentSettings?.appearance?.theme === 'system' ? 'selected' : ''}>System Default</option>
                      <option value="light" ${currentSettings?.appearance?.theme === 'light' ? 'selected' : ''}>Light Mode</option>
                      <option value="dark" ${currentSettings?.appearance?.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                    </select>
                    <p class="settings-help-text">Choose between light, dark, or system default theme.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-label" for="appearance.fontSize">Font Size</label>
                    <select 
                      id="appearance.fontSize" 
                      name="appearance.fontSize" 
                      class="settings-select"
                    >
                      <option value="small" ${currentSettings?.appearance?.fontSize === 'small' ? 'selected' : ''}>Small</option>
                      <option value="medium" ${currentSettings?.appearance?.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                      <option value="large" ${currentSettings?.appearance?.fontSize === 'large' ? 'selected' : ''}>Large</option>
                    </select>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="appearance.highContrast" 
                        name="appearance.highContrast" 
                        class="settings-checkbox" 
                        ${currentSettings?.appearance?.highContrast ? 'checked' : ''}
                      >
                      High contrast mode
                    </label>
                    <p class="settings-help-text">Increases contrast for better readability.</p>
                  </div>
                  
                  <div class="settings-form-group">
                    <label class="settings-checkbox-group">
                      <input 
                        type="checkbox" 
                        id="appearance.reducedMotion" 
                        name="appearance.reducedMotion" 
                        class="settings-checkbox" 
                        ${currentSettings?.appearance?.reducedMotion ? 'checked' : ''}
                      >
                      Reduce motion
                    </label>
                    <p class="settings-help-text">Minimizes animations throughout the interface.</p>
                  </div>
                </div>
                
                <!-- Account (Danger Zone) Section -->
                <div class="settings-section ${currentTab === 'danger' ? 'active' : ''}">
                  <h3 class="settings-section-title">Account Management</h3>
                  <p class="settings-section-description">Manage critical account operations.</p>
                  
                  <div class="settings-card" style="border-color: #fca5a5; background-color: #fee2e2;">
                    <h4 style="color: #b91c1c; margin-top: 0;">Change Password</h4>
                    <p style="color: #4b5563; font-size: 0.875rem;">
                      Update your account password to maintain security.
                    </p>
                    <button id="change-password-btn" class="settings-btn settings-btn-secondary">
                      Change Password
                    </button>
                  </div>
                  
                  <div class="settings-card" style="border-color: #fca5a5; background-color: #fee2e2; margin-top: 16px;">
                    <h4 style="color: #b91c1c; margin-top: 0;">Download Your Data</h4>
                    <p style="color: #4b5563; font-size: 0.875rem;">
                      Export a copy of all your data and content from ApproVideo Hub.
                    </p>
                    <button id="export-data-btn" class="settings-btn settings-btn-secondary">
                      Request Data Export
                    </button>
                  </div>
                  
                  <div class="settings-card" style="border-color: #fca5a5; background-color: #fee2e2; margin-top: 16px;">
                    <h4 style="color: #b91c1c; margin-top: 0;">Delete Account</h4>
                    <p style="color: #4b5563; font-size: 0.875rem;">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button id="delete-account-btn" class="settings-btn settings-btn-danger">
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="settings-footer">
              <button class="settings-btn settings-btn-secondary" id="cancel-btn">Cancel</button>
              <button class="settings-btn settings-btn-primary" id="save-btn" ${!isDirty ? 'disabled' : ''}>
                Save Changes
              </button>
            </div>
          `}
        </div>
      `;
      
      // Add event listeners after rendering
      if (isOpen && !loading && !error) {
        // Close button
        this.modal.querySelector('.settings-close').addEventListener('click', this.close);
        
        // Cancel button
        this.modal.querySelector('#cancel-btn').addEventListener('click', this.close);
        
        // Save button
        this.modal.querySelector('#save-btn').addEventListener('click', this.saveSettings);
        
        // Retry button (for error state)
        const retryBtn = this.modal.querySelector('#retry-settings-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadSettings());
        }
        
        // Tab navigation
        const tabLinks = this.modal.querySelectorAll('.settings-nav-link');
        tabLinks.forEach(link => {
          link.addEventListener('click', () => {
            const tab = link.getAttribute('data-tab');
            this.switchTab(tab);
          });
        });
        
        // Form inputs
        const inputs = this.modal.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.addEventListener('change', this.handleInputChange);
        });
        
        // Special buttons
        const verifyLatticeBtn = this.modal.querySelector('#verify-lattice-btn');
        if (verifyLatticeBtn) {
          verifyLatticeBtn.addEventListener('click', this.verifyLatticeIntegrity);
        }
        
        const toggle2faBtn = this.modal.querySelector('#toggle-2fa-btn');
        if (toggle2faBtn) {
          toggle2faBtn.addEventListener('click', () => {
            const isEnabled = this.state.currentSettings.security.twoFactorEnabled;
            this.handleTwoFactorToggle(!isEnabled);
          });
        }
        
        const invalidateSessionsBtn = this.modal.querySelector('#invalidate-sessions-btn');
        if (invalidateSessionsBtn) {
          invalidateSessionsBtn.addEventListener('click', this.invalidateOtherSessions);
        }
        
        const changePasswordBtn = this.modal.querySelector('#change-password-btn');
        if (changePasswordBtn) {
          changePasswordBtn.addEventListener('click', () => {
            // In a real implementation, this would show a password change modal
            alert('Change password functionality would be implemented here');
          });
        }
        
        const exportDataBtn = this.modal.querySelector('#export-data-btn');
        if (exportDataBtn) {
          exportDataBtn.addEventListener('click', () => {
            // In a real implementation, this would trigger a data export
            alert('Data export request would be sent here');
          });
        }
        
        const deleteAccountBtn = this.modal.querySelector('#delete-account-btn');
        if (deleteAccountBtn) {
          deleteAccountBtn.addEventListener('click', () => {
            if (confirm('WARNING: This action cannot be undone. Are you absolutely sure you want to permanently delete your account?')) {
              // In a real implementation, this would trigger account deletion
              alert('Account deletion request would be sent here');
            }
          });
        }
        
        // Handle expertise checkboxes
        const expertiseCheckboxes = this.modal.querySelectorAll('input[name="expertise"]');
        expertiseCheckboxes.forEach(checkbox => {
          checkbox.addEventListener('change', () => {
            // Get all checked expertise values
            const checked = Array.from(this.modal.querySelectorAll('input[name="expertise"]:checked'))
              .map(cb => cb.value);
            
            // Update the settings
            this.state.currentSettings.profile.expertise = checked;
            
            // Mark as dirty
            this.state.isDirty = JSON.stringify(this.state.currentSettings) !== JSON.stringify(this.state.originalSettings);
            
            // Rerender
            this.render();
          });
        });
      }
    }
  }
  
  // Export the SettingsUI class for use in other modules
  export default SettingsUI;