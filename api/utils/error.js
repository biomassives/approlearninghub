// /api/utils/error.js

/**
 * Creates a new error object with an HTTP status code.
 * @param {number} status - The HTTP status code (e.g., 400, 404, 500).
 * @param {string} message - The error message.
 * @param {object} [properties] - Optional additional properties to add to the error object.
 * @returns {Error} - An Error object with a .status property.
 */
const createError = (status, message, properties) => {
    const error = new Error(message);
    error.status = status;
    // Add any additional properties if provided
    if (properties) {
      Object.assign(error, properties);
    }
    return error;
  };
  
  
  /**
   * Error handling middleware
   * @param {Error} err - Error object (potentially with a .status property from createError)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  const errorHandler = (err, req, res, next) => {
    // Log the full error for debugging, especially useful for unexpected errors
    console.error('API Error:', err);
  
    // Use the status from the error if it exists (set by createError), otherwise default to 500
    const status = err.status || 500;
    // Use the message from the error, or provide a generic message for 500 errors
    const message = err.message || 'Internal Server Error';
  
    const errorResponse = {
      error: true, // Indicate this is an error response
      message,
      status
    };
  
    // Optionally add stack trace in development environment
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      errorResponse.stack = err.stack;
    }
  
    // Send the formatted error response
    res.status(status).json(errorResponse);
  };
  
  /**
   * Handle 404 Not Found errors
   * This middleware should be placed after all your routes
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Express next function (optional, usually not needed here)
   */
  const notFoundHandler = (req, res, next) => {
    // Use the createError utility to generate a standard 404 error
    // Although we could construct the response directly, using createError
    // allows the main errorHandler to handle the response formatting if needed.
    // However, for a simple 404, sending the response directly is also common.
    res.status(404).json({
      error: true,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404
    });
    // Alternatively, pass a 404 error to the main handler:
    // next(createError(404, `Route not found: ${req.method} ${req.originalUrl}`));
  };
  
  
  // Export all utility functions
  module.exports = {
      createError, // <-- Export the new function
      errorHandler,
      notFoundHandler
  };
  