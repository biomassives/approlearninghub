// Save this as auth-debug.js in your project and include with:
// <script src="auth-debug.js"></script>

document.addEventListener('DOMContentLoaded', function() {
    // Create a small floating debug button
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔍 Auth';
    debugBtn.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 12px;
      cursor: pointer;
      z-index: 9999;
      opacity: 0.7;
    `;
    
    // Add hover effect
    debugBtn.onmouseover = () => { debugBtn.style.opacity = '1'; };
    debugBtn.onmouseout = () => { debugBtn.style.opacity = '0.7'; };
    
    // Add click handler to show debug info
    debugBtn.onclick = function() {
      // Token info
      const authToken = localStorage.getItem('auth_token');
      const legacyToken = localStorage.getItem('token');
      const userInfo = localStorage.getItem('user_info');
      
      // Create debug panel
      const panel = document.createElement('div');
      panel.style.cssText = `
        position: fixed;
        bottom: 40px;
        right: 10px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 15px;
        width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
      `;
      
      // Format token for display (first 10 chars)
      const formatToken = (token) => {
        if (!token) return 'null';
        return token.substring(0, 10) + '...' + token.substring(token.length - 5);
      };
      
      // Check if tokens match
      const tokensMatch = authToken === legacyToken;
      const tokenStatus = tokensMatch ? 
        '<span style="color: green;">MATCH ✓</span>' : 
        '<span style="color: red;">MISMATCH ✗</span>';
      
      // Build debug content
      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong>Auth Debug</strong>
          <button id="close-debug" style="background: none; border: none; cursor: pointer; font-size: 16px;">×</button>
        </div>
        <div style="margin-bottom: 5px;"><strong>Tokens:</strong> ${tokenStatus}</div>
        <div style="margin-bottom: 5px;"><strong>auth_token:</strong> ${authToken ? formatToken(authToken) : 'null'}</div>
        <div style="margin-bottom: 5px;"><strong>token:</strong> ${legacyToken ? formatToken(legacyToken) : 'null'}</div>
        <div style="margin-bottom: 5px;"><strong>User:</strong> ${userInfo ? JSON.parse(userInfo).email : 'null'}</div>
        <div style="margin-bottom: 5px;"><strong>Role:</strong> ${localStorage.getItem('userRole') || 'null'}</div>
        <div style="margin-top: 15px;">
          <button id="fix-tokens" style="background: #4CAF50; color: white; border: none; border-radius: 4px; padding: 5px 8px; cursor: pointer; font-size: 12px; margin-right: 5px;">Fix Tokens</button>
          <button id="clear-auth" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 5px 8px; cursor: pointer; font-size: 12px;">Clear Auth</button>
        </div>
      `;
      
      // Add to page
      document.body.appendChild(panel);
      
      // Add button handlers
      document.getElementById('close-debug').onclick = function() {
        document.body.removeChild(panel);
      };
      
      document.getElementById('fix-tokens').onclick = function() {
        // If we have one token but not the other, copy it
        if (authToken && !legacyToken) {
          localStorage.setItem('token', authToken);
          alert('Fixed: Copied auth_token to token');
          document.body.removeChild(panel);
          setTimeout(() => window.location.reload(), 500);
        } 
        else if (!authToken && legacyToken) {
          localStorage.setItem('auth_token', legacyToken);
          alert('Fixed: Copied token to auth_token');
          document.body.removeChild(panel);
          setTimeout(() => window.location.reload(), 500);
        }
        // If both exist but don't match, use auth_token as the source of truth
        else if (authToken && legacyToken && authToken !== legacyToken) {
          localStorage.setItem('token', authToken);
          alert('Fixed: Synchronized tokens using auth_token as source');
          document.body.removeChild(panel);
          setTimeout(() => window.location.reload(), 500);
        }
        else {
          alert('No token inconsistencies to fix');
        }
      };
      
      document.getElementById('clear-auth').onclick = function() {
        if (confirm('Are you sure you want to clear all auth data? You will need to log in again.')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('user_info');
          sessionStorage.removeItem('signup_success');
          sessionStorage.removeItem('user_role');
          alert('Auth data cleared. Redirecting to login page.');
          window.location.href = '/login.html?cleared=1';
        }
      };
    };
    
    // Add to page
    document.body.appendChild(debugBtn);
  });