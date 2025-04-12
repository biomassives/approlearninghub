// pages/api/auth/user-role.js
// Serverless function to get and update user roles

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Handle GET requests to fetch a user's role
  if (req.method === 'GET') {
    const { userId, token } = req.query;

    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      // Verify the JWT token
      const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);

      if (tokenError || !tokenData.user) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // Get user role from database
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError);
        return res.status(500).json({ error: 'Failed to fetch user role' });
      }

      // Return user role
      return res.status(200).json({
        success: true,
        role: roleData?.role || 'user'
      });
    } catch (error) {
      console.error('Error in user role retrieval:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Handle POST requests to update a user's role
  else if (req.method === 'POST') {
    const { targetUserId, newRole, token } = req.body;

    if (!targetUserId || !newRole || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['user', 'editor', 'admin'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    try {
      // Verify the JWT token
      const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);

      if (tokenError || !tokenData.user) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // Check if the requesting user is an admin
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', tokenData.user.id)
        .maybeSingle();

      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
        return res.status(500).json({ error: 'Failed to verify admin status' });
      }

      if (!adminCheck || adminCheck.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update user roles' });
      }

      // Check if the target user exists
      const { data: targetUser, error: targetUserError } = await supabase.auth.admin.getUserById(targetUserId);

      if (targetUserError || !targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      // Update the user's role
      const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: targetUserId,
          role: newRole,
          updated_at: new Date().toISOString(),
          updated_by: tokenData.user.id
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return res.status(500).json({ error: 'Failed to update user role' });
      }

      // Log the role change
      await supabase
        .from('auth_activity_log')
        .insert({
          user_id: targetUserId,
          action: 'role_change',
          details: `Role changed to ${newRole}`,
          performed_by: tokenData.user.id,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        })
        .catch(error => {
          console.error('Failed to log role change activity:', error);
        });

      return res.status(200).json({
        success: true,
        message: `User role updated to ${newRole}`
      });
    } catch (error) {
      console.error('Error in user role update:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Reject other request types
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
