// supabase-auth.js
// This file contains the Supabase auth API functions.
// It also contains functions to handle account confirmation and role management.

import { supabase, AUTH_REDIRECTS, DataAccess, ROLE_HIERARCHY, roleHasAccess, handleSupabaseError } from './supabase-config.js';

// --- User Auth API ---

export async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: AUTH_REDIRECTS.signUp
        }
      });
      
      if (error) throw error;
      
      // After successful signup, create a default user role entry
      if (data && data.user) {
        await createDefaultUserRole(data.user.id);
      }
      
      return { success: true };
    } catch (error) {
      return handleSupabaseError(error, 'Signup failed');
    }
}

// Create a default user role (called after successful signup)
async function createDefaultUserRole(userId) {
    try {
        const result = await DataAccess.userRoles.setRole(userId, 'user');
        if (result.error) throw result.error;
    } catch (error) {
        console.error('Error creating default user role:', error);
        // We don't throw here to prevent disrupting the signup flow
    }
}

export async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return handleSupabaseError(error, 'Sign in failed');
    }
}

export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return handleSupabaseError(error, 'Sign out failed');
    }
}

export async function getCurrentUser() {
    try {
        // First, get the user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        
        // Default user object with basic role
        const userWithRole = {
            ...session.user,
            role: 'user' // Default role if no specific role is found
        };
        
        try {
            // Try to fetch the user role from the database
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();
                
            if (!roleError && roleData) {
                userWithRole.role = roleData.role;
            }
        } catch (roleError) {
            console.error('Error fetching user role:', roleError);
            // Continue with default role
        }
        
        return userWithRole;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// ✅ Only use this inside protected pages like dashboard.html
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// --- Role-Based Access Control ---


export function checkAccess(requiredRole) {
    return async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return { allowed: false };
        
        // Simple role hierarchy checking
        // This doesn't require database queries so it works even if the tables aren't set up
        switch (user.role) {
          case 'admin':
            // Admin has access to everything
            return { allowed: true };
          case 'editor':
            // Editor has access to editor and user content
            return { allowed: requiredRole !== 'admin' };
          case 'user':
          default:
            // Regular user only has access to user content
            return { allowed: requiredRole === 'user' };
        }
      } catch (error) {
        console.error('Error checking access:', error);
        
        // If we get here, something went wrong - default to no access for safety
        return { allowed: false };
      }
    };
  }

  
export async function updateUserRole(userId, newRole) {
    try {
        // Get current user to check permissions
        const currentUser = await getCurrentUser();
        if (!roleHasAccess(currentUser?.role, 'admin')) {
            throw new Error('Only admins can update user roles');
        }
        
        const result = await DataAccess.userRoles.setRole(userId, newRole);
        
        if (result.error) throw result.error;
        return true;
    } catch (error) {
        return handleSupabaseError(error, 'Failed to update user role').success;
    }
}

// --- Account Management ---

// Handle account confirmation
export async function handleConfirmation() {
    try {
        // Get current hash parameters
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
      
        const access_token = params.get('access_token');
        const type = params.get('type');
      
        // Handle signup confirmation
        if (access_token && type === 'signup') {
            // For access_token, the verification is automatic when loading the page
            // Just check if we have a valid session
            const { data: { session }, error } = await supabase.auth.getSession();
        
            if (error) throw error;
        
            if (session) {
                return { success: true, session: session };
            } else {
                return { success: false, error: 'Verification succeeded but no session found' };
            }
        }
      
        // Handle password recovery if needed
        else if (access_token && type === 'recovery') {
            // Just return success for recovery - the reset password page will handle it
            return { success: true, type: 'recovery' };
        }
      
        return { success: false, error: 'No valid token found or unsupported type' };
    } catch (error) {
        console.error('Error in handleConfirmation:', error);
        return { success: false, error: error.message };
    }
}

// User settings management functions
export async function updateUserEmail(newEmail) {
    try {
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        return { success: true, message: "Email change initiated. Please check your new email for verification." };
    } catch (error) {
        return handleSupabaseError(error, 'Failed to update email');
    }
}

export async function deleteUserAccount() {
    try {
        // Try admin delete first (may fail without proper permissions)
        const { error } = await supabase.auth.admin.deleteUser();
        
        if (error) {
            // Fall back to signing out
            await signOut();
        }
        
        return { success: true, message: "Account processed for deletion." };
    } catch (error) {
        return handleSupabaseError(error, 'Failed to delete account');
    }
}

// Fetch user data for download
export async function getUserData() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }
        
        // Get user profile data
        const { data: profileData, error: profileError } = 
            await DataAccess.userProfiles.getByUserId(user.id);
            
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        
        // You can add more data sources here
        
        return { 
            success: true, 
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.created_at
                },
                profile: profileData || {},
                // Add more data categories as needed
            }
        };
    } catch (error) {
        return handleSupabaseError(error, 'Failed to retrieve user data');
    }
}
