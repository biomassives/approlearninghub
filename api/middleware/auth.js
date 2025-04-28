// api/middleware/auth.js
const { verify } = require('jsonwebtoken');
const { createError } = require('../utils/errors');

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
    return verify(token, JWT_SECRET);
  } catch (error) {
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
const authenticate = (options = { required: true, roles: [] }) => {
  return async (req, res, next) => {
    try {
      // Check for service role key first
      const serviceKey = req.headers['x-service-key'];
      if (serviceKey === SERVICE_ROLE_KEY) {
        req.user = { role: 'service' };
        return next();
      }
      
      // Extract token
      const token = extractToken(req);
      
      // If no token and auth is required, reject
      if (!token && options.required) {
        throw createError(401, 'Authentication required');
      }
      
      // If no token but auth is optional, continue
      if (!token && !options.required) {
        return next();
      }
      
      // Verify token
      const decoded = verifyToken(token);
      
      // Check role if specified
      if (options.roles && options.roles.length > 0) {
        if (!decoded.role || !options.roles.includes(decoded.role)) {
          throw createError(403, 'Insufficient permissions');
        }
      }
      
      // Add user to request
      req.user = decoded;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export middleware and utility functions
module.exports = {
  authenticate,
  verifyToken,
  extractToken
};