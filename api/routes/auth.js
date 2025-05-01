// api/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');

const { db, supabase } = require('../utils/db');

const { createError } = require('../utils/error');
const { hashPassword, comparePassword } = require('../utils/hash');

const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt'); // ✅
const { authenticate } = require('../middleware/auth');

// *** Add console log for debugging ***
console.log("DEBUG: Type of authenticate after import:", typeof authenticate);

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


// --- Route Definitions ---

// Simple test route
router.get('/test-vercel', (req, res) => {
  res.send('Auth Route - Vercel Dev Server Test OK');
});

// Main authentication endpoint (e.g., for login, refresh, client credentials)
// Using POST as it typically involves sending credentials or tokens in the body
router.post('/', authHandler); // You might rename this route, e.g., '/token'


// --- LOGIN Route ---
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body; // Or use 'username' if you prefer

    // Basic validation
    if (!email || !password) {
      // Use createError for consistent error handling
      throw createError(400, 'Email and password are required');
    }

    // Find user by email (adjust query based on your login identifier)
    const userQuery = 'SELECT id, email, password_hash, role FROM users WHERE email = $1';
    const result = await pool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      // User not found - use a generic message for security
      throw createError(401, 'Invalid credentials');
    }

    const user = result.rows[0];

    // Compare provided password with the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Incorrect password - use a generic message
      throw createError(401, 'Invalid credentials');
    }

    // --- Password is valid - Generate Tokens ---
    const payload = {
      userId: user.id,
      email: user.email, // Include non-sensitive identifiers needed by frontend/middleware
      role: user.role
      // Add other relevant, non-sensitive data to the payload if needed
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

    // --- Success Response ---
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken, // Consider how you'll handle refresh token securely on the client
      user: { // Send back some basic user info (optional)
        id: user.id,
        email: user.email,
        role: user.role
        // DO NOT send password hash or sensitive data
      }
    });

  } catch (error) {
    // Log the detailed error for debugging if necessary (but don't expose details)
    console.error("Login Error:", error.message); // Log only the message for less noise, or full error if needed

    // Pass the error to the centralized error handler
    // Ensure createError was used previously to set status codes
    if (!error.status) {
        // Handle unexpected db errors or bcrypt errors etc.
         next(createError(500, 'An unexpected error occurred during login.'));
    } else {
        next(error); // Pass errors like 400, 401
    }
  }
});





// --- Signup Route ---
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // 1. Validate input (Basic Example)
    if (!email || !password || !name) {
      return next(createError(400, 'Email, password, and name are required for signup.'));
    }
    // Add more robust validation (e.g., email format, password complexity using a library like validator) here if needed
    // Example:
    // const validator = require('validator');
    // if (!validator.isEmail(email)) {
    //   return next(createError(400, 'Invalid email format.'));
    // }
    // if (password.length < 8) { // Example complexity check
    //   return next(createError(400, 'Password must be at least 8 characters long.'));
    // }


    // 2. Check if user already exists
    // Adjust the query based on your db utility

    const existingUser = await db.users.findOne({ email });


    if (existingUser) {
      return next(createError(409, 'User with this email already exists.')); // 409 Conflict
    }



    // 3. Hash password (using bcrypt helper function)
    const hashedPassword = await hashPassword(password);

    // 4. Create user in DB
    // Adjust query and role assignment as needed
    const defaultRole = 'student'; // Or determine role based on signup context

    let newUser;
    try {
      newUser = await db.users.insert({
        email,
        password: hashedPassword,
        name,
        role: defaultRole
      });
    } catch (insertError) {
      console.error("Insert error:", insertError);
      return next(createError(500, 'Failed to create user account.'));
    }




    if (!newUser) {
        // This shouldn't happen if the insert was successful and RETURNING was used, but good to check
        console.error("Failed to retrieve user details after insert for email:", email);
        return next(createError(500, 'Failed to create user account.'));
    }

    // 5. Respond (Option A: Just success message)
    // res.status(201).json({
    //   success: true,
    //   message: 'Signup successful!',
    //   user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
    // });

    // 5. Respond (Option B: Log user in directly by generating tokens)
     const tokenPayload = {
         userId: newUser.id,
         role: newUser.role,
         email: newUser.email,
     };
     const tokenPair = generateTokenPair(tokenPayload);
     res.status(201).json({
         success: true,
         message: 'Signup successful!',
         ...tokenPair, // Include tokens
         user: { // Include user info
             id: newUser.id,
             email: newUser.email,
             name: newUser.name,
             role: newUser.role
         }
     });


  } catch (error) {
    // Catch validation, hashing, or database errors
    console.error("Signup Error:", error);
    // Avoid sending detailed internal errors to the client
    next(createError(500, "An error occurred during signup. Please try again."));
  }
});

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
