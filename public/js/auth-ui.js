// auth-ui.js - Connect the UI elements to the authentication service

class AuthService {
} 

window.authService = new AuthService();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize authentication service
    await window.authService.init();
    
    // Auth Modal Elements
    const authModal = document.getElementById('auth-modal');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const closeAuthModalButton = document.getElementById('close-auth-modal');
    const emailLoginForm = document.getElementById('email-login-form');
    const loginWithEmailButton = document.getElementById('login-with-email');
    const emailInput = document.getElementById('email-input');
    const passwordField = document.getElementById('password-field');
    const passwordInput = document.getElementById('password-input');
    const submitEmailLogin = document.getElementById('submit-email-login');
    
    // Dashboard Elements
    const getStartedButtonDashboard = document.getElementById('get-started-button-dashboard');
    const loginLinkDashboard = document.getElementById('login-link-dashboard');
    
    // User Menu Elements
    const userProfileTopRight = document.getElementById('user-profile-top-right');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('logout-button');
    
    // Settings Elements
    const localAuthRadio = document.getElementById('local-auth');
    const supabaseAuthRadio = document.getElementById('supabase-auth');
    const localAuthDesc = document.getElementById('local-auth-desc');
    const supabaseAuthDesc = document.getElementById('supabase-auth-desc');
    const saveAuthSettings = document.getElementById('save-auth-settings');
    
    // Toast notification function
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        toast.className = `p-4 mb-3 rounded-lg shadow-md transition-opacity duration-500 ${
            type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        
        toast.innerHTML = message;
        toastContainer.appendChild(toast);
        
        // Fade out and remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500);
        }, 3000);
    }
    
    // Show loading overlay
    function showLoading(message = 'Loading...') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');
        
        loadingMessage.textContent = message;
        loadingOverlay.classList.remove('hidden');
    }
    
    // Hide loading overlay
    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('hidden');
    }
    
    // Toggle password visibility for login/register
    function setupPasswordField() {
        if (!emailInput.value) {
            passwordField.classList.add('hidden');
            return;
        }
        
        passwordField.classList.remove('hidden');
    }
    
    // Event: Login button click
    loginButton.addEventListener('click', () => {
        // Reset the form
        emailLoginForm.classList.add('hidden');
        passwordField.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        
        authModal.classList.remove('hidden');
    });
    
    // Event: Register button click
    registerButton.addEventListener('click', () => {
        // Reset the form
        emailLoginForm.classList.add('hidden');
        passwordField.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        
        authModal.classList.remove('hidden');
    });
    
    // Event: Close auth modal
    closeAuthModalButton.addEventListener('click', () => {
        authModal.classList.add('hidden');
    });
    
    // Event: Toggle email login form
    loginWithEmailButton.addEventListener('click', () => {
        emailLoginForm.classList.toggle('hidden');
    });
    
    // Event: Email input change - show password field
    emailInput.addEventListener('input', setupPasswordField);
    
    // Event: Login/Register submission
    submitEmailLogin.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showToast('Please enter both email and password.', 'error');
            return;
        }
        
        showLoading('Authenticating...');
        
        try {
            // First try to login
            const loginResult = await window.authService.login(email, password);
            
            if (loginResult.success) {
                // Login successful
                hideLoading();
                authModal.classList.add('hidden');
                showToast(`Welcome back, ${loginResult.user.name}!`);
            } else {
                // If login fails, try to register
                const registerResult = await window.authService.register(email, password, email.split('@')[0]);
                
                if (registerResult.success) {
                    // Registration successful
                    hideLoading();
                    authModal.classList.add('hidden');
                    showToast('Account created successfully! Welcome!');
                } else {
                    // Both login and registration failed
                    hideLoading();
                    showToast(registerResult.error, 'error');
                }
            }
        } catch (error) {
            hideLoading();
            showToast(`Authentication error: ${error.message}`, 'error');
        }
    });
    
    // Event: Get Started button on dashboard
    if (getStartedButtonDashboard) {
        getStartedButtonDashboard.addEventListener('click', () => {
            authModal.classList.remove('hidden');
        });
    }
    
    // Event: Login link on dashboard
    if (loginLinkDashboard) {
        loginLinkDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.remove('hidden');
        });
    }
    
    // Event: User profile click to toggle dropdown
    if (userProfileTopRight) {
        userProfileTopRight.addEventListener('click', () => {
            userDropdown.classList.toggle('hidden');
        });
    }
    
    // Event: Logout button click
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            showLoading('Logging out...');
            
            try {
                await window.authService.logout();
                hideLoading();
                showToast('You have been logged out successfully.');
                
                // Hide the user dropdown
                userDropdown.classList.add('hidden');
                
                // Redirect to dashboard
                window.location.hash = '#';
                const dashboardSection = document.getElementById('dashboard-section');
                if (dashboardSection) {
                    hideAllSectionsExcept('dashboard-section');
                }
            } catch (error) {
                hideLoading();
                showToast(`Logout error: ${error.message}`, 'error');
            }
        });
    }
    
    // Settings page auth method toggle events
    if (localAuthRadio && supabaseAuthRadio) {
        // Initialize radio buttons based on current setting
        localAuthRadio.checked = !window.authConfig.useSupabase;
        supabaseAuthRadio.checked = window.authConfig.useSupabase;
        
        // Show relevant description
        localAuthDesc.classList.toggle('hidden', window.authConfig.useSupabase);
        supabaseAuthDesc.classList.toggle('hidden', !window.authConfig.useSupabase);
        
        // Event: Local auth radio change
        localAuthRadio.addEventListener('change', () => {
            if (localAuthRadio.checked) {
                localAuthDesc.classList.remove('hidden');
                supabaseAuthDesc.classList.add('hidden');
            }
        });
        
        // Event: Supabase auth radio change
        supabaseAuthRadio.addEventListener('change', () => {
            if (supabaseAuthRadio.checked) {
                localAuthDesc.classList.add('hidden');
                supabaseAuthDesc.classList.remove('hidden');
            }
        });
        
        // Event: Save auth settings button click
        saveAuthSettings.addEventListener('click', async () => {
            const useSupabase = supabaseAuthRadio.checked;
            
            // If the auth method is changing
            if (useSupabase !== window.authConfig.useSupabase) {
                showLoading('Updating authentication settings...');
                
                try {
                    // Update the auth config
                    window.authConfig.toggleAuthMethod(useSupabase);
                    
                    // Log the user out
                    await window.authService.logout();
                    
                    hideLoading();
                    showToast(
                        'Authentication settings updated. You have been logged out. Please login again using your new authentication method.',
                        'info'
                    );
                    
                    // Redirect to dashboard
                    window.location.hash = '#';
                    hideAllSectionsExcept('dashboard-section');
                } catch (error) {
                    hideLoading();
                    showToast(`Error updating settings: ${error.message}`, 'error');
                }
            } else {
                showToast('Authentication settings saved.', 'success');
            }
        });
    }
    
    // Initialize account settings form with current user data
    function initializeAccountSettings() {
        const displayNameInput = document.getElementById('display-name');
        const emailSettingsInput = document.getElementById('email-settings');
        
        if (displayNameInput && emailSettingsInput) {
            const currentUser = window.authService.getCurrentUser();
            
            if (currentUser) {
                displayNameInput.value = currentUser.name || '';
                emailSettingsInput.value = currentUser.email || '';
            }
        }
    }
    
    // Event: Profile menu item click
    document.getElementById('profile-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        hideAllSectionsExcept('profile-section');
    });
    
    // Event: Certificates menu item click
    document.getElementById('cert-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        hideAllSectionsExcept('certificates-section');
    });
    
    // Event: Settings menu item click
    document.getElementById('settings-menu')?.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        hideAllSectionsExcept('settings-section');
        initializeAccountSettings();
    });
    
    // Save account settings
    document.getElementById('save-account-settings')?.addEventListener('click', async () => {
        const displayNameInput = document.getElementById('display-name');
        
        if (!displayNameInput || !displayNameInput.value.trim()) {
            showToast('Please enter a display name.', 'error');
            return;
        }
        
        showLoading('Saving account settings...');
        
        // Implementation for updating user profile would go here
        // This is a placeholder - in a real app, you'd update the user's name
        // in either Dexie.js or Supabase depending on the current auth method
        
        setTimeout(() => {
            hideLoading();
            showToast('Account settings saved successfully.');
        }, 1000);
    });
    
    // Save notification settings
    document.getElementById('save-notification-settings')?.addEventListener('click', () => {
        showLoading('Saving notification settings...');
        
        // Implementation for saving notification preferences would go here
        
        setTimeout(() => {
            hideLoading();
            showToast('Notification settings saved successfully.');
        }, 1000);
    });
    
    // Delete account button
    document.getElementById('delete-account')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            showLoading('Deleting account...');
            
            // Implementation for account deletion would go here
            
            setTimeout(async () => {
                hideLoading();
                showToast('Your account has been deleted.');
                
                // Log out the user
                await window.authService.logout();
                
                // Redirect to dashboard
                window.location.hash = '#';
                hideAllSectionsExcept('dashboard-section');
            }, 1500);
        }
    });
    
    // Close the user dropdown when clicking outside of it
    document.addEventListener('click', (e) => {
        if (
            userDropdown && 
            !userDropdown.classList.contains('hidden') && 
            !userProfileTopRight.contains(e.target) && 
            !userDropdown.contains(e.target)
        ) {
            userDropdown.classList.add('hidden');
        }
    });
});

// Function to hide all sections except the specified one
function hideAllSectionsExcept(sectionId) {
    const sections = [
        'dashboard-section', 
        'welcome-section', 
        'learning-modules-section', 
        'clinics-section', 
        'smallgrants-section', 
        'library-section', 
        'terms-section', 
        'privacy-section',
        'about-section',
        'team-section',
        'profile-section',
        'settings-section',
        'blog-section',
        'certificates-section',
        'faq-section',
        'clinic-section'
    ];
    
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            if (id === sectionId) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        }
    });
}

export window.authService();