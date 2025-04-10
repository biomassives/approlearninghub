// api/auth/list-users.js
// Serverless function to list users (admin only)

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
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
      return res.status(403).json({ error: 'Only admins can list users' });
    }
    
    // Get all users from Supabase Auth
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 50 // Adjust as needed
    });
    
    if (authError) {
      console.error('Error fetching users from auth:', authError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    
    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');
      
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return res.status(500).json({ error: 'Failed to fetch user roles' });
    }
    
    // Create a map of user IDs to roles
    const roleMap = {};
    userRoles.forEach(item => {
      roleMap[item.user_id] = item.role;
    });
    
    // Combine auth users with their roles
    const formattedUsers = authUsers.map(user => ({
      id: user.id,
      email: user.email,
      role: roleMap[user.id] || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      confirmed: user.email_confirmed_at ? true : false
    }));
    
    // Log the user listing activity
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: tokenData.user.id,
        action: 'list_users',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        details: `Admin listed ${formattedUsers.length} users`
      })
      .catch(error => {
        console.error('Failed to log user listing activity:', error);
      });

    return res.status(200).json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: 'Server error during user listing' });
  }
}
