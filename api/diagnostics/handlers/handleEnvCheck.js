module.exports = async function handleEnvCheck(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'NODE_ENV'];
    const optionalVars = ['VERCEL_URL', 'VERCEL_ENV', 'VERCEL_REGION'];
  
    const missingVars = requiredVars.filter((v) => !process.env[v]);
    const optionalPresent = optionalVars.filter((v) => process.env[v]);
  
    return res.status(missingVars.length ? 400 : 200).json({
      success: missingVars.length === 0,
      checked: requiredVars,
      optional: optionalVars,
      missing: missingVars,
      optionalPresent: optionalPresent.length,
      message: missingVars.length
        ? 'Some required environment variables are missing'
        : 'All required environment variables are set',
    });
  };
  