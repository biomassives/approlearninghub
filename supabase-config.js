// supabase-config.js
// Centralized configuration for Supabase integration
// This file provides a clean abstraction layer for all Supabase interactions

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase connection configuration
// In a production environment, these would be environment variables
const SUPABASE_CONFIG = {
  url: 'https://dsqhmcjxgcwxcuincibs.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcWhtY2p4Z2N3eGN1aW5jaWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNzg0MjksImV4cCI6MjA1ODg1NDQyOX0.lTMJOniqzbgkpADjNUnPaDfdp7Ps_34GX9_2f9eBvXE',
  redirectBaseUrl: window.location.origin,
  tables: {
    userRoles: 'user_roles',
    userProfiles: 'user_profiles'
  },
  roles: {
    user: 'user',
    editor: 'editor',
    admin: 'admin'
  }
};

// Create and export Supabase client
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Role-based access control hierarchy
// This defines which roles have access to which resources
export const ROLE_HIERARCHY = {
  [SUPABASE_CONFIG.roles.user]: [SUPABASE_CONFIG.roles.user],
  [SUPABASE_CONFIG.roles.editor]: [SUPABASE_CONFIG.roles.user, SUPABASE_CONFIG.roles.editor],
  [SUPABASE_CONFIG.roles.admin]: [SUPABASE_CONFIG.roles.user, SUPABASE_CONFIG.roles.editor, SUPABASE_CONFIG.roles.admin]
};

// Helper function to check if a role has access to a required role
export function roleHasAccess(userRole, requiredRole) {
  if (!userRole || !requiredRole) return false;
  
  const hierarchy = ROLE_HIERARCHY[userRole] || [];
  return hierarchy.includes(requiredRole);
}

// Default redirect config for authentication flows
export const AUTH_REDIRECTS = {
  signUp: `${SUPABASE_CONFIG.redirectBaseUrl}/verify.html`,
  passwordReset: `${SUPABASE_CONFIG.redirectBaseUrl}/reset-password.html`,
  login: `${SUPABASE_CONFIG.redirectBaseUrl}/dashboard.html`,
  logout: `${SUPABASE_CONFIG.redirectBaseUrl}/login.html`,
};

// Functions for data table access
export const DataAccess = {
  // User Roles
  userRoles: {
    getByUserId: async (userId) => {
      if (!userId) return { data: null, error: new Error('User ID is required') };
      
      return await supabase
        .from(SUPABASE_CONFIG.tables.userRoles)
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
    },
    
    setRole: async (userId, role) => {
      if (!userId) return { error: new Error('User ID is required') };
      if (!Object.values(SUPABASE_CONFIG.roles).includes(role)) {
        return { error: new Error('Invalid role specified') };
      }
      
      // Check if user already has a role
      const { data: existingRole } = await DataAccess.userRoles.getByUserId(userId);
      
      if (existingRole) {
        // Update existing role
        return await supabase
          .from(SUPABASE_CONFIG.tables.userRoles)
          .update({ role })
          .eq('user_id', userId);
      } else {
        // Create new role
        return await supabase
          .from(SUPABASE_CONFIG.tables.userRoles)
          .insert({ user_id: userId, role });
      }
    },
    
    getAllUsers: async () => {
      return await supabase
        .from(SUPABASE_CONFIG.tables.userRoles)
        .select(`
          user_id,
          role,
          users:user_id (email)
        `)
        .order('role');
    }
  },
  
  // User Profiles - extend as needed
  userProfiles: {
    getByUserId: async (userId) => {
      if (!userId) return { data: null, error: new Error('User ID is required') };
      
      return await supabase
        .from(SUPABASE_CONFIG.tables.userProfiles)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    },
    
    updateProfile: async (userId, profileData) => {
      if (!userId) return { error: new Error('User ID is required') };
      
      // Check if profile exists
      const { data: existingProfile } = await DataAccess.userProfiles.getByUserId(userId);
      
      if (existingProfile) {
        // Update existing profile
        return await supabase
          .from(SUPABASE_CONFIG.tables.userProfiles)
          .update(profileData)
          .eq('user_id', userId);
      } else {
        // Create new profile
        return await supabase
          .from(SUPABASE_CONFIG.tables.userProfiles)
          .insert({ user_id: userId, ...profileData });
      }
    }
  }
};

// Error handling helper
export function handleSupabaseError(error, customMessage = null) {
  console.error('Supabase error:', error);
  
  // Map common error codes to user-friendly messages
  const errorMessages = {
    'PGRST106': 'Database schema error. Please contact support.',
    'PGRST116': 'Resource not found.',
    'auth/invalid-email': 'The email address is invalid.',
    'auth/user-disabled': 'This user account has been disabled.',
    'auth/user-not-found': 'No user found with this email address.',
    'auth/wrong-password': 'The password is invalid.'
  };
  
  const friendlyMessage = customMessage || 
                         errorMessages[error.code] || 
                         error.message || 
                         'An unexpected error occurred';
                         
  return {
    success: false,
    error: friendlyMessage,
    originalError: error
  };
}
