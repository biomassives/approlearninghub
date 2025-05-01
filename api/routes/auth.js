// api/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const { db, supabase } = require('../utils/db');

const { createError } = require('../utils/error');
const { hashPassword, comparePassword } = require('../utils/hash');

const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt'); // ✅
const { authenticate } = require('../middleware/auth');


// Check validation result
const validateRequest = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(400, {
      message: 'Validation failed',
      errors: errors.array()
    }));
  }
};



// *** Add console log for debugging ***
console.log("DEBUG: Type of authenticate after import:", typeof authenticate);


const safeError = (err, defaultMessage) => {
  console.error(err);
  return err.status ? err : createError(500, defaultMessage || 'Internal server error');
};





// --- Router Definition ---
const router = express.Router();

// --- Constants ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key'; // Use strong secrets in prod
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key'; // Use strong secrets in prod
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'your-service-role-key'; // Use strong secrets in prod
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_SALT_ROUNDS = 10; // Cost factor for bcrypt hashing



/**
 * Verify JWT token (Wrapper for consistent error)
 * @param {string} token - JWT token
 * @param {string} secret - Secret key
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    // Use the 'verify' function imported at the top
    return verifyAccessToken(token);
  } catch (error) {
    // Handle specific JWT errors if needed (e.g., TokenExpiredError)
    console.error("Token verification failed:", error.message);
    // Use the imported createError function
    throw createError(401, 'Invalid or expired token');
  }
};



// --- Grant Type Handlers ---

/**
 * Handle client credentials grant type
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const handleClientCredentials = async (req, res, next) => {
  // Check for service role key
  const serviceKey = req.headers['x-service-key'];

  if (serviceKey !== SERVICE_ROLE_KEY) {
    // Use next(error) for consistent error handling via main error handler
    return next(createError(401, 'Invalid service key'));
  }

  // Generate token pair for service role
  const tokenPair = generateTokenPair({
    role: 'service', // Define payload for service role
    type: 'client_credentials' // Indicate grant type origin
  });

  res.json(tokenPair);
};

/**
 * Handle refresh token grant type
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} refreshToken - Refresh token from request body
 * @param {Function} next - Next function
 */
const handleRefreshToken = async (req, res, next, refreshToken) => {
  try {
    // Verify the refresh token

    const decoded = verifyRefreshToken(refreshToken);

    // Optional: Check if token is specifically a refresh token if you added 'tokenType'
    if (decoded.tokenType !== 'refresh') {
       return next(createError(401, 'Invalid token type provided for refresh'));
    }

    // Optional: Check against a token blacklist/revocation list here if implemented

    // Generate a new token pair based on the refresh token's payload
    const tokenPair = generateTokenPair({
      userId: decoded.userId, // Ensure these fields exist in your refresh token payload
      role: decoded.role,
      email: decoded.email,
      // Do NOT copy 'tokenType' or 'type' from the old token directly
    });

    res.json(tokenPair);
  } catch (error) {
    // Catch verification errors (like expiry) or other issues
    // Pass the error (already formatted by verifyToken or createError) to the main handler
    next(error);
  }
};


const handlePasswordGrant = async (req, res, next, email, password) => {
  try {
    // Find user using your db.users helper
    const user = await db.users.findOne({ email });

    if (!user) {
      // More specific error for user not found
      return next(createError(401, {
        message: 'Account not found',
        code: 'USER_NOT_FOUND',
        recovery: 'signup' // Suggests recovery action
      }));
    }

    // Validate password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      // More specific error for incorrect password
      return next(createError(401, {
        message: 'Incorrect password',
        code: 'INVALID_PASSWORD',
        recovery: 'reset' // Suggests recovery action
      }));
    }

    // Generate token payload and continue with successful login...
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email
    };

    const tokenPair = generateTokenPair(tokenPayload);

    res.json({
      ...tokenPair,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Password grant error:', error);
    next(createError(500, {
      message: 'An internal error occurred during login.',
      code: 'SERVER_ERROR',
      recovery: 'retry' // Suggests recovery action
    }));
  }
};

// --- Main Authentication Handler (Acts as a dispatcher) ---

