// /api/middleware/auth.js - Using Supabase Auth
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { testConnection } = require('../lib/supabaseClient');

(async () => {
  const ok = await testConnection();
  if (!ok) {
    console.error('💥 Supabase “users” table is missing or unreachable — see above error');
    process.exit(1); 
  }
})();



/**
 * Authentication middleware
 * Verifies Supabase Auth token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication'
      });
    }
    
    // Get user data from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_admin')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('User data fetch error:', userError);
      return res.status(401).json({ 
        success: false, 
        message: 'User data not found'
      });
    }
    
    // Attach user info to request
    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role || 'learner',
      isAdmin: userData.is_admin
    };
    
    // Continue to route handler
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authentication'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Role(s) that can access the route
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Must be used after authenticate middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated'
      });
    }
    
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Admin override
    if (req.user.isAdmin) {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied'
      });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };