// signup.js - Signup page functionality for ApproVideo Hub
import authService from './auth-service.js';
import { setupTranslations, T } from './translations.js';

// Elements
const form = document.getElementById('signup-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const roleSelect = document.getElementById('role');
const termsCheckbox = document.getElementById('terms');
const togglePasswordButton = document.getElementById('toggle-password');
const eyeClosedIcon = document.getElementById('eye-closed');
const eyeOpenIcon = document.getElementById('eye-open');
const signupSpinner = document.getElementById('signup-spinner');
const statusArea = document.getElementById('status-area');
const statusMessage = document.getElementById('status-message');
const statusIcon = document.getElementById('status-icon');
const nameError = document.getElementById('name-error');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const confirmPasswordError = document.getElementById('confirm-password-error');
const termsError = document.getElementById('terms-error');
const passwordStrength = document.getElementById('password-strength');
const passwordStrengthBar = document.getElementById('password-strength-bar');
const passwordStrengthText = document.getElementById('password-strength-text');
const passwordRequirements = document.getElementById('password-requirements');
const langSwitcher = document.getElementById('lang-switch');
const securityStatus = document.getElementById('security-status');

// Password requirements
const reqLength = document.getElementById('req-length');
const reqUppercase = document.getElementById('req-uppercase');
const reqLowercase = document.getElementById('req-lowercase');
const reqNumber = document.getElementById('req-number');

// Initialize
document.addEventListener('DOMContentLoaded', initSignupPage);

/**
 * Initialize the signup page
 */
async function initSignupPage() {
  // Set up translations
  await setupTranslations();
  
  // Apply translations
  applyTranslations();
  
  // Check if already logged in
  if (authService.isLoggedIn()) {
    showStatusMessage('info', T('already_logged_in'));
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
    return;
  }
  
  // Add event listeners
  form.addEventListener('submit', handleSignupSubmit);
  togglePasswordButton.addEventListener('click', togglePasswordVisibility);
  passwordInput.addEventListener('input', updatePasswordStrength);
  passwordInput.addEventListener('focus', () => {
    passwordStrength.classList.remove('hidden');
  });
  
  // Set up input validation
  nameInput.addEventListener('blur', validateName);
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);
  confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
  termsCheckbox.addEventListener('change', validateTerms);
  
  // Set up language switcher
  if (langSwitcher) {
    langSwitcher.addEventListener('change', handleLanguageChange);
  }
  
  // Update security status
  updateSecurityStatus();
  
  // Focus on name field
  nameInput.focus();
}

/**
 * Apply translations to the page
 */
function applyTranslations() {
  document.querySelector('h1').textContent = T('signup_title', 'Create an Account');
  document.querySelector('label[for="name"]').textContent = T('name_label', 'Full Name');
  document.querySelector('label[for="email"]').textContent = T('email_label', 'Email Address');
  document.querySelector('label[for="password"]').textContent = T('password_label', 'Password');
  document.querySelector('label[for="confirm-password"]').textContent = T('confirm_password_label', 'Confirm Password');
  document.querySelector('label[for="role"]').textContent = T('account_type_label', 'Account Type');
  document.querySelector('button[type="submit"] span').textContent = T('create_account_button', 'Create Account');
  document.querySelector('a[href="login.html"]').textContent = T('login_link', 'Already have an account? Log in');
  securityStatus.textContent = T('secure_connection', 'Secure Connection');
}

/**
 * Handle signup form submission
 * @param {Event} e - Form submit event
 */
async function handleSignupSubmit(e) {
  e.preventDefault();
  
  // Clear previous errors
  clearErrors();
  
  // Get form values
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const role = roleSelect.value;
  const termsAccepted = termsCheckbox.checked;
  
  // Validate all inputs
  const isNameValid = validateName();
  const isEmailValid = validateEmail();
  const isPasswordValid = validatePassword();
  const isConfirmPasswordValid = validateConfirmPassword();
  const areTermsAccepted = validateTerms();
  
  // If any validation fails, stop here
  if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !areTermsAccepted) {
    return;
  }
  
  // Show loading state
  setLoadingState(true);
  
  try {
    // Register user
    const result = await authService.register({
      name,
      email,
      password,
      role
    });
    
    if (result.success) {
      // Show success message
      showStatusMessage('success', T('registration_success', 'Account created successfully! Redirecting to login page...'));
      
      // Redirect to login page after delay
      setTimeout(() => {
        window.location.href = `/login.html?email=${encodeURIComponent(email)}&registered=true`;
      }, 2000);
    } else {
      // Show error message
      showStatusMessage('error', result.error || T('registration_failed', 'Registration failed'));
      setLoadingState(false);
    }
  } catch (error) {
    console.error('Registration error:', error);
    showStatusMessage('error', T('unexpected_error', 'An unexpected error occurred. Please try again later.'));
    setLoadingState(false);
  }
}

/**
 * Validate name input
 * @returns {boolean} True if name is valid
 */
