// role-based-navigation.js
// Role-based navigation component for dashboards

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize auth service
  const authService = new AuthService();
  
  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    // Redirect to login page if not on a public page
    if (!window.location.pathname.includes('public-')) {
      window.location.href = '/login.html';
      return;
    }
  }
  
  // Function to render role-based navigation
  async function renderNavigation() {
    // Get accessible dashboards for the current user
    const { success, dashboards, details } = await authService.getAccessibleDashboards();
    
    if (!success) {
      console.error('Failed to get accessible dashboards');
      return;
    }
    
    // Find the navigation container
    const navContainer = document.getElementById('app-navigation');
    if (!navContainer) {
      console.error('Navigation container not found');
      return;
    }
    
    // Clear existing navigation
    navContainer.innerHTML = '';
    
    // Build navigation items
    const navList = document.createElement('ul');
    navList.className = 'nav-list';
    
    // Add dashboard links
    dashboards.forEach(dashboard => {
      const navItem = document.createElement('li');
      navItem.className = 'nav-item';
      
      // Check if current page matches this dashboard
      const isCurrent = window.location.pathname.includes(dashboard);
      if (isCurrent) {
        navItem.classList.add('nav-item-active');
      }
      
      // Create dashboard link
      const navLink = document.createElement('a');
      navLink.href = `/${dashboard}`;
      navLink.className = 'nav-link';
      
      // Format display name (convert kebab-case to Title Case)
      const displayName = dashboard
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      navLink.textContent = displayName;
      navItem.appendChild(navLink);
      navList.appendChild(navItem);
    });
    
    // Add user management link if user has permission
    if (authService.hasPermission('canManageUsers')) {
      const adminItem = document.createElement('li');
      adminItem.className = 'nav-item nav-item-admin';
      
      const adminLink = document.createElement('a');
      adminLink.href = '/user-management';
      adminLink.className = 'nav-link';
      adminLink.textContent = 'User Management';
      
      adminItem.appendChild(adminLink);
      navList.appendChild(adminItem);
    }
    
    // Add dev tools link if user has permission
    if (authService.hasPermission('canAccessDevTools')) {
      const devItem = document.createElement('li');
      devItem.className = 'nav-item nav-item-dev';
      
      const devLink = document.createElement('a');
      devLink.href = '/dev-tools';
      devLink.className = 'nav-link';
      devLink.textContent = 'Developer Tools';
      
      devItem.appendChild(devLink);
      navList.appendChild(devItem);
      
      // Add diagnostic tool link for developers
      const diagItem = document.createElement('li');
      diagItem.className = 'nav-item nav-item-dev';
      
      const diagLink = document.createElement('a');
      diagLink.href = '/auth-diagnostic.html';
      diagLink.className = 'nav-link';
      diagLink.textContent = 'Auth Diagnostics';
      
      diagItem.appendChild(diagLink);
      navList.appendChild(diagItem);
    }
    
    // Add user info and logout
    const userItem = document.createElement('li');
    userItem.className = 'nav-item nav-item-user';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // User role badge
    const roleBadge = document.createElement('span');
    roleBadge.className = `role-badge role-${authService.getUserRole()}`;
    roleBadge.textContent = authService.getUserRole().toUpperCase();
    
    // Logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      window.location.href = '/login.html';
    });
    
    userInfo.appendChild(roleBadge);
    userInfo.appendChild(logoutBtn);
    userItem.appendChild(userInfo);
    navList.appendChild(userItem);
    
    // Add to navigation container
    navContainer.appendChild(navList);
    
    // Apply role-specific styling to the body
    document.body.classList.add(`role-${authService.getUserRole()}`);
  }
  
  // Initial render
  await renderNavigation();
  
  // Verify token and update navigation after successful verification
  const { success } = await authService.verifyToken();
  if (success) {
    // Get fresh user data
    await authService.getUserData();
    // Re-render navigation with updated data
    await renderNavigation();
  }
});
