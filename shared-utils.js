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
