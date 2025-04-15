// api/index.js - Main API Router
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const crypto = require('crypto');

// Create rate limiter line 737 uses subapase table


// Middleware for parsing JSON
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions

async function hashMetaLattice(quat) {
  const str = `${quat.x.toFixed(6)}:${quat.y.toFixed(6)}:${quat.z.toFixed(6)}:${quat.w.toFixed(6)}`;
  const hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}

function generateNormalizedQuaternion() {
  const values = new Float32Array(4);
  for (let i = 0; i < 4; i++) {
    values[i] = Math.random(); // Use Math.random() as a simple alternative
  }
  const [x, y, z, w] = values;
  const mag = Math.sqrt(x * x + y * y + z * z + w * w);
  return {
    x: x / mag,
    y: y / mag,
    z: z / mag,
    w: w / mag
  };
}


// Supabase-based Rate Limiter for serverless environments
class SupabaseRateLimiter {
  constructor(supabaseClient, windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.supabase = supabaseClient;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.table = 'rate_limits'; // Make sure this table exists in your Supabase database
  }

  async check(ip) {
    try {
      const now = new Date().toISOString();
      const windowStart = new Date(Date.now() - this.windowMs).toISOString();
      
      // Get current count for this IP in the time window
      const { data, error } = await this.supabase
        .from(this.table)
        .select('count')
        .eq('ip', ip)
        .gte('reset_time', now)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking rate limit:', error);
        return true; // Allow the request if there's an error checking
      }
      
      if (!data) {
        // No existing record, create a new one
        await this.supabase
          .from(this.table)
          .insert({
            ip: ip,
            count: 1,
            reset_time: new Date(Date.now() + this.windowMs).toISOString(),
            last_request: now
          });
        return true;
      }
      
      if (data.count >= this.maxRequests) {
        return false; // Rate limit exceeded
      }
      
      // Update existing record
      await this.supabase
        .from(this.table)
        .update({
          count: data.count + 1,
          last_request: now
        })
        .eq('ip', ip);
      
      return true;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true; // Allow the request if there's an error
    }
  }
  
  // Method to clean up old records - can be called periodically
  async cleanup() {
    const now = new Date().toISOString();
    await this.supabase
      .from(this.table)
      .delete()
      .lt('reset_time', now);
  }
}


// Schedule cleanup
setInterval(() => {
  authLimiter.cleanup();
  generalLimiter.cleanup();
}, 5 * 60 * 1000);

// Add middleware for rate limiting
function rateLimitMiddleware(limiter) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!limiter.check(ip)) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    next();
  };
}

// Apply to authentication routes
app.use('/auth/', rateLimitMiddleware(authLimiter));
// Apply to general API routes
app.use('/', rateLimitMiddleware(generalLimiter));





// Root API route
app.get('/', (req, res) => {
  res.json({ message: 'ApproVideo API is running' });
});

// ====== LOGIN ENDPOINT ======
app.get('/auth/login', (req, res) => {
  res.json({ message: 'Login API is running' });
});

app.post('/auth/login', async (req, res) => {
  try {
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
        console.error('Failed to log auth activity:', error);
      });

    return res.status(200).json({
      success: true,
      metaLattice: quaternion,
      hashPreview: latticeHash.substring(0, 8) + '...'
    });
    
  } catch (error) {
    console.error('Login enhancement error:', error);
    return res.status(500).json({ error: 'Server error during login enhancement' });
  }
});

// ====== VERIFY ENDPOINT ======
app.get('/auth/verify', (req, res) => {
  res.json({ message: 'Verification API is running' });
});

app.post('/auth/verify', async (req, res) => {
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
    
    // Log this verification attempt
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'verify_lattice',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        result: isValid ? 'success' : 'failure'
      })
      .catch(error => {
        console.error('Failed to log verification activity:', error);
      });
    
    // Return the result
    return res.status(200).json({
      valid: isValid,
      hashPreview: isValid ? profile.lattice_hash.substring(0, 8) + '...' : null
    });
    
  } catch (error) {
    console.error('Lattice verification error:', error);
    return res.status(500).json({ error: 'Server error during verification' });
  }
});

// ====== UPDATE LATTICE ENDPOINT ======
app.get('/auth/update-lattice', (req, res) => {
  res.json({ message: 'Lattice update API is running' });
});

app.post('/auth/update-lattice', async (req, res) => {
  try {
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
    
    // Log this lattice update
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'lattice_update',
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        details: 'Lattice hash updated'
      })
      .catch(error => {
        console.error('Failed to log lattice update activity:', error);
      });
    
    // Return success with hash preview
    return res.status(200).json({
      success: true,
      hashPreview: latticeHash.substring(0, 8) + '...'
    });
  } catch (error) {
    console.error('Lattice update error:', error);
    return res.status(500).json({ error: 'Server error during lattice update' });
  }
});

// ====== LOGOUT ENDPOINT ======
app.get('/auth/logout', (req, res) => {
  res.json({ message: 'Logout API is running' });
});

app.post('/auth/logout', async (req, res) => {
  try {
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
    
    // Invalidate the lattice hash by setting it to null
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        lattice_hash: null,
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
      clientAction: 'proceed_with_local_logout'
    });
  }
});

// ====== USER DATA ENDPOINT ======
app.get('/auth/user-data', async (req, res) => {
  try {
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
});

// ====== USER ROLE ENDPOINT ======
app.get('/auth/user-role', async (req, res) => {
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
});


app.get('/videos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('videos').select('*');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});





app.post('/auth/user-role', async (req, res) => {
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
});

// Handle 404s for API routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export the serverless function handler
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Pass the request to the Express app
  return app(req, res);
};