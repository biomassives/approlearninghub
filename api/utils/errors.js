// api/utils/errors.js

/**
 * Create a formatted error object with status code
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @returns {Error} - Error object with status
 */
const createError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };
  
  /**
   * Error handling middleware
   * @param {Error} err - Error object
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err);
    
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    
    // Format error response
    const errorResponse = {
      error: true,
      message,
      status
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = err.stack;
    }
    
    res.status(status).json(errorResponse);
  };
  
  /**
   * Handle 404 Not Found
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  const notFoundHandler = (req, res) => {
    res.status(404).json({
      error: true,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404
    });
  };
  
  /**
   * Validate request body against schema
   * @param {Object} schema - Validation schema
   * @returns {Function} - Middleware function
   */
  const validateBody = (schema) => {
    return (req, res, next) => {
      try {
        // Simple validation - in production use a proper validation library
        if (!req.body) {
          throw createError(400, 'Request body is required');
        }
        
        // Check all required fields
        if (schema.required) {
          for (const field of schema.required) {
            if (req.body[field] === undefined) {
              throw createError(400, `Field '${field}' is required`);
            }
          }
        }
        
        // Validate field types
        if (schema.properties) {
          for (const [field, def] of Object.entries(schema.properties)) {
            if (req.body[field] !== undefined) {
              // Simple type checking
              if (def.type === 'string' && typeof req.body[field] !== 'string') {
                throw createError(400, `Field '${field}' must be a string`);
              } else if (def.type === 'number' && typeof req.body[field] !== 'number') {
                throw createError(400, `Field '${field}' must be a number`);
              } else if (def.type === 'boolean' && typeof req.body[field] !== 'boolean') {
                throw createError(400, `Field '${field}' must be a boolean`);
              } else if (def.type === 'array' && !Array.isArray(req.body[field])) {
                throw createError(400, `Field '${field}' must be an array`);
              } else if (def.type === 'object' && (typeof req.body[field] !== 'object' || Array.isArray(req.body[field]))) {
                throw createError(400, `Field '${field}' must be an object`);
              }
            }
          }
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  };
  
  // Export utilities
  module.exports = {
    createError,
    errorHandler,
    notFoundHandler,
    validateBody
  };