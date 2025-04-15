// role-nav.js
// Populates a dropdown or side menu based on Supabase user role

import { loadSecureSession } from './session-crypto.js';

export async function buildRoleMenu(menuId = 'role-nav-menu', i18n = {}) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const session = await loadSecureSession();
  const role = session?.role || 'guest';

  const t = key => i18n[key] || key;  // 🔁 TRANSLATION LOOKUP FUNCTION

  const roleMenus = {
    user: [
      { label: t('View Modules'), link: '/modules.html' },
      { label: t('Watch Videos'), link: '/videos.html' }
    ],
    editor: [
      { label: t('Review Library Items'), link: '/review.html' },
      { label: t('Edit Metadata'), link: '/editor.html' },
      { label: t('Upload Panels'), link: '/upload.html' }
    ],
    admin: [
      { label: t('Dashboard'), link: '/admin-dashboard.html' },
      { label: t('User Management'), link: '/admin-panel.html' },
      { label: t('System Metrics'), link: '/metrics.html' },
      { label: t('Approve Clinics'), link: '/admin-clinics.html' }
    ]
  };

  const items = roleMenus[role] || [];
  menu.innerHTML = items.map(item => `<li><a href="${item.link}">${item.label}</a></li>`).join('');
}
