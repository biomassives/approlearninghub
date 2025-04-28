import userSession from '../auth/user-session.js'; // Use user-session

export function buildRoleMenu(menuId = 'role-nav-menu') {
    const menu = document.getElementById(menuId);
    if (!menu) {
        console.error(`Role menu container #${menuId} not found.`);
        return;
    }

    const userInfo = userSession.getUserInfo(); // Get info stored locally
    const role = userInfo?.role || 'guest'; // Default to guest if no info

    console.log(`Building navigation for role: ${role}`);

    // Define your navigation structure based on roles
    const roleMenus = {
        learner: [
            { label: 'My Dashboard', link: '/dashboard.html' },
            { label: 'Browse Projects', link: '/projects.html' },
            { label: 'Events', link: '/events.html' },
        ],
        expert: [
            { label: 'Expert Dashboard', link: '/expert-dashboard.html' },
            { label: 'My Projects', link: '/projects.html?filter=mine' },
            { label: 'Propose Event', link: '/events/propose.html' },
        ],
        admin: [
            { label: 'Admin Dashboard', link: '/admin-dashboard.html' },
            { label: 'User Management', link: '/admin/users.html' },
            { label: 'Content Approval', link: '/admin/approval.html' },
        ],
        guest: [
             { label: 'Login/Sign Up', link: '/login-signup.html' }
             // Maybe public links?
        ]
        // Add other roles (organizer, volunteer, etc.)
    };

    const items = roleMenus[role] || roleMenus['guest']; // Fallback safely
    menu.innerHTML = items.map(item => `<li><a href="<span class="math-inline">\{item\.link\}"\></span>{item.label}</a></li>`).join('');
}