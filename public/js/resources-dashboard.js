// js/resources-dashboard.js
import { loadSecureSession, clearSecureSession } from './session-crypto.js';

async function initResourcesDashboard() {
  const session = await loadSecureSession();
  if (!session || session.role !== 'resources') {
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('resources-list');
  container.textContent = 'Resource library is empty.';

  // TODO: Call API to list resources and display
}

document.addEventListener('DOMContentLoaded', initResourcesDashboard);