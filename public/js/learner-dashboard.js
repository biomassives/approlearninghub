// js/learner-dashboard.js
import { loadSecureSession, clearSecureSession } from './session-crypto.js';

async function initLearnerDashboard() {
  const session = await loadSecureSession();
  if (!session || session.role !== 'learner') {
    window.location.href = '/login.html';
    return;
  }

  // Example placeholder: load modules
  const container = document.getElementById('modules-list');
  container.textContent = 'You have no assigned modules yet.';

  // TODO: Fetch and render real modules via API
}

document.addEventListener('DOMContentLoaded', initLearnerDashboard);
