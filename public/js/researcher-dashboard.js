// js/researcher-dashboard.js
import { loadSecureSession, clearSecureSession } from './session-crypto.js';

async function initResearcherDashboard() {
  const session = await loadSecureSession();
  if (!session || session.role !== 'researcher') {
    window.location.href = '/login.html';
    return;
  }

  const container = document.getElementById('research-feed');
  container.textContent = 'No research tasks at this time.';

  // TODO: Fetch research contributions via API and populate
}

document.addEventListener('DOMContentLoaded', initResearcherDashboard);
