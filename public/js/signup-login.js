import authService from './auth-service.js';
import { applyTranslations, initLanguageSwitcher } from './i18n.js';

// Utility: validate email format
function isValidEmail(email) {
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(email);
}

// Utility: set error text for a field
function setFieldError(formPrefix, field, msg) {
  const el = document.getElementById(`${formPrefix}-${field}-error`);
  if (el) el.textContent = msg;
}

// Utility: find and focus first invalid field in a form
function focusFirstInvalid(formPrefix, fields) {
  for (const f of fields) {
    const input = document.getElementById(`${formPrefix}-${f}`);
    const errEl = document.getElementById(`${formPrefix}-${f}-error`);
    if (errEl && errEl.textContent) {
      input?.focus();
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Translations setup
  try {
    initLanguageSwitcher();
    await applyTranslations({ '[data-i18n]': el => el.getAttribute('data-i18n') });
  } catch (err) {
    console.error('i18n init error:', err);
  }

  // API base
  authService.apiBase = '/api/auth';

  /*
  const DASHBOARD_ROUTES = {
    expert: '/expert-dashboard.html',
    learner: '/learner-dashboard.html',
    researcher: '/researcher-dashboard.html',
    resources: '/resources-dashboard.html',
    organizer: '/organizer-dashboard.html'
  };
  const redirectToDashboard = role => {
    window.location.href = DASHBOARD_ROUTES[role] || '/dashboard.html';
  };
  */

  function redirectToDashboard(role) {
    const map = {
      admin:  '/admin-dashboard.html',
      expert: '/expert-dashboard.html'
    };
    // everyone else → /dashboard.html
    const url = map[role] || '/dashboard.html';
    setTimeout(() => window.location.href = url, 1000);
  }
  

  // Cache elements
  const signupForm     = document.getElementById('signup-form');
  const signupButton   = document.getElementById('signup-button');
  const loginForm      = document.getElementById('login-form');
  const loginButton    = document.getElementById('login-button');
  const signupSection  = document.getElementById('signup-section');
  const loginSection   = document.getElementById('login-section');
  const showLoginLink  = document.getElementById('show-login-link');
  const showSignupLink = document.getElementById('show-signup-link');

  // Form toggle
  if (showLoginLink && signupSection && loginSection) {
    showLoginLink.addEventListener('click', e => {
      e.preventDefault();
      signupSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      showLoginLink.blur();
    });
  }
  if (showSignupLink && signupSection && loginSection) {
    showSignupLink.addEventListener('click', e => {
      e.preventDefault();
      loginSection.classList.add('hidden');
      signupSection.classList.remove('hidden');
      showSignupLink.blur();
    });
  }

  // Prevent double submissions
  const disableDuring = (btn, fn) => async e => {
    e.preventDefault();
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await fn(e);
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  };

  // Signup handler
  if (signupForm && signupButton) {
    signupForm.addEventListener('submit', disableDuring(signupButton, async () => {
      // Clear previous errors and status
      ['email','password','confirm-password','role','terms'].forEach(f => setFieldError('signup', f, ''));
      const statusArea = document.getElementById('signup-status-area');
      if (statusArea) statusArea.textContent = '';

      // Gather inputs
      const emailEl   = signupForm['email'];
      const pwdEl     = signupForm['password'];
      const confirmEl = signupForm['confirm-password'];
      const roleEl    = signupForm['role'];
      const termsEl   = signupForm['terms'];

      const email    = emailEl.value.trim();
      const password = pwdEl.value;
      const confirm  = confirmEl.value;
      const role     = roleEl.value;
      const terms    = termsEl.checked;

      // Validate
      let valid = true;
      if (!email || !isValidEmail(email)) {
        setFieldError('signup', 'email', window.T('email_invalid'));
        valid = false;
      }
      if (password.length < 6) {
        setFieldError('signup', 'password', window.T('password_too_short'));
        valid = false;
      }
      if (password !== confirm) {
        setFieldError('signup', 'confirm-password', window.T('confirm_password_mismatch'));
        valid = false;
      }
      if (!role) {
        setFieldError('signup', 'role', window.T('role_required'));
        valid = false;
      }
      if (!terms) {
        setFieldError('signup', 'terms', window.T('terms_required'));
        valid = false;
      }
      if (!valid) {
        focusFirstInvalid('signup', ['email','password','confirm-password','role','terms']);
        return;
      }

      // Call API
      try {
        const response = await authService.signup(email, password, role);
        const errMsg = response.error || response.message; 
        if (response.success) {
          statusArea.textContent = window.T('signup_success');
          setTimeout(() => redirectToDashboard(response.user.role), 1000);
        } else {
          statusArea.textContent = errMsg || window.T('signup_failed');
        }
      } catch (err) {
        console.error('Signup exception:', err);
        statusArea.textContent = err instanceof TypeError
          ? window.T('network_error')
          : window.T('unexpected_error');
      }
    }));
  }

  // Login handler
  if (loginForm && loginButton) {
    loginForm.addEventListener('submit', disableDuring(loginButton, async () => {
      // Clear errors/status
      ['email','password'].forEach(f => setFieldError('login', f, ''));
      const statusArea = document.getElementById('login-status-area');
      if (statusArea) statusArea.textContent = '';

      const emailEl = loginForm['email'];
      const pwdEl   = loginForm['password'];
      const email   = emailEl.value.trim();
      const pwd     = pwdEl.value;

      if (!email || !pwd) {
        statusArea.textContent = window.T('login_failed');
        focusFirstInvalid('login', ['email','password']);
        return;
      }

      try {
        const response = await authService.login(email, pwd);
        const errMsg   = response.error || response.message;
        if (response.success) {
          statusArea.textContent = window.T('login_success');
          setTimeout(() => redirectToDashboard(response.user.role), 500);
        } else {
          statusArea.textContent = errMsg || window.T('login_failed');
        }
      } catch (err) {
        console.error('Login exception:', err);
        statusArea.textContent = err instanceof TypeError
          ? window.T('network_error')
          : window.T('unexpected_error');
      }
    }));
  }
});
