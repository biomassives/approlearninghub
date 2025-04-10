// api/auth/user-data.js
// Serverless function to retrieve user data

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
    // Get parameters
    const { userId, token } = req.query;

    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the JWT token
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Ensure the token belongs to the user requesting their data
    // (or an admin requesting another user's data)
    if (tokenData.user.id !== userId) {
      // Check if requester is an admin
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', tokenData.user.id)
        .maybeSingle();
        
      if (adminCheckError || !adminCheck || adminCheck.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to access this user data' });
      }
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }
    
    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Error fetching user role:', roleError);
    }
    
    // Get user auth details from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error fetching user auth data:', userError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user activity logs
    const { data: activityLogs, error: logsError } = await supabase
      .from('auth_activity_log')
      .select('action, created_at, ip_address, details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (logsError && logsError.code !== 'PGRST116') {
      console.error('Error fetching activity logs:', logsError);
    }

    // Compile and return user data
    const userDataResponse = {
      user: {
        id: userData.user.id,
        email: userData.user.email,
        createdAt: userData.user.created_at,
        lastSignIn: userData.user.last_sign_in_at,
        role: roleData?.role || 'user'
      },
      profile: profileData || {},
      activity: activityLogs || [],
      security: {
        emailConfirmed: userData.user.email_confirmed_at ? true : false,
        factorCount: userData.user.factors?.length || 0,
        lastPasswordChange: profileData?.password_last_changed || null
      }
    };
    
    // Log data access
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'data_access',
        performed_by: tokenData.user.id,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      })
      .catch(error => {
        console.error('Failed to log data access activity:', error);
      });

    return res.status(200).json({
      success: true,
      data: userDataResponse
    });
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return res.status(500).json({ error: 'Server error during data retrieval' });
  }
}
