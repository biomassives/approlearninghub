// public/login.js

import { saveSecureSession } from './js/serverless-enhanced-auth.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const statusMessage = document.getElementById('status-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  statusMessage.textContent = '';
  statusMessage.classList.remove('text-red-600', 'text-green-600');

  try {
    const res = await fetch('/api/auth/login', {
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

      statusMessage.textContent = 'Login successful! Redirecting...';
      statusMessage.classList.add('text-green-600');

      const redirectTo = {
        admin: '/admin-dashboard.html',
        user: '/dashboard.html',
        expert: '/expert-dashboard.html'
      }[result.user.role] || '/dashboard.html';

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
    } else {
      showError(result.error || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('An unexpected error occurred.');
  }
});

function showError(msg) {
  statusMessage.textContent = msg;
  statusMessage.classList.add('text-red-600');
}