/**
 * Handles various authentication grant types. Attached to a POST route.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Express next function
 */
const authHandler = async (req, res, next) => {
  // Note: Error handling is now primarily done by calling next(error)
  // in the specific grant handlers (handleClientCredentials, handleRefreshToken, etc.)
  const { grant_type, refresh_token, email, password } = req.body;

  // Validate grant_type presence
  if (!grant_type) {
    // Use next(error) to pass the error to the main Express error handler
    return next(createError(400, 'Grant type is required'));
  }

  // Handle different grant types by calling specific handlers
  switch (grant_type) {
    case 'client_credentials':
      // Pass next to the handler so it can call next(error)
      return handleClientCredentials(req, res, next);

    case 'refresh_token':
      if (!refresh_token) {
        return next(createError(400, 'Refresh token is required'));
      }
      // Pass next to the handler
      return handleRefreshToken(req, res, next, refresh_token);

    case 'password':
      if (!email || !password) {
        return next(createError(400, 'Email and password are required'));
      }
      // Pass next to the handler
      return handlePasswordGrant(req, res, next, email, password);

    default:
      // Handle unsupported grant types
      return next(createError(400, `Unsupported grant type: ${grant_type}`));
  }
  // No try/catch needed here as individual handlers use next(error)
};


router.post('/',
  body('grant_type').notEmpty().withMessage('grant_type is required'),
  async (req, res, next) => {
    try {
      validateRequest(req, next);
      await authHandler(req, res, next);
    } catch (err) {
      next(safeError(err, 'Token grant handler failed'));
    }
  }
);



// --- Route Definitions ---

// Simple test route
router.get('/test-vercel', (req, res) => {
  res.send('Auth Route - Vercel Dev Server Test OK');
});

// Main authentication endpoint (e.g., for login, refresh, client credentials)
// Using POST as it typically involves sending credentials or tokens in the body
router.post('/', authHandler); // You might rename this route, e.g., '/token'

router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res, next) => {
    try {
      validateRequest(req, next);

      const { email, password } = req.body;

      const userQuery = 'SELECT id, email, password_hash, role FROM users WHERE email = $1';
      const result = await pool.query(userQuery, [email]);

      if (result.rows.length === 0) {
        throw createError(401, 'Invalid credentials');
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        throw createError(401, 'Invalid credentials');
      }

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const { accessToken, refreshToken } = generateTokenPair(payload);

      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(safeError(error, 'Login failed'));
    }
  }
);





router.post('/signup',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  body('name').notEmpty().withMessage('Name is required'),
  async (req, res, next) => {
    try {
      validateRequest(req, next); // validate inputs

      const { email, password, name } = req.body;

      const existingUser = await db.users.findOne({ email });
      if (existingUser) {
        return next(createError(409, 'User with this email already exists.'));
      }

      const hashedPassword = await hashPassword(password);
      const defaultRole = 'student';

      const newUser = await db.users.insert({
        email,
        password: hashedPassword,
        name,
        role: defaultRole
      });

      if (!newUser) {
        return next(createError(500, 'Failed to create user account.'));
      }

      const tokenPayload = {
        userId: newUser.id,
        role: newUser.role,
        email: newUser.email,
      };
      const tokenPair = generateTokenPair(tokenPayload);

      res.status(201).json({
        success: true,
        message: 'Signup successful!',
        ...tokenPair,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      });
    } catch (error) {
      next(safeError(error, 'Signup failed'));
    }
  }
);


// *** Temporarily commenting out the logout route for debugging ***
/*
router.post('/logout', authenticate({ required: true }), (req, res, next) => {
   try {
       // 1. Add current token (or jti) to a blacklist (e.g., in Redis or DB)
       //    const jti = req.user.jti; // Assuming your token has a jti claim
       //    await blacklistToken(jti, req.user.exp); // Example function
       // 2. Clear any related cookies if used (e.g., httpOnly refresh token cookie)
       //    res.clearCookie('refreshToken');
       res.status(200).json({ success: true, message: 'Logout successful' });
   } catch(error) {
       console.error("Logout error:", error);
       next(createError(500, "Logout failed."));
   }
});
*/


// --- Export Router ---
module.exports = router; // Export the configured router instance
