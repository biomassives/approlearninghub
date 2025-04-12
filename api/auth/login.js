// api/auth/login.js
// Serverless function to enhance login security and create session lattice

// Routes
app.get('/api/auth/login.js', (req, res) => {
  res.json({ message: 'API is running' });
});



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

// Helper function to generate a normalized quaternion
function generateNormalizedQuaternion() {
  // Use crypto.getRandomValues for better randomness
  const values = new Float32Array(4);
  crypto.getRandomValues(values);
  
  const [x, y, z, w] = values;
  const mag = Math.sqrt(x * x + y * y + z * z + w * w);
  
  return {
    x: x / mag,
    y: y / mag,
    z: z / mag,
    w: w / mag
  };
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get data from request
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the JWT token
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Ensure the token belongs to the user in question
    if (tokenData.user.id !== userId) {
      return res.status(403).json({ error: 'Token user ID mismatch' });
    }

    // Generate a secure quaternion for this session
    const quaternion = generateNormalizedQuaternion();
    
    // Calculate the hash
    const latticeHash = await hashMetaLattice(quaternion);

    // Update the user's profile with the new lattice hash
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: userId, 
        lattice_hash: latticeHash,
        last_login: new Date().toISOString(),
        login_count: supabase.sql`login_count + 1`
      }, {
        onConflict: 'user_id'
      });
      
    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to update lattice hash' });
    }

    // Log the login activity for security auditing
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'login',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
        lattice_hash_preview: latticeHash.substring(0, 8)
      })
      .catch(error => {
        // Non-critical error, just log it
        console.error('Failed to log auth activity:', error);
      });

    // Return the quaternion and hash for the client
    return res.status(200).json({
      success: true,
      metaLattice: quaternion,
      hashPreview: latticeHash.substring(0, 8) + '...'
    });
  } catch (error) {
    console.error('Login enhancement error:', error);
    return res.status(500).json({ error: 'Server error during login enhancement' });
  }
}
