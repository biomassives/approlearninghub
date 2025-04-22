// /api/routes/auth.js - Adjusted to match client expectations
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT secret for token signing
const JWT_SECRET = process.env.JWT_SECRET || 'yjljkljknm96rgdljljkljkgljklr-sjkljljkly';
const TOKEN_EXPIRY = '7d'; // Token expiration time

// Lattice security method as per requirements
const applyLatticeMethod = (userData) => {
  // Strip sensitive data 
  const secureUserData = {
    id: userData.id,
    email: userData.email,
    role: userData.role,
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
    
    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .limit(1);
      
    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user into Supabase
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        { 
          email, 
          password: hashedPassword, 
          role,
          is_admin: role === 'admin', // Set admin flag based on role
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select();
    
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create user account' 
      });
    }
    
    // Apply lattice security method
    const secureUserData = applyLatticeMethod(newUser[0]);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: secureUserData.id, email: secureUserData.email, role: secureUserData.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Send response with token and user data - matching client expectations
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: secureUserData,
      token
    });
    
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
    
    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to authenticate' 
      });
    }
    
    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    const user = users[0];
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Apply lattice security method
    const secureUserData = applyLatticeMethod(user);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: secureUserData.id, email: secureUserData.email, role: secureUserData.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    return res.json({
      success: true,
      message: 'Login successful',
      user: secureUserData,
      token
    });
    
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred' 
    });
  }
});

/**
 * Logout endpoint - Client-side token removal
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
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
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .limit(1);
    
    if (error || !user || user.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found' 
      });
    }
    
    // Apply lattice security method
    const secureUserData = applyLatticeMethod(user[0]);
    
    return res.json({
      success: true,
      user: secureUserData
    });
    
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

module.exports = router;