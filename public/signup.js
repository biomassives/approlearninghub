// public/signup.js

import { saveSecureSession } from './js/serverless-enhanced-auth.js';

const form = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const roleInput = document.getElementById('role');
const errorContainer = document.getElementById('error-container');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('[Signup] Form submitted');

  errorContainer.textContent = '';
  errorContainer.classList.add('hidden');

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const role = roleInput.value;

  if (password !== confirmPassword) {
    showError("❌ Passwords don't match");
    return;
  }

  if (password.length < 8) {
    showError("❌ Password must be at least 8 characters");
    return;
  }

  if (!role) {
    showError("❌ Please select a role to continue");
    return;
  }

  setFormDisabled(true);

  try {
    console.log('[Signup] Sending request to /api/auth/signup');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });

    const result = await res.json();
    console.log('[Signup] Response received:', result);

    if (res.ok && result.success) {
      const { token, refreshToken, user } = result;

      console.log('[Signup] Saving secure session');
      await saveSecureSession({
        token,
        refreshToken,
        email: user.email,
        role: user.role,
        id: user.id
      });

      const redirect = {
        admin: '/admin-dashboard.html',
        expert: '/expert-dashboard.html',
        learner: '/dashboard.html',
        resources: '/dashboard.html',
        researcher: '/dashboard.html',
        organizer: '/dashboard.html'
      }[user.role] || '/dashboard.html';

      console.log(`[Signup] Redirecting to ${redirect}`);
      window.location.href = redirect;
    } else {
      showError(result.error || 'Signup failed.');
    }
  } catch (err) {
    console.error('[Signup] Unexpected error:', err);
    showError('An unexpected error occurred.');
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
  submitButton.textContent = disabled ? 'Processing...' : 'Sign Up';
}
