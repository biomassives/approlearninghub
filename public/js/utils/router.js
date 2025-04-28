// js/utils/router.js
/**
 * Simple Vanilla JS Router for SPA
 * Mimics the behavior of Vercel's rewrites config
 */
class Router {
    constructor(options = {}) {
      this.routes = {};
      this.rootElement = options.rootElement || document.getElementById('app');
      this.errorHandler = options.errorHandler || this.defaultErrorHandler;
      this.notFoundHandler = options.notFoundHandler || this.defaultNotFoundHandler;
      this.excludedPaths = options.excludedPaths || ['/api/', '/favicon.ico'];
      
      // Initialize
      this.init();
    }
    
    /**
     * Initialize the router
     */
    init() {
      // Handle initial page load
      this.navigateTo(window.location.pathname);
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', () => {
        this.navigateTo(window.location.pathname, false);
      });
      
      // Intercept link clicks for client-side navigation
      document.addEventListener('click', e => {
        // Find closest anchor tag
        const anchor = e.target.closest('a');
        
        if (anchor) {
          const href = anchor.getAttribute('href');
          
          // Skip if:
          // - Not an internal link
          // - Has target="_blank"
          // - Is a download link
          // - Has rel="external"
          // - Is in excluded paths
          if (href && 
              href.startsWith('/') && 
              !anchor.hasAttribute('target') && 
              !anchor.hasAttribute('download') && 
              !anchor.getAttribute('rel')?.includes('external') &&
              !this.isExcludedPath(href)) {
            
            e.preventDefault();
            this.navigateTo(href);
          }
        }
      });
    }
    
    /**
     * Check if a path is excluded from client-side routing
     * @param {string} path 
     * @returns {boolean}
     */
    isExcludedPath(path) {
      return this.excludedPaths.some(excludedPath => path.startsWith(excludedPath));
    }
    
    /**
     * Register a route handler
     * @param {string} path - URL path
     * @param {function} handler - Route handler function
     */
    registerRoute(path, handler) {
      this.routes[path] = handler;
      return this; // For chaining
    }
    
    /**
     * Navigate to a specific path
     * @param {string} path - Target path
     * @param {boolean} updateHistory - Whether to update browser history
     */
    navigateTo(path, updateHistory = true) {
      // Skip excluded paths
      if (this.isExcludedPath(path)) {
        return;
      }
      
      // Update browser history if needed
      if (updateHistory) {
        window.history.pushState({}, '', path);
      }
      
      try {
        // Find the handler for this route
        const handler = this.findHandler(path);
        
        // Execute the handler
        handler(this.rootElement, path);
      } catch (error) {
        this.errorHandler(error, path);
      }
    }
    
    /**
     * Find the appropriate handler for a path
     * @param {string} path 
     * @returns {function}
     */
    findHandler(path) {
      // Exact match
      if (this.routes[path]) {
        return this.routes[path];
      }
      
      // Pattern matching (simple version)
      for (const routePath in this.routes) {
        if (routePath.includes(':')) {
          const pattern = new RegExp(
            '^' + routePath.replace(/:[^\s/]+/g, '([\\w-]+)') + '$'
          );
          
          const match = path.match(pattern);
          if (match) {
            const params = {};
            const paramNames = routePath.match(/:[^\s/]+/g) || [];
            
            paramNames.forEach((param, index) => {
              params[param.slice(1)] = match[index + 1];
            });
            
            return (rootEl) => this.routes[routePath](rootEl, params);
          }
        }
      }
      
      // Root fallback - treat as index.html
      if (path === '/') {
        return this.routes['/'] || this.defaultIndexHandler;
      }
      
      // Not found - serve index.html for SPA
      return this.notFoundHandler;
    }
    
    /**
     * Default error handler
     * @param {Error} error 
     * @param {string} path 
     */
    defaultErrorHandler(error, path) {
      console.error(`Error navigating to ${path}:`, error);
      this.rootElement.innerHTML = `
        <div class="error-container">
          <h1>Something went wrong</h1>
          <p>We encountered an error while loading this page.</p>
          <button onclick="window.location.reload()">Reload</button>
        </div>
      `;
    }
    
    /**
     * Default 404 handler - serves index.html equivalent for SPA
     * @param {HTMLElement} rootEl 
     * @param {string} path 
     */
    defaultNotFoundHandler(rootEl, path) {
      console.warn(`No route found for ${path}, serving index page instead`);
      
      // Simulate the "rewrite" to index.html by fetching it
      fetch('/index.html')
        .then(response => {
          if (!response.ok) throw new Error('Failed to load index.html');
          return response.text();
        })
        .then(html => {
          // Extract just the content area to avoid duplicate HTML structure
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          
          // Find the main content container in index.html
          // Adjust this selector based on your actual HTML structure
          const contentEl = tempDiv.querySelector('#content') || tempDiv.querySelector('main');
          
          if (contentEl) {
            rootEl.innerHTML = contentEl.innerHTML;
          } else {
            // Fallback if content container not found
            rootEl.innerHTML = html;
          }
          
          // Execute any scripts in the content
          Array.from(rootEl.querySelectorAll('script')).forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
          });
        })
        .catch(error => {
          console.error('Error loading index.html:', error);
          rootEl.innerHTML = `
            <div class="not-found">
              <h1>Page Not Found</h1>
              <p>The page you requested could not be found.</p>
              <a href="/" class="home-link">Go Home</a>
            </div>
          `;
        });
    }
    
    /**
     * Default index handler
     * @param {HTMLElement} rootEl 
     */
    defaultIndexHandler(rootEl) {
      fetch('/index.html')
        .then(response => response.text())
        .then(html => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          
          const contentEl = tempDiv.querySelector('#content') || tempDiv.querySelector('main');
          
          if (contentEl) {
            rootEl.innerHTML = contentEl.innerHTML;
          } else {
            rootEl.innerHTML = html;
          }
        })
        .catch(error => {
          console.error('Error loading index page:', error);
        });
    }
  }
  
  export default Router;