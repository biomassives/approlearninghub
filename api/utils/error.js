/**
 * Create a custom error object
 * @param {number} status - HTTP status code
 * @param {string|object} message - Error message or detailed object
 * @returns {Error} - Enhanced error object with status and details
 */
function createError(status = 500, message = 'Internal Server Error') {
    const err = new Error(typeof message === 'string' ? message : message.message || 'Error');
    err.status = status;
  
    if (typeof message === 'object') {
      err.details = message; // Allow rich metadata (e.g., code, recovery hints)
    }
  
    return err;
  }
  
  /**
   * 404 Not Found Handler (fallback route)
   */
  function notFoundHandler(req, res, next) {
    const err = createError(404, {
      message: `Route ${req.originalUrl} not found`,
      code: 'NOT_FOUND'
    });
    next(err);
  }
  
  /**
   * Global Express Error Handler
   * Logs errors and returns clean responses
   */
  function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const response = {
      success: false,
      message: err.message || 'Something went wrong',
    };
  
    // Optionally expose additional error detail (for frontend recovery, debugging)
    if (err.details) {
      response.details = err.details;
    }
  
    // Log full error only in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error Handler:', {
        message: err.message,
        status,
        stack: err.stack,
        ...(err.details && { details: err.details }),
      });
    }
  
    res.status(status).json(response);
  }
  
  // ─── Exports ───────────────────────────────────────────────────────────
  module.exports = {
    createError,
    notFoundHandler,
    errorHandler,
  };
  