import authService from '../auth/auth-service.js';
import userSession from '../auth/user-session.js';
import formValidator from '../utils/form-validator.js';
import routing from '../utils/routing.js';
// Optional: import { disableDuring, enableSubmitButton } from '../utils/dom-utils.js';

// --- Configuration ---
const passwordStrengthConfig = { minLength: 8 }; // Match signup form minlength

// --- DOM Element Caching ---
let signupForm, signupButton, signupStatusArea, signupPasswordInput;
let loginForm, loginButton, loginStatusArea;
let signupSection, loginSection, showLoginLink, showSignupLink;
let strengthBar, strengthLabel, strengthFeedback; // Password strength UI

function cacheDOMElements() {
    signupForm = document.getElementById('signup-form');
    signupButton = document.getElementById('signup-button');
    signupStatusArea = document.getElementById('signup-status-area');
    signupPasswordInput = document.getElementById('signup-password');

    loginForm = document.getElementById('login-form');
    loginButton = document.getElementById('login-button');
    loginStatusArea = document.getElementById('login-status-area');

    signupSection = document.getElementById('signup-section');
    loginSection = document.getElementById('login-section');
    showLoginLink = document.getElementById('show-login-link');
    showSignupLink = document.getElementById('show-signup-link');

    // Password Strength UI
    strengthBar = document.getElementById('signup-password-strength-bar');
    strengthLabel = document.getElementById('signup-password-strength-label');
    strengthFeedback = document.getElementById('signup-password-strength-feedback');
}

// --- Validation Rules ---
const signupRules = {
    email: { required: true, email: true },
    password: { required: true, minLength: passwordStrengthConfig.minLength },
    confirmPassword: { required: true, matchField: 'password' }, // Matches name attribute 'password'
    role: { required: true },
    terms: { required: true } // For checkbox type='checkbox'
};

const loginRules = {
    email: { required: true, email: true },
    password: { required: true }
};

// --- Event Handlers ---

// Utility to handle button state during async operations
async function handleAsyncSubmit(button, asyncFn) {
    button.disabled = true;
    button.classList.add('loading'); // Add a CSS class for loading state
    try {
        await asyncFn();
    } finally {
        button.disabled = false;
        button.classList.remove('loading');
    }
}


function handleSignupSubmit(event) {
    event.preventDefault();
    signupStatusArea.textContent = ''; // Clear previous general errors
    signupStatusArea.classList.remove('visible');

    handleAsyncSubmit(signupButton, async () => {
        const { valid, errors } = formValidator.validateForm(signupForm, signupRules);

        if (!valid) {
            // Focus first invalid field (optional, validator shows errors)
            // formValidator.focusFirstInvalid(signupForm); // Implement if needed
            console.warn('Signup validation failed:', errors);
            return;
        }

        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData.entries());
        // Remove confirmPassword before sending to API
        delete data.confirmPassword;

        try {
            const response = await authService.signup(data); // Assumes authService takes an object

            if (response.success && response.user) {
                userSession.saveUserInfo(response.user); // Save non-sensitive info
                routing.redirectToDashboard(response.user.role); // Redirect
            } else {
                signupStatusArea.textContent = response.error || 'Signup failed. Please try again.';
                signupStatusArea.classList.add('visible');
            }
        } catch (error) {
            console.error('Signup API error:', error);
            signupStatusArea.textContent = 'An unexpected error occurred during signup.';
            signupStatusArea.classList.add('visible');
        }
    });
}

function handleLoginSubmit(event) {
    event.preventDefault();
    loginStatusArea.textContent = ''; // Clear previous general errors
    loginStatusArea.classList.remove('visible');

    handleAsyncSubmit(loginButton, async () => {
        const { valid, errors } = formValidator.validateForm(loginForm, loginRules);

        if (!valid) {
            console.warn('Login validation failed:', errors);
            return;
        }

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await authService.login(data); // Assumes authService takes an object

            if (response.success && response.user) {
                userSession.saveUserInfo(response.user); // Save non-sensitive info
                routing.redirectToDashboard(response.user.role); // Redirect
            } else {
                loginStatusArea.textContent = response.error || 'Login failed. Please check your credentials.';
                loginStatusArea.classList.add('visible');
            }
        } catch (error) {
            console.error('Login API error:', error);
            loginStatusArea.textContent = 'An unexpected error occurred during login.';
            loginStatusArea.classList.add('visible');
        }
    });
}

function setupFormToggles() {
    if (showLoginLink && signupSection && loginSection) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        });
    }
    if (showSignupLink && signupSection && loginSection) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.add('hidden');
            signupSection.classList.remove('hidden');
        });
    }
}

function setupPasswordStrengthMeter() {
    if (!signupPasswordInput || !strengthBar || !strengthLabel || !strengthFeedback) return;

    const meter = formValidator.createPasswordStrengthMeter(passwordStrengthConfig);
    const uiElements = {
        meter: strengthBar,
        label: strengthLabel,
        feedback: strengthFeedback
        // Add check indicators if you have them in HTML
    };

    signupPasswordInput.addEventListener('input', (e) => {
        meter.updateUI(e.target.value, uiElements);
    });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    setupFormToggles();

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
        setupPasswordStrengthMeter(); // Setup listener for password input
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
});