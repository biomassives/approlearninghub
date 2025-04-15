// public/js/serverless-enhanced-auth.js

/**
 * Utility functions to help manage secure Supabase-based auth
 * Handles token storage, role loading, logout, and redirect enforcement
 */

const SUPABASE_URL = window?.ENV?.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = window?.ENV?.SUPABASE_ANON_KEY || 'your-anon-key';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Force redirect to login if not authenticated
export async function requireAuth(redirectUrl = '/login.html') {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = redirectUrl;
    return false;
  }

  return true;
}

// Get user, session, and token
export async function loadSecureSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return null;
  }

  return {
    session: data.session,
    user: data.session.user,
    token: data.session.access_token
  };
}

// Sign the user out
export async function signOut() {
  await supabase.auth.signOut();
}

// Check if user has the required role level
export function hasRequiredRole(userRole, requiredRoles = []) {
  return requiredRoles.includes(userRole);
}

export { saveSecureSession } from './session-crypto.js';
