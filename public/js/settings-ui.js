// js/settings-ui.js
/**
 * Settings UI Component
 * Handles the expert settings modal interface
 */

export default class SettingsUI {
    constructor() {
      this.modalId = 'settings-modal';
      this.modalEl = null;
      this.isInitialized = false;
    }
  
    /**
     * Create the settings modal DOM elements
     */
    initialize() {
      if (this.isInitialized) return;
  
      // Create modal container if it doesn't exist
      let modal = document.getElementById(this.modalId);
      if (!modal) {
        modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
      }
  
      // Set modal HTML
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Expert Settings</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="settings-section">
              <h3>Notification Preferences</h3>
              <div class="setting-item">
                <label for="email-notifications">Email Notifications</label>
                <input type="checkbox" id="email-notifications" checked />
              </div>
              <div class="setting-item">
                <label for="sms-notifications">SMS Notifications</label>
                <input type="checkbox" id="sms-notifications" />
              </div>
            </div>
            
            <div class="settings-section">
              <h3>Display Options</h3>
              <div class="setting-item">
                <label for="display-theme">Theme</label>
                <select id="display-theme">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>
            
            <div class="settings-section">
              <h3>Security</h3>
              <div class="setting-item">
                <label for="enable-2fa">Enable Two-Factor Authentication</label>
                <input type="checkbox" id="enable-2fa" />
              </div>
              <button id="change-password-btn" class="btn">Change Password</button>
            </div>
          </div>
          <div class="modal-footer">
            <button id="save-settings-btn" class="btn btn-primary">Save Changes</button>
            <button id="cancel-settings-btn" class="btn">Cancel</button>
          </div>
        </div>
      `;
  
      // Cache modal element
      this.modalEl = modal;
  
      // Add event listeners
      const closeBtn = modal.querySelector('.close-modal');
      closeBtn.addEventListener('click', () => this.close());
  
      const cancelBtn = modal.querySelector('#cancel-settings-btn');
      cancelBtn.addEventListener('click', () => this.close());
  
      const saveBtn = modal.querySelector('#save-settings-btn');
      saveBtn.addEventListener('click', () => this.saveSettings());
  
      // Add click outside to close
      window.addEventListener('click', (event) => {
        if (event.target === this.modalEl) {
          this.close();
        }
      });
  
      this.isInitialized = true;
    }
  
    /**
     * Open the settings modal
     */
    open() {
      // Initialize if needed
      if (!this.isInitialized) {
        this.initialize();
      }
  
      // Load current settings
      this.loadCurrentSettings();
  
      // Show modal
      this.modalEl.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
  
    /**
     * Close the settings modal
     */
    close() {
      if (this.modalEl) {
        this.modalEl.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
      }
    }
  
    /**
     * Load the current user settings
     */
    loadCurrentSettings() {
      // In production, this would fetch from an API or local storage
      // For now, we'll just use default values
      
      // Email notifications
      const emailNotificationsEl = document.getElementById('email-notifications');
      if (emailNotificationsEl) {
        emailNotificationsEl.checked = localStorage.getItem('email-notifications') !== 'false';
      }
      
      // SMS notifications
      const smsNotificationsEl = document.getElementById('sms-notifications');
      if (smsNotificationsEl) {
        smsNotificationsEl.checked = localStorage.getItem('sms-notifications') === 'true';
      }
      
      // Theme
      const themeEl = document.getElementById('display-theme');
      if (themeEl) {
        themeEl.value = localStorage.getItem('display-theme') || 'light';
      }
      
      // 2FA
      const twoFAEl = document.getElementById('enable-2fa');
      if (twoFAEl) {
        twoFAEl.checked = localStorage.getItem('enable-2fa') === 'true';
      }
    }
  
    /**
     * Save the current settings
     */
    saveSettings() {
      // Email notifications
      const emailNotificationsEl = document.getElementById('email-notifications');
      if (emailNotificationsEl) {
        localStorage.setItem('email-notifications', emailNotificationsEl.checked);
      }
      
      // SMS notifications
      const smsNotificationsEl = document.getElementById('sms-notifications');
      if (smsNotificationsEl) {
        localStorage.setItem('sms-notifications', smsNotificationsEl.checked);
      }
      
      // Theme
      const themeEl = document.getElementById('display-theme');
      if (themeEl) {
        localStorage.setItem('display-theme', themeEl.value);
        this.applyTheme(themeEl.value);
      }
      
      // 2FA
      const twoFAEl = document.getElementById('enable-2fa');
      if (twoFAEl) {
        localStorage.setItem('enable-2fa', twoFAEl.checked);
      }
      
      // Close modal
      this.close();
      
      // Show success message
      this.showNotification('Settings saved successfully');
    }
  
    /**
     * Apply the selected theme
     * @param {string} theme 
     */
    applyTheme(theme) {
      if (theme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.body.setAttribute('data-theme', theme);
      }
    }
  
    /**
     * Show a notification message
     * @param {string} message 
     */
    showNotification(message) {
      // Check if notification container exists
      let notificationContainer = document.querySelector('.notification-container');
      if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
      }
      
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      
      // Add to container
      notificationContainer.appendChild(notification);
      
      // Remove after timeout
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          notificationContainer.removeChild(notification);
        }, 500);
      }, 3000);
    }
  }