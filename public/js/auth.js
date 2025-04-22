// /api/auth.js - Using Supabase Auth
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lattice security method as per requirements
const applyLatticeMethod = (userData) => {
  // Strip sensitive data and apply security transformations
  const secureUserData = {
    id: userData.id,
    email: userData.email,
    role: userData.role || 'learner', // Default to learner if no role
    created_at: userData.created_at
  };
  return secureUserData;
};

/**
 * User signup endpoint
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and role are required' 
      });
    }
    
    // Use Supabase Auth to create user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      console.error('Supabase Auth signup error:', authError);
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }
    
    // If auth was successful, create/update the user record in your users table
    // with additional information like role
    if (authData.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert([
          {
            id: authData.user.id, // Use the same ID from auth
            email: email,
            role: role,
            is_admin: role === 'admin',
            username: email.split('@')[0], // Default username
            created_at: new Date(),
            updated_at: new Date(),
            joined: new Date()
          }
        ])
        .select()
        .single();
      
      if (userError) {
        console.error('User data creation error:', userError);
        return res.status(500).json({ 
          success: false, 
          message: 'Account created but failed to set role information'
        });
      }
      
      // Apply lattice security method
      const secureUserData = applyLatticeMethod(userData);
      
      // Get the session token from Supabase
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: secureUserData,
        token: authData.session?.access_token || ''
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create user account'
      });
    }
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * User login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Use Supabase Auth to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('Supabase Auth login error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password'
      });
    }
    
    if (authData.user) {
      // Get user data from your users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userError) {
        console.error('User data fetch error:', userError);
        
        // If user record doesn't exist yet, create it with default role
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .upsert([
            {
              id: authData.user.id,
              email: email,
              role: 'learner', // Default role
              is_admin: false,
              username: email.split('@')[0],
              created_at: new Date(),
              updated_at: new Date(),
              joined: new Date()
            }
          ])
          .select()
          .single();
        
        if (createError) {
          console.error('User creation error:', createError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve or create user data'
          });
        }
        
        // Apply lattice security method
        const secureUserData = applyLatticeMethod(newUser);
        
        return res.json({
          success: true,
          message: 'Login successful',
          user: secureUserData,
          token: authData.session?.access_token || ''
        });
      }
      
      // Apply lattice security method
      const secureUserData = applyLatticeMethod(userData);
      
      return res.json({
        success: true,
        message: 'Login successful',
        user: secureUserData,
        token: authData.session?.access_token || ''
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid login credentials'
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * Logout endpoint
 */
router.post('/logout', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Use Supabase Auth to sign out
      const { error } = await supabase.auth.signOut({
        token: token
      });
      
      if (error) {
        console.error('Supabase Auth logout error:', error);
      }
    }
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * Check access token validity
 */
router.get('/access-check', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token'
      });
    }
    
    // Get user data from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('User data fetch error:', userError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve user data'
      });
    }
    
    // Apply lattice security method
    const secureUserData = applyLatticeMethod(userData);
    
    return res.json({
      success: true,
      user: secureUserData
    });
  } catch (err) {
    console.error('Access check error:', err);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token'
    });
  }
});

module.exports = router;