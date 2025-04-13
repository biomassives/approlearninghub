// login.js
import { saveSecureSession } from './session-crypto.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorContainer = document.getElementById('error-container');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  errorContainer.textContent = '';
  errorContainer.classList.add('hidden');

  try {
    const res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (result.success) {
      await saveSecureSession({
        token: result.token,
        refreshToken: result.refreshToken,
        role: result.user.role,
        email: result.user.email
      });

      const redirectTo = {
        admin: '/admin-dashboard.html',
        user: '/dashboard.html',
        expert: '/expert-dashboard.html'
      }[result.user.role] || '/dashboard.html';

      window.location.href = redirectTo;
    } else {
      showError(result.error || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('An unexpected error occurred.');
  }
});

function showError(msg) {
  errorContainer.textContent = msg;
  errorContainer.classList.remove('hidden');
}
