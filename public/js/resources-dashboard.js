// public/js/resources-dashboard.js

import { requireAuth, checkAccess } from './supabase-auth.js';
import { apiFetch } from './supabase-client.js';

/**
 * Initialize the Resources Dashboard page:
 * 1. Ensure user is authenticated via Supabase
 * 2. Verify user has "resources" role
 * 3. Fetch protected resources via Express API
 * 4. Render resource items or show empty/error state
 */
async function initResourcesDashboard() {
  // 1️⃣ Authentication
  const authOk = await requireAuth();
  if (!authOk) return; // requireAuth redirects to login if unauthorized

  // 2️⃣ Role-based access
  const { allowed } = await checkAccess('resources')();
  if (!allowed) {
    window.location.href = '/login.html';
    return;
  }

  // 3️⃣ Fetch and display resources
  const container = document.getElementById('resources-list');
  container.textContent = 'Loading resources...';

  try {
    const data = await apiFetch('resources');
    const resources = data.resources || [];

    if (resources.length === 0) {
      container.textContent = 'Resource library is empty.';
    } else {
      container.innerHTML = resources
        .map(r => `<div class="resource-item">${r.title}</div>`)
        .join('');
    }
  } catch (err) {
    console.error('Failed to load resources:', err);
    container.textContent = 'Error loading resources. Please try again later.';
  }
}

document.addEventListener('DOMContentLoaded', initResourcesDashboard);
