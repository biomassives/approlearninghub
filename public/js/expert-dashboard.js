// js/expert-dashboard.js
// Unified Expert Dashboard Entry Point
// Features:
// 1. Secure Session Load & Role Verification
// 2. Dynamic Greeting & User Meta Info
// 3. Lattice Session Crypto Verification
// 4. Settings UI Integration
// 5. Navigation & Activity Feed
// 6. Logout Handler

import authService from './auth-service.js';
import { loadSecureSession, hashMetaLattice, clearSecureSession } from './session-crypto.js';
import SettingsUI from './settings-ui.js';

// DOM Selectors
const greetingEl = document.getElementById('greeting');
const latticeInfoEl = document.getElementById('lattice-info');
const toolsListEl = document.getElementById('expert-tools');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');       // optional
const userRoleEl = document.getElementById('user-role');       // optional
const activityFeedEl = document.getElementById('activity-feed'); // optional

// Whitelisted Tool Links for Expert
const EXPERT_TOOLS = [
  { label: 'Assigned Modules',     href: '/expert/modules.html' },
  { label: 'Expert Reviews',       href: '/expert/reviews.html' },
  { label: 'Research Library',      href: '/library/categories' },
  { label: 'Mentorship Requests',   href: '/expert/mentorship.html' }
];

async function init() {
  // 1. Verify Supabase Session
  const session = await authService.getSession();
  if (!session.success || session.user.role !== 'expert') {
    window.location.href = '/login.html';
    return;
  }

  // 2. Load Secure Meta Lattice Data
  const secureSess = await loadSecureSession();
  if (!secureSess || secureSess.role !== 'expert') {
    clearSecureSession();
    window.location.href = '/login.html';
    return;
  }

  // 3. Populate Greeting & Sidebar
  const user = session.user;
  greetingEl.textContent = `Welcome, ${user.fullName || user.email}`;
  if (userNameEl) userNameEl.textContent = user.email.split('@')[0];
  if (userRoleEl) userRoleEl.textContent = 'Expert';

  // 4. Display Lattice Crypto Info
  const { metaLattice, latticeHash, email } = secureSess;
  const recomputedHash = await hashMetaLattice(metaLattice);
  latticeInfoEl.textContent =
    `Email: ${email}\n` +
    `MetaLattice: x=${metaLattice.x.toFixed(4)}, y=${metaLattice.y.toFixed(4)}, z=${metaLattice.z.toFixed(4)}, w=${metaLattice.w.toFixed(4)}\n` +
    `Stored Hash: ${latticeHash}\n` +
    `Recomputed Hash: ${recomputedHash}\n` +
    `Verified: ${latticeHash === recomputedHash}`;

  // 5. Initialize Settings UI
  const settingsUI = new SettingsUI({
    containerId: 'settings-container',
    modalId:     'settings-modal',
    enabledSections: ['profile','security','notifications','language'],
    onSave:      handleSettingsSave,
    onInvalidate: () => { clearSecureSession(); window.location.href = '/login.html'; }
  });
  document.getElementById('settings-btn')?.addEventListener('click', () => settingsUI.open());

  // 6. Render Expert Tools Navigation
  EXPERT_TOOLS.forEach(tool => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = tool.label;
    a.href = tool.href;
    li.appendChild(a);
    toolsListEl.appendChild(li);
  });

  // 7. Optional: Load Activity Feed
  if (activityFeedEl) {
    loadActivityFeed(activityFeedEl, user.id);
  }

  // 8. Logout Handler
  logoutBtn.addEventListener('click', async () => {
    clearSecureSession();
    await authService.logout();
    window.location.href = '/login.html';
  });
}

// Settings save callback
async function handleSettingsSave(updatedPrefs) {
  // Persist settings via API then refresh UI
  try {
    await fetch('/api/admin/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPrefs)
    });
    alert('Settings saved!');
  } catch (err) {
    console.error('Settings save failed', err);
    alert('Failed to save settings.');
  }
}

// Example activity loader stub
async function loadActivityFeed(container, userId) {
  const res = await fetch(`/api/expert/activities?userId=${userId}`);
  const data = await res.json();
  data.activities.forEach(act => {
    const div = document.createElement('div');
    div.textContent = `• ${act.timestamp}: ${act.text}`;
    container.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', init);
