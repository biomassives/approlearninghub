function redirectTo(path, delayMs = 0) {
    if (delayMs > 0) {
        setTimeout(() => { window.location.href = path; }, delayMs);
    } else {
        window.location.href = path;
    }
}

function redirectToDashboard(role, delayMs = 500) {
    const map = {
        admin: '/admin-dashboard.html',
        expert: '/expert-dashboard.html',
        // Add other role-specific dashboards
    };
    const url = map[role] || '/dashboard.html'; // Default dashboard
    redirectTo(url, delayMs);
}

export default { redirectTo, redirectToDashboard };