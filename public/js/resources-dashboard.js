// /public/js/resources-dashboard.js


// Add this to the top of your resources-dashboard.js file

// Session verification for dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check for authentication token
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('No authentication token found');
      window.location.href = '/login.html';
      return;
    }
    
    // Verify the token with the server
    try {
      const response = await fetch('/api/auth/access-check', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // If token is invalid or expired
      if (!response.ok) {
        console.error('Session verification failed');
        // Clear any stored auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('encrypted_session');
        
        // Redirect to login
        window.location.href = '/login.html';
        return;
      }
      
      // If we get here, token is valid
      console.log('Session verified, loading dashboard...');
      
      // Continue with dashboard initialization
      // Your existing dashboard code here...
      
    } catch (error) {
      console.error('Error verifying session:', error);
      // Stay on dashboard for now to prevent infinite redirect loops
      // You can add a UI indicator that there are connectivity issues
    }
  });



import { loadSecureSession, clearSecureSession } from './session-crypto.js';

async function initResourcesDashboard() {
  const session = await loadSecureSession();
  if (!session || session.role !== 'resources') {
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('resources-list');
  container.textContent = 'Resource library is empty.';

  // TODO: Call API to list resources and display
}

document.addEventListener('DOMContentLoaded', initResourcesDashboard);