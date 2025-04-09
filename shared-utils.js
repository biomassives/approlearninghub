// shared-utils.js
// General utilities shared across Approvideo pages

// Show user messages (info, success, error)
export function showMessage(message, type = 'info', containerId = 'settings-message-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.textContent = message;
  container.className = `message ${type}-message`;

  // Auto-hide for info/success
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      container.textContent = '';
      container.className = 'message';
    }, 5000);
  }
}

// Toggle visibility of an element
export function toggleElement(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}

// Render a dropdown menu toggle
export function setupDropdownMenu(buttonSelector, menuSelector) {
  const button = document.querySelector(buttonSelector);
  const menu = document.querySelector(menuSelector);
  if (button && menu) {
    button.addEventListener('click', () => {
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
    });
    window.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }
}

// Confirm a destructive action
export function confirmAction(message = 'Are you sure?') {
  return window.confirm(message);
}

// Download JSON data as file
export function downloadJson(data, filename = 'data.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 

// Get current timestamp in readable format
export function getReadableTimestamp() {
  return new Date().toLocaleString();
}

// Capitalize first letter
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Check if user has required role
export function hasRole(userRole, requiredRoles = []) {
  return requiredRoles.includes(userRole);
}


export function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: type === 'success' ? '#2ecc71' :
                type === 'error' ? '#e74c3c' :
                type === 'warning' ? '#f39c12' : '#3498db',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '5px',
    fontSize: '14px',
    zIndex: 10000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    opacity: 0,
    transition: 'opacity 0.3s ease-in-out'
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.opacity = 1);

  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


export function loadStoredEvents(key = 'dashboardEvents') {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data).map(ev => ({
      ...ev,
      startDate: new Date(ev.startDate),
      endDate: new Date(ev.endDate)
    })) : [];
  } catch (err) {
    console.warn('[loadStoredEvents] Failed to parse:', err);
    return [];
  }
}

export function saveStoredEvents(events, key = 'dashboardEvents') {
  try {
    localStorage.setItem(key, JSON.stringify(events));
  } catch (err) {
    console.error('[saveStoredEvents] Failed to save:', err);
  }
}




export function formatDateRange(start, end) {
  const s = new Date(start).toLocaleDateString();
  const e = new Date(end).toLocaleDateString();
  return s === e ? s : `${s} - ${e}`;
}

