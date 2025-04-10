// api/auth/logout.js
// Serverless function to handle secure logout by invalidating the lattice hash

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user ID and token from the request
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the JWT token first for authentication
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      // Even if token is invalid, we'll proceed with logout but log the attempt
      console.warn('Invalid token during logout attempt for user ID:', userId);
    } else if (tokenData.user.id !== userId) {
      // Token belongs to a different user - potential security issue
      console.warn('Token user ID mismatch during logout:', {
        tokenUserId: tokenData.user.id,
        requestUserId: userId
      });
      return res.status(403).json({ error: 'Token user ID mismatch' });
    }

    // Invalidate the lattice hash by setting it to null or a special "invalidated" value
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        lattice_hash: null,  // or 'INVALIDATED'
        last_logout: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Database update error during logout:', updateError);
      // We'll still return success since the client-side session will be cleared
    }

    // Log the logout activity
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'logout',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      })
      .catch(error => {
        // Non-critical error, just log it
        console.error('Failed to log logout activity:', error);
      });

    // Try to invalidate the session token on Supabase
    if (token) {
      await supabase.auth.admin.signOut(token).catch(error => {
        console.error('Error invalidating token on Supabase:', error);
      });
    }

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Logout successful, session invalidated'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      error: 'Server error during logout',
      // Still return partial success since client will clear local session
      clientAction: 'proceed_with_local_logout'
    });
  }
}
