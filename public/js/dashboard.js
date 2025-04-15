import {
    requireAuth,
    loadSecureSession,
    signOut,
    hasRequiredRole
  } from './serverless-enhanced-auth.js';
  
  const dashboardContent = document.getElementById('dashboard-content');
  const authStatus = document.getElementById('auth-status');
  const logoutBtn = document.getElementById('logout-btn');
  const loginRedirect = document.getElementById('login-redirect');
  const toolsList = document.getElementById('dashboard-tools-list');
  const userRoleLabel = document.getElementById('user-role-label');
  
  // You can use this elsewhere in the dashboard
  let currentUserRole = 'viewer';
  
  const DASHBOARD_TOOLS = {
    viewer: ['View Public Timeline'],
    editor: ['Manage Panels', 'Upload Videos', 'Edit Library'],
    expert: ['Review Submissions', 'Assign Clinic Experts'],
    admin: ['User Management', 'System Settings'],
    developer: ['Debug Tools', 'Deployment Logs']
  };
  
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const isAuthenticated = await requireAuth('/login.html?redirect=/dashboard.html');
      if (!isAuthenticated) {
        authStatus.style.display = 'block';
        return;
      }
  
      const sessionData = await loadSecureSession();
      currentUserRole = sessionData?.user?.role || 'viewer';
  
      renderDashboard(currentUserRole);
  
      // 🔐 Example: Use this to toggle visibility of restricted buttons
      if (hasRequiredRole(currentUserRole, ['editor', 'admin', 'developer'])) {
        const editButtons = document.querySelectorAll('.editor-only');
        editButtons.forEach(btn => btn.style.display = 'inline-block');
      }
  
    } catch (err) {
      console.error('Dashboard error:', err);
      authStatus.style.display = 'block';
    }
  });
  
  function renderDashboard(role) {
    authStatus.style.display = 'none';
    dashboardContent.style.display = 'block';
  
    userRoleLabel.textContent = capitalize(role);
    const tools = getDashboardTools(role);
    tools.forEach(tool => {
      const li = document.createElement('li');
      li.textContent = tool;
      toolsList.appendChild(li);
    });
  }
  
  function getDashboardTools(role) {
    const allRoles = ['viewer', 'editor', 'expert', 'admin', 'developer'];
    const roleIndex = allRoles.indexOf(role);
    const tools = [];
  
    for (let i = 0; i <= roleIndex; i++) {
      const r = allRoles[i];
      if (DASHBOARD_TOOLS[r]) {
        tools.push(...DASHBOARD_TOOLS[r]);
      }
    }
  
    return tools;
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  logoutBtn?.addEventListener('click', async () => {
    await signOut();
    window.location.href = '/login.html';
  });
  
  loginRedirect?.addEventListener('click', () => {
    window.location.href = '/login.html';
  });
  