// pages/api/auth/verify.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - these would be environment variables in production
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin access

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to hash the quaternion lattice
async function hashMetaLattice(quat) {
  const str = `${quat.x.toFixed(6)}:${quat.y.toFixed(6)}:${quat.z.toFixed(6)}:${quat.w.toFixed(6)}`;
  const buffer = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function handler(req, res) {
  // Allow GET requests for health checks/status
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Verification API is running' });
  }
  
  // Only allow POST requests for actual verification
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the user ID and lattice data from the request
    const { userId, metaLattice, token } = req.body;
    
    if (!userId || !metaLattice || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Verify the JWT token first for authentication
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Ensure the token belongs to the user in question
    if (tokenData.user.id !== userId) {
      return res.status(403).json({ error: 'Token user ID mismatch' });
    }
    
    // Get the stored lattice hash from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('lattice_hash')
      .eq('user_id', userId)
      .single();
      
    if (profileError) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    if (!profile.lattice_hash) {
      return res.status(400).json({ error: 'No lattice hash stored for this user' });
    }
    
    // Calculate the hash of the provided lattice
    const calculatedHash = await hashMetaLattice(metaLattice);
    
    // Compare the calculated hash with the stored hash
    const isValid = calculatedHash === profile.lattice_hash;
    
    // Log this verification attempt (optional, for security auditing)
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'verify_lattice',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        result: isValid ? 'success' : 'failure'
      })
      .catch(error => {
        // Non-critical error, just log it
        console.error('Failed to log verification activity:', error);
      });
    
    // Return the result
    return res.status(200).json({
      valid: isValid,
      // Return a partial hash preview for debugging/logging
      hashPreview: isValid ? profile.lattice_hash.substring(0, 8) + '...' : null
    });
    
  } catch (error) {
    console.error('Lattice verification error:', error);
    return res.status(500).json({ error: 'Server error during verification' });
  }
}
