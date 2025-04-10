// api/auth/update-lattice.js
// Serverless function to update user's lattice hash

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user ID, lattice data, and token from the request
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

    // Calculate the hash of the provided lattice
    const latticeHash = await hashMetaLattice(metaLattice);

    // Update the user's profile with the new lattice hash
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: userId, 
        lattice_hash: latticeHash,
        lattice_updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
      
    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({ error: 'Failed to update lattice hash' });
    }

    // Return success with hash preview
    return res.status(200).json({
      success: true,
      hashPreview: latticeHash.substring(0, 8) + '...'
    });
  } catch (error) {
    console.error('Lattice update error:', error);
    return res.status(500).json({ error: 'Server error during lattice update' });
  }
}
