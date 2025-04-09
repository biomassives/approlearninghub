import { signIn, getCurrentUser } from './supabase-auth.js';
import { AUTH_REDIRECTS } from './supabase-config.js';

let turnstileToken = null;

window.onTurnstileLoad = function () {
  if (window.turnstile) {
    window.turnstile.render('#cloudflare-turnstile', {
      sitekey: '0x4AAAAAABHfsloPaPOmywDZ',
      callback: (token) => (turnstileToken = token),
      'expired-callback': () => (turnstileToken = null),
      'error-callback': () => (turnstileToken = null)
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorContainer = document.getElementById('error-container');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');

    if (!turnstileToken) {
      showError("Please complete the verification.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    setFormDisabled(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        const user = await getCurrentUser();
        const role = user?.role || 'user';
        const redirectTo = AUTH_REDIRECTS[role] || AUTH_REDIRECTS.user;
        window.location.href = redirectTo;
      } else {
        showError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred');
    } finally {
      setFormDisabled(false);
    }
  });

  function showError(message) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
  }

  function setFormDisabled(disabled) {
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      elements[i].disabled = disabled;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = disabled ? 'Logging in...' : 'Log In';
  }
});
