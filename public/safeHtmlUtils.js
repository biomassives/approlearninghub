/**
 * Utility class for safely handling HTML content and preventing XSS attacks
 */
class SafeHtmlUtils {
    constructor() {
      // Map of characters to their HTML entity equivalents
      this.htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      };
    }
  
    /**
     * Escapes HTML special characters in a string
     * @param {string} str - The string to escape
     * @returns {string} The escaped string
     */
    escape(str) {
      try {
        // Handle null, undefined, or non-string inputs
        if (!str) return '';
        if (typeof str !== 'string') {
          str = String(str);
        }
  
        // Use regex replacement with character map
        return str.replace(/[&<>'`=\/]/g, char => this.htmlEntities[char]);
      } catch (error) {
        console.error('Error escaping HTML:', error);
        return ''; // Return empty string on error
      }
    }
  
    /**
     * Recursively escapes HTML in an object's string properties
     * @param {Object} obj - Object containing strings to escape
     * @returns {Object} New object with escaped strings
     */
    escapeObject(obj) {
      try {
        if (!obj || typeof obj !== 'object') return {};
  
        const escaped = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            escaped[key] = this.escape(value);
          } else if (Array.isArray(value)) {
            escaped[key] = value.map(item => 
              typeof item === 'string' ? this.escape(item) : item
            );
          } else if (typeof value === 'object' && value !== null) {
            escaped[key] = this.escapeObject(value);
          } else {
            escaped[key] = value;
          }
        }
        return escaped;
      } catch (error) {
        console.error('Error escaping object:', error);
        return obj; // Return original object on error
      }
    }
  
    /**
     * Safely create an HTML element with escaped content
     * @param {string} tag - The HTML tag name
     * @param {Object} attributes - Object containing element attributes
     * @param {string|Array} content - Content to put inside the element
     * @returns {string} Safe HTML string
     */
    createElement(tag, attributes = {}, content = '') {
      try {
        const safeTag = this.escape(tag);
        const safeAttributes = Object.entries(attributes)
          .map(([key, value]) => `${this.escape(key)}="${this.escape(value)}"`)
          .join(' ');
        
        const safeContent = Array.isArray(content) 
          ? content.map(item => this.escape(item)).join('') 
          : this.escape(content);
  
        return `<${safeTag} ${safeAttributes}>${safeContent}</${safeTag}>`;
      } catch (error) {
        console.error('Error creating element:', error);
        return '';
      }
    }
  
    /**
     * Creates a safe anchor tag with escaped URL and content
     * @param {string} url - The URL for the anchor
     * @param {string} text - The link text
     * @param {Object} attributes - Additional attributes for the anchor tag
     * @returns {string} Safe HTML anchor tag
     */
    createLink(url, text, attributes = {}) {
      const safeUrl = this.escape(url);
      const safeAttributes = {
        ...attributes,
        href: safeUrl,
        rel: 'noopener noreferrer' // Security best practice for external links
      };
  
      return this.createElement('a', safeAttributes, text);
    }
  
    /**
     * Validates and sanitizes a CSS class string
     * @param {string} classes - Space-separated CSS classes
     * @returns {string} Sanitized CSS classes
     */
    sanitizeClasses(classes) {
      try {
        if (!classes) return '';
        
        // Remove any non-valid CSS class characters
        return classes
          .split(' ')
          .map(cls => cls.replace(/[^a-zA-Z0-9-_]/g, ''))
          .filter(Boolean)
          .join(' ');
      } catch (error) {
        console.error('Error sanitizing classes:', error);
        return '';
      }
    }
  }
  
  // Create a singleton instance
  const safeHtml = new SafeHtmlUtils();
  
  // Export the singleton
  export default safeHtml;
  
  // Also export the class if needed
  export { SafeHtmlUtils };
