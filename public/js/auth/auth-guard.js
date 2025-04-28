import authService from './auth-service.js';
import routing from '../utils/routing.js';
import userSession from './user-session.js';

(async () => {
    try {
        // Use the 'me' endpoint which relies on HttpOnly cookie
        const response = await authService.me();
        if (response.success && response.user) {
            // User is authenticated, store/update local UI info just in case
            userSession.saveUserInfo(response.user);
            console.log('Auth guard: User authenticated.');
        } else {
            // Auth failed or no user data returned
            throw new Error(response.error || 'Not authenticated');
        }
    } catch (error) {
        console.error('Auth guard: Authentication check failed.', error.message);
        userSession.clearUserInfo(); // Clear any stale local info
        routing.redirectTo('/login-signup.html?reason=unauthenticated');
    }
})(); // Self-invoking async function