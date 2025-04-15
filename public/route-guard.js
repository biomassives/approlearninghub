// route-guard.js
// Simple role-based access guard using Supabase session

import { supabase } from './supabase-auth.js';

export async function protectRoute(allowedRoles = []) {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    window.location.href = '/login.html';
    return;
  }

  const role = data.user.user_metadata?.role || 'guest';

  if (!allowedRoles.includes(role)) {
    console.warn(`Access denied for role: ${role}`);
    window.location.href = '/unauthorized.html'; // 🔁 TRANSLATION HOOK HERE (optional)
  }
}
