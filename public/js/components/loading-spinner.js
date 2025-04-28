// js/components/loading-spinner.js
/**
 * Loading Spinner Component
 * A simple, reusable loading spinner that can be added to any page
 */

class LoadingSpinner {
    /**
     * Create a new loading spinner
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - ID of the container element (default: 'loading-spinner')
     * @param {string} options.size - Size of the spinner ('small', 'medium', 'large') (default: 'medium')
     * @param {string} options.color - Primary color of the spinner (default: '#3b82f6')
     * @param {boolean} options.fullScreen - Whether to show as a fullscreen overlay (default: false)
     */
    constructor(options = {}) {
      this.containerId = options.containerId || 'loading-spinner';
      this.size = options.size || 'medium';
      this.color = options.color || '#3b82f6';
      this.fullScreen = options.fullScreen || false;
      
      this.container = null;
      this.spinner = null;
      
      this._createElements();
    }
    
    /**
     * Create the spinner elements
     * @private
     */
    _createElements() {
      // Check if container already exists
      this.container = document.getElementById(this.containerId);
      
      if (!this.container) {
        // Create container
        this.container = document.createElement('div');
        this.container.id = this.containerId;
        
        // Set container styles
        Object.assign(this.container.style, {
          display: 'none',
          textAlign: 'center',
          padding: '2rem',
        });
        
        // If fullscreen, make it an overlay
        if (this.fullScreen) {
          Object.assign(this.container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          });
        }
        
        // Create spinner element
        this.spinner = document.createElement('div');
        
        // Set size based on option
        let spinnerSize = '40px';
        let borderSize = '4px';
        
        if (this.size === 'small') {
          spinnerSize = '20px';
          borderSize = '2px';
        } else if (this.size === 'large') {
          spinnerSize = '60px';
          borderSize = '6px';
        }
        
        // Set spinner styles
        Object.assign(this.spinner.style, {
          border: `${borderSize} solid #f3f4f6`,
          borderTop: `${borderSize} solid ${this.color}`,
          borderRadius: '50%',
          width: spinnerSize,
          height: spinnerSize,
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        });
        
        // Create animation
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(styleSheet);
        
        // Add spinner to container
        this.container.appendChild(this.spinner);
        
        // Add container to document
        document.body.appendChild(this.container);
      }
    }
    
    /**
     * Show the loading spinner
     * @param {string} message - Optional message to display under the spinner
     */
    show(message) {
      this.container.style.display = this.fullScreen ? 'flex' : 'block';
      
      // Add message if provided
      if (message) {
        let messageEl = this.container.querySelector('.spinner-message');
        
        if (!messageEl) {
          messageEl = document.createElement('p');
          messageEl.className = 'spinner-message';
          Object.assign(messageEl.style, {
            marginTop: '1rem',
            color: '#4b5563',
          });
          this.container.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
      }
    }
    
    /**
     * Hide the loading spinner
     */
    hide() {
      this.container.style.display = 'none';
    }
    
    /**
     * Update the spinner message
     * @param {string} message - New message to display
     */
    updateMessage(message) {
      let messageEl = this.container.querySelector('.spinner-message');
      
      if (!messageEl && message) {
        // Create message element if it doesn't exist
        messageEl = document.createElement('p');
        messageEl.className = 'spinner-message';
        Object.assign(messageEl.style, {
          marginTop: '1rem',
          color: '#4b5563',
        });
        this.container.appendChild(messageEl);
      }
      
      if (messageEl) {
        messageEl.textContent = message || '';
      }
    }
  }
  
  export default LoadingSpinner;