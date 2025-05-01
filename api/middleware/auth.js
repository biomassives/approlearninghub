// /api/middleware/auth.js
const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');
const { createError } = require('../utils/error');

// Secret keys (should be loaded from environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-jwt-key';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'your-service-role-key';

/**
 * Verify JWT token from Authorization header
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    // Use the imported verifyAccessToken function instead of the undefined 'verify' function
    return verifyAccessToken(token);
  } catch (error) {
    // Wrap the error to add a status. This is important for consistent error handling.
    throw createError(401, 'Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Request object
 * @returns {string|null} - Token string or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

/**
 * Authentication middleware
 * @param {Object} options - Options object
 * @param {boolean} options.required - Whether authentication is required
 * @param {Array} options.roles - Allowed roles
 */
const authenticate = ({ required = false, roles = [] } = {}) => {
  return async (req, res, next) => {
    try {
      const serviceKey = req.headers['x-service-key'];
      if (serviceKey === SERVICE_ROLE_KEY) {
        req.user = { role: 'service' };
        return next();
      }

      const token = extractToken(req);
      if (!token && required) {
        return next(createError(401, 'Authentication required'));
      }

      if (token) {
        try {
          const decoded = verifyAccessToken(token);
          req.user = decoded;
        } catch (err) {
          if (required) return next(createError(401, 'Invalid or expired token'));
        }
      }

      if (roles.length && (!req.user || !roles.includes(req.user.role))) {
        return next(createError(403, 'Insufficient permissions'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Authorization middleware
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return next(createError(403, 'Insufficient permissions'));
    }
    next();
  };
};

// Export middleware and utility functions
module.exports = {
  authenticate,
  authorize,
  verifyToken,
  extractToken
};