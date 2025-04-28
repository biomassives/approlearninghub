const UI_INFO_KEY = 'avh_ui_user_info';

export function saveUserInfo(userInfo) {
    if (!userInfo) return;
    try {
        // Only store expected non-sensitive fields
        const minimalInfo = {
            id: userInfo.id,
            email: userInfo.email,
            role: userInfo.role,
            // Add other necessary non-sensitive fields (e.g., name)
        };
        localStorage.setItem(UI_INFO_KEY, JSON.stringify(minimalInfo));
    } catch (e) {
        console.error("Failed to save user info to localStorage", e);
    }
}

export function getUserInfo() {
    try {
        const info = localStorage.getItem(UI_INFO_KEY);
        return info ? JSON.parse(info) : null;
    } catch (e) {
        console.error("Failed to retrieve user info from localStorage", e);
        return null;
    }
}

export function clearUserInfo() {
    localStorage.removeItem(UI_INFO_KEY);
}

export default { saveUserInfo, getUserInfo, clearUserInfo };