// api-debug.js
// Simplified debugging middleware for your Express application

// Add this to your index.js file before other middleware
const addDebugMiddleware = (app) => {
    // Simple request logger middleware
    app.use((req, res, next) => {
      console.log(`🔍 ${req.method} ${req.originalUrl}`);
      
      // Log request details
      if (req.query && Object.keys(req.query).length > 0) {
        console.log('Query:', JSON.stringify(req.query));
      }
      
      // Track response time
      const start = Date.now();
      
      // Function to log after response is sent
      const logResponse = () => {
        const duration = Date.now() - start;
        console.log(`✅ ${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
      };
      
      // Add listeners to log after response
      res.on('finish', logResponse);
      res.on('close', logResponse);
      
      next();
    });
  };
  
  module.exports = { addDebugMiddleware };