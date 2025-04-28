// js/app.js
// Simplified direct approach without router dependency for immediate rendering

document.addEventListener('DOMContentLoaded', function() {
    // Get the main content container
    const contentEl = document.getElementById('content');
    
    // Log for debugging
    console.log('App.js initialized, rendering homepage');
    
    if (!contentEl) {
      console.error('Content element not found');
      return;
    }
    
    // Check current path
    const path = window.location.pathname;
    console.log('Current path:', path);
    
    // Simple routing based on path
    if (path === '/' || path === '/index.html') {
      renderHomePage(contentEl);
    } else if (path.includes('/expert-dashboard')) {
      renderExpertDashboard(contentEl);
    } else if (path.includes('/login')) {
      renderLoginPage(contentEl);
    } else {
      // Default to home page
      renderHomePage(contentEl);
    }
    
    /**
     * Render home page content
     */
    function renderHomePage(container) {
      console.log('Rendering homepage');
      container.innerHTML = `
        <div class="home-page">
          <h1>Welcome to ApproVideo</h1>
          <p>Choose your option:</p>
          <div class="dashboard-links">
            <a href="/expert-dashboard.html" class="dashboard-link">Expert Dashboard</a>
            <a href="/login.html" class="dashboard-link">Login</a>
            <a href="/login2.html" class="dashboard-link">Login 2</a>
          </div>
        </div>
      `;
    }
    
    /**
     * Render expert dashboard
     */
    function renderExpertDashboard(container) {
      console.log('Loading expert dashboard');
      container.innerHTML = '<div class="loading"></div>';
      
      fetch('/expert-dashboard.html')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load dashboard');
          }
          return response.text();
        })
        .then(html => {
          container.innerHTML = html;
          
          // Load the dashboard script
          const script = document.createElement('script');
          script.type = 'module';
          script.src = '/js/expert-dashboard.js';
          document.body.appendChild(script);
        })
        .catch(error => {
          console.error('Error loading dashboard:', error);
          container.innerHTML = `
            <div class="error-container">
              <h1>Error Loading Dashboard</h1>
              <p>${error.message}</p>
              <a href="/" class="home-link">Go Back Home</a>
            </div>
          `;
        });
    }
    
    /**
     * Render login page
     */
    function renderLoginPage(container) {
      console.log('Loading login page');
      container.innerHTML = '<div class="loading"></div>';
      
      // Determine which login page to load
      const loginPath = path.includes('login2') ? '/login2.html' : '/login.html';
      
      fetch(loginPath)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load login page');
          }
          return response.text();
        })
        .then(html => {
          container.innerHTML = html;
        })
        .catch(error => {
          console.error('Error loading login page:', error);
          container.innerHTML = `
            <div class="error-container">
              <h1>Error Loading Login</h1>
              <p>${error.message}</p>
              <a href="/" class="home-link">Go Back Home</a>
            </div>
          `;
        });
    }
  });
  
  // Add navigation handling to avoid full page reloads
  document.addEventListener('click', function(e) {
    // Only intercept links within our app
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
      const href = link.getAttribute('href');
      
      // Skip external links, anchor links, or links with modifiers
      if (!href || 
          href.startsWith('http') || 
          href.startsWith('#') || 
          href.startsWith('javascript:') ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey) {
        return;
      }
      
      // Let API calls pass through
      if (href.startsWith('/api/')) {
        return;
      }
      
      // For now, just do a normal navigation - no SPA
      // This ensures things work even without complex routing
      window.location.href = href;
    }
  });