function validateName() {
  const name = nameInput.value.trim();
  
  if (!name) {
    showInputError(nameError, T('name_required', 'Name is required'));
    return false;
  }
  
  if (name.length < 2) {
    showInputError(nameError, T('name_too_short', 'Name must be at least 2 characters'));
    return false;
  }
  
  hideInputError(nameError);
  return true;
}

/**
 * Validate email input
 * @returns {boolean} True if email is valid
 */
function validateEmail() {
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    showInputError(emailError, T('email_required', 'Email is required'));
    return false;
  }
  
  if (!emailRegex.test(email)) {
    showInputError(emailError, T('email_invalid', 'Please enter a valid email address'));
    return false;
  }
  
  hideInputError(emailError);
  return true;
}

/**
 * Validate password input
 * @returns {boolean} True if password is valid
 */
function validatePassword() {
  const password = passwordInput.value;
  
  if (!password) {
    showInputError(passwordError, T('password_required', 'Password is required'));
    return false;
  }
  
  if (password.length < 8) {
    showInputError(passwordError, T('password_too_short', 'Password must be at least 8 characters'));
    return false;
  }
  
  // Check for at least one uppercase letter, one lowercase letter, and one number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber) {
    showInputError(passwordError, T(
      'password_requirements', 
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ));
    return false;
  }
  
  hideInputError(passwordError);
  return true;
}

/**
 * Validate confirm password input
 * @returns {boolean} True if confirm password is valid
 */
function validateConfirmPassword() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (!confirmPassword) {
    showInputError(confirmPasswordError, T('confirm_password_required', 'Please confirm your password'));
    return false;
  }
  
  if (password !== confirmPassword) {
    showInputError(confirmPasswordError, T('passwords_dont_match', 'Passwords do not match'));
    return false;
  }
  
  hideInputError(confirmPasswordError);
  return true;
}

/**
 * Validate terms checkbox
 * @returns {boolean} True if terms are accepted
 */
function validateTerms() {
  const termsAccepted = termsCheckbox.checked;
  
  if (!termsAccepted) {
    showInputError(termsError, T('terms_required', 'You must accept the Terms of Service and Privacy Policy'));
    return false;
  }
  
  hideInputError(termsError);
  return true;
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength() {
  const password = passwordInput.value;
  let strengthScore = 0;
  
  // Check password length
  const lengthScore = Math.min(password.length / 2, 4);
  strengthScore += lengthScore;
  
  // Update length requirement
  if (password.length >= 8) {
    reqLength.classList.add('text-green-600');
    reqLength.querySelector('svg').classList.add('text-green-600');
  } else {
    reqLength.classList.remove('text-green-600');
    reqLength.querySelector('svg').classList.remove('text-green-600');
  }
  
  // Check for uppercase letters
  const hasUppercase = /[A-Z]/.test(password);
  if (hasUppercase) {
    strengthScore += 1;
    reqUppercase.classList.add('text-green-600');
    reqUppercase.querySelector('svg').classList.add('text-green-600');
  } else {
    reqUppercase.classList.remove('text-green-600');
    reqUppercase.querySelector('svg').classList.remove('text-green-600');
  }
  
  // Check for lowercase letters
  const hasLowercase = /[a-z]/.test(password);
  if (hasLowercase) {
    strengthScore += 1;
    reqLowercase.classList.add('text-green-600');
    reqLowercase.querySelector('svg').classList.add('text-green-600');
  } else {
    reqLowercase.classList.remove('text-green-600');
    reqLowercase.querySelector('svg').classList.remove('text-green-600');
  }
  
  // Check for numbers
  const hasNumber = /[0-9]/.test(password);
  if (hasNumber) {
    strengthScore += 1;
    reqNumber.classList.add('text-green-600');
    reqNumber.querySelector('svg').classList.add('text-green-600');
  } else {
    reqNumber.classList.remove('text-green-600');
    reqNumber.querySelector('svg').classList.remove('text-green-600');
  }
  
  // Check for special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    strengthScore += 1;
  }
  
  // Convert score to percentage (max score is 7)
  const strengthPercentage = Math.min(Math.round((strengthScore / 7) * 100), 100);
  
  // Update strength bar
  passwordStrengthBar.style.width = `${strengthPercentage}%`;
  
  // Update strength text and color
  if (strengthPercentage < 30) {
    passwordStrengthBar.className = 'h-2.5 rounded-full bg-red-500';
    passwordStrengthText.textContent = 'Weak';
    passwordStrengthText.className = 'ml-2 text-xs text-red-600';
  } else if (strengthPercentage < 60) {
    passwordStrengthBar.className = 'h-2.5 rounded-full bg-yellow-500';
    passwordStrengthText.textContent = 'Fair';
    passwordStrengthText.className = 'ml-2 text-xs text-yellow-600';
  } else if (strengthPercentage < 80) {
    passwordStrengthBar.className = 'h-2.5 rounded-full bg-blue-500';
    passwordStrengthText.textContent = 'Good';
    passwordStrengthText.className = 'ml-2 text-xs text-blue-600';
  } else {
    passwordStrengthBar.className = 'h-2.5 rounded-full bg-green-500';
    passwordStrengthText.textContent = 'Strong';
    passwordStrengthText.className = 'ml-2 text-xs text-green-600';
  }
}