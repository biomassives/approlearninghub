// api/env-check.js
// Test endpoint to verify required environment variables are set
// WITHOUT exposing their values (security best practice)

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
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // List of required environment variables
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'NODE_ENV'
      // Add other required variables here
    ];
    
    // Optional environment variables
    const optionalVars = [
      'VERCEL_URL',
      'VERCEL_ENV',
      'VERCEL_REGION'
      // Add other optional variables here
    ];

    // Check which required variables are missing
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    // Check which optional variables are present
    const presentOptionalVars = optionalVars.filter(varName => process.env[varName]);

    // Determine overall status
    const success = missingVars.length === 0;

    // Build response (without revealing any values)
    const response = {
      success,
      checked: requiredVars,
      optional: optionalVars,
      missing: missingVars,
      optionalPresent: presentOptionalVars.length,
      message: success 
        ? 'All required environment variables are set' 
        : 'Some required environment variables are missing'
    };

    return res.status(success ? 200 : 400).json(response);
  } catch (error) {
    console.error('Environment check error:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during environment check',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown server error'
    });
  }
};
