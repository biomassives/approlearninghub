// /api/lib/authHandlers.js
const supabase = require('./supabaseClient');

// Load environment variables and log status
console.log('📡 Auth handlers loaded');
if (!process.env.SUPABASE_URL) {
  console.warn('⚠️ SUPABASE_URL environment variable not set');
}
if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY or SERVICE_ROLE_KEY environment variable not set');
}

/**
 * Handle user signup
 */
async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  console.log(`📝 Signup attempt for email: ${email}, role: ${role}`);

  try {
    // Sign up the user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { role } 
      }
    });

    if (signUpError) {
      console.error('❌ Signup error:', signUpError.message);
      return res.status(400).json({ success: false, error: signUpError.message });
    }

    if (!data.user) {
      return res.status(500).json({ success: false, error: 'User creation failed' });
    }

    // Create a record in the users table with additional info
    try {
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          { 
            id: data.user.id,
            email: email,
            role: role,
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('❌ User profile creation error:', profileError.message);
        // We could delete the auth user here to maintain consistency
        // But for now, let's just log it
      }
    } catch (profileError) {
      console.error('❌ Error creating user profile:', profileError.message);
      // Continue anyway - the auth user is created
    }

    console.log('✅ Signup successful for:', email);
    return res.status(200).json({
      success: true,
      user: { 
        id: data.user.id,
        email: data.user.email || email, 
        role 
      }
    });
  } catch (error) {
    console.error('🔥 Unexpected signup error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Handle user login
 */
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Missing email or password' });
  }

  console.log(`🔑 Login attempt for email: ${email}`);

  try {
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      console.error('❌ Login error:', error.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    if (!data.user) {
      return res.status(500).json({ 
        success: false, 
        error: 'Authentication failed' 
      });
    }

    // Fetch user details from our users table
    let userData;
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.warn('⚠️ Could not fetch user profile:', userError.message);
        // Fallback to metadata from auth
        userData = { 
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'learner'
        };
      } else {
        userData = userRecord;
      }
    } catch (userError) {
      console.warn('⚠️ Error fetching user profile:', userError.message);
      // Fallback to metadata from auth
      userData = { 
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'learner'
      };
    }

    console.log('✅ Login successful for:', email);

    // Set a cookie with the access token
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 1 week
      sameSite: 'strict'
    });

    return res.status(200).json({
      success: true,
      user: userData || {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'learner'
      },
      token: data.session.access_token // Include the token in the response
    });
  } catch (error) {
    console.error('🔥 Unexpected login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Handle user logout
 */
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Clear the session in Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Logout error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Clear the cookie
    res.clearCookie('sb-access-token');

    console.log('✅ Logout successful');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('🔥 Unexpected logout error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Handle access check (verify session/token)
 */
async function handleAccessCheck(req, res) {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Token verification error:', error.message);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (!data.user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Fetch user details from our users table
    let userData;
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.warn('⚠️ Could not fetch user profile:', userError.message);
        userData = null;
      } else {
        userData = userRecord;
      }
    } catch (userError) {
      console.warn('⚠️ Error fetching user profile:', userError.message);
      userData = null;
    }

    console.log('✅ Access check successful for user:', data.user.email);
    return res.status(200).json({
      success: true,
      user: userData || {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'learner'
      }
    });
  } catch (error) {
    console.error('🔥 Unexpected access check error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = {
  handleSignup,
  handleLogin,
  handleLogout,
  handleAccessCheck
};