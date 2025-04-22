/**
 * ApproVideo Hub Utilities
 * 
 * Common utility functions used across the ApproVideo Hub platform
 */

/**
 * Theme Management
 */
export const ThemeManager = {
  // Initialize theme
  init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
    
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const newTheme = e.matches ? 'dark' : 'light';
      this.setTheme(newTheme);
    });
  },
  
  // Set theme
  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },
  
  // Toggle theme
  toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  },
  
  // Get current theme
  getTheme() {
    return localStorage.getItem('theme') || 'light';
  }
};

/**
 * Form Validation
 */
export const FormValidator = {
  // Validate email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Validate password strength
  validatePasswordStrength(password) {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    
    const strength = {
      valid: minLength && hasUppercase && hasLowercase && hasNumber,
      score: [minLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length,
      feedback: {
        minLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialChar
      }
    };
    
    // Calculate score as percentage
    strength.percentage = Math.min(Math.round((strength.score / 5) * 100), 100);
    
    // Determine strength level
    if (strength.percentage < 30) {
      strength.level = 'weak';
    } else if (strength.percentage < 60) {
      strength.level = 'fair';
    } else if (strength.percentage < 80) {
      strength.level = 'good';
    } else {
      strength.level = 'strong';
    }
    
    return strength;
  },
  
  // Validate URL
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * DOM Utilities
 */
export const DOMUtils = {
  // Create element with attributes and children
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.entries(value).forEach(([prop, val]) => {
          element.style[prop] = val;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    
    return element;
  },
  
  // Show alert message
  showAlert(message, type = 'info', duration = 5000) {
    // Alert types: info, success, warning, error
    const alertClass = `alert-${type}`;
    const iconMap = {
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`
    };
    
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'alert-container';
      alertContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md';
      document.body.appendChild(alertContainer);
    }
    
    // Create alert element
    const alertId = `alert-${Date.now()}`;
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert ${alertClass} flex items-center p-4 pr-8 rounded shadow-lg transform translate-x-full transition-transform duration-300`;
    alertElement.innerHTML = `
      <div class="flex-shrink-0 mr-3">
        ${iconMap[type] || iconMap.info}
      </div>
      <div class="flex-1">
        ${message}
      </div>
      <button class="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onclick="document.getElementById('${alertId}').remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    
    // Add to container
    alertContainer.appendChild(alertElement);
    
    // Animate in
    setTimeout(() => {
      alertElement.classList.remove('translate-x-full');
    }, 10);
    
    // Auto-remove after duration
    if (duration) {
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.classList.add('translate-x-full');
          setTimeout(() => {
            if (alertElement.parentNode) {
              alertElement.remove();
            }
          }, 300);
        }
      }, duration);
    }
    
    return alertElement;
  },
  
  // Toggle modal
  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    
    if (show) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      
      // Animate in
      setTimeout(() => {
        modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
      }, 10);
    } else {
      modal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
      
      // Animate out and hide
      setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }, 300);
    }
    
    return true;
  }
};

/**
 * Date and Time Utilities
 */
export const DateUtils = {
  // Format date
  formatDate(date, format = 'short') {
    if (!date) return '';
    
    const d = new Date(date);
    
    // Check if date is valid
    if (isNaN(d.getTime())) return '';
    
    // Predefined formats
    const formats = {
      short: { day: 'numeric', month: 'short', year: 'numeric' },
      medium: { day: 'numeric', month: 'long', year: 'numeric' },
      long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      time: { hour: 'numeric', minute: 'numeric' },
      datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' },
      relative: 'relative'
    };
    
    // Use relative time format
    if (format === 'relative') {
      return this.getRelativeTimeString(d);
    }
    
    // Use predefined format or custom format object
    const formatOptions = formats[format] || format;
    return new Intl.DateTimeFormat('en-US', formatOptions).format(d);
  },
  
  // Get relative time string
  getRelativeTimeString(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);
    
    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
  }
};

/**
 * String utilities
 */
export const StringUtils = {
  // Truncate text with ellipsis
  truncate(text, length = 100, suffix = '...') {
    if (!text) return '';
    
    if (text.length <= length) {
      return text;
    }
    
    return text.substring(0, length).trim() + suffix;
  },
  
  // Convert string to slug
  slugify(text) {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  },
  
  // Format number with commas
  formatNumber(number) {
    return new Intl.NumberFormat().format(number);
  },
  
  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

/**
 * Storage Utilities (Local Storage wrapper with encryption for sensitive data)
 */
export const StorageUtils = {
  // Set data in local storage
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return false;
    }
  },
  
  // Get data from local storage
  get(key, defaultValue = null) {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) {
        return defaultValue;
      }
      return JSON.parse(serialized);
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return defaultValue;
    }
  },
  
  // Remove data from local storage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error removing from localStorage:', e);
      return false;
    }
  },
  
  // Clear all data from local storage
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  },
  
  // Securely store sensitive data (simple version - in production would use a proper encryption library)
  setSecure(key, value) {
    try {
      const serialized = JSON.stringify(value);
      // Simple obfuscation - NOT real encryption, just for demo purposes
      const obfuscated = btoa(serialized);
      localStorage.setItem(`secure_${key}`, obfuscated);
      return true;
    } catch (e) {
      console.error('Error securely saving to localStorage:', e);
      return false;
    }
  },
  
  // Get securely stored data
  getSecure(key, defaultValue = null) {
    try {
      const obfuscated = localStorage.getItem(`secure_${key}`);
      if (obfuscated === null) {
        return defaultValue;
      }
      // Simple deobfuscation
      const serialized = atob(obfuscated);
      return JSON.parse(serialized);
    } catch (e) {
      console.error('Error securely reading from localStorage:', e);
      return defaultValue;
    }
  },
  
  // Remove securely stored data
  removeSecure(key) {
    try {
      localStorage.removeItem(`secure_${key}`);
      return true;
    } catch (e) {
      console.error('Error removing secure data from localStorage:', e);
      return false;
    }
  }
};

/**
 * Device and Browser Detection
 */
export const DeviceDetector = {
  // Get device type
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  },
  
  // Check if device is mobile
  isMobile() {
    return this.getDeviceType() === 'mobile';
  },
  
  // Check if device is tablet
  isTablet() {
    return this.getDeviceType() === 'tablet';
  },
  
  // Check if device is desktop
  isDesktop() {
    return this.getDeviceType() === 'desktop';
  },
  
  // Get browser name
  getBrowser() {
    const ua = navigator.userAgent;
    let browserName;
    
    if (ua.match(/chrome|chromium|crios/i)) {
      browserName = "Chrome";
    } else if (ua.match(/firefox|fxios/i)) {
      browserName = "Firefox";
    } else if (ua.match(/safari/i)) {
      browserName = "Safari";
    } else if (ua.match(/opr\//i)) {
      browserName = "Opera";
    } else if (ua.match(/edg/i)) {
      browserName = "Edge";
    } else if (ua.match(/trident/i)) {
      browserName = "Internet Explorer";
    } else {
      browserName = "Unknown";
    }
    
    return browserName;
  },
  
  // Check if browser is Internet Explorer
  isIE() {
    return this.getBrowser() === 'Internet Explorer';
  }
};

/**
 * Network Utilities
 */
export const NetworkUtils = {
  // Check if online
  isOnline() {
    return navigator.onLine;
  },
  
  // Get connection type if available
  getConnectionType() {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType;
    }
    return null;
  },
  
  // Check if connection is fast
  isFastConnection() {
    const type = this.getConnectionType();
    return type === '4g' || type === '3g';
  },
  
  // Add online/offline event listeners
  onConnectionChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
    
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  }
};

// Export all utilities
export default {
  ThemeManager,
  FormValidator,
  DOMUtils,
  DateUtils,
  StringUtils,
  StorageUtils,
  DeviceDetector,
  NetworkUtils
};