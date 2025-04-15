// api/health.js
// Simple health check endpoint to verify API availability

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'error', 
      message: 'Method not allowed' 
    });
  }

  try {
    // Add basic server info - avoid exposing sensitive info
    const serverInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      apiVersion: '1.0.0', // Update this with your actual API version
      // Can add non-sensitive system stats here if desired
      uptime: process.uptime()
    };

    // Add security headers
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    return res.status(200).json(serverInfo);
  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error during health check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
