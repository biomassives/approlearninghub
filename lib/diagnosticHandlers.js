// lib/diagnosticsHandlers.js
// ApproVideo Diagnostics API Handlers
// Supports diagnostics endpoints for system health, environment, structure, and testing
//
// Supported handlers:
//   - handleHealthCheck
//   - handleEnvCheck
//   - handleLatticeTest
//   - handleVercelStructure
//   - handleTestEndpoint
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const fs = require('fs');
const path = require('path');

async function handleEnvCheck(req, res) {
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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'NODE_ENV'];
    const optionalVars = ['VERCEL_URL', 'VERCEL_ENV', 'VERCEL_REGION'];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const presentOptionalVars = optionalVars.filter(varName => process.env[varName]);

    const success = missingVars.length === 0;

    return res.status(success ? 200 : 400).json({
      success,
      checked: requiredVars,
      optional: optionalVars,
      missing: missingVars,
      optionalPresent: presentOptionalVars.length,
      message: success
        ? 'All required environment variables are set'
        : 'Some required environment variables are missing'
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during environment check',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown server error'
    });
  }
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
}

async function handleHealthCheck(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const serverInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: '1.0.0',
    uptime: process.uptime()
  };

  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  return res.status(200).json(serverInfo);
}

async function handleLatticeTest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  const { securedData, originalEmail } = req.body;
  if (!securedData || !originalEmail) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: securedData and originalEmail'
    });
  }

  const decoded = {};
  for (const key in securedData) {
    try {
      const decodedString = Buffer.from(securedData[key], 'base64').toString('utf8');
      decoded[key] = decodedString.substring(0, Math.floor(decodedString.length / 2));
    } catch (e) {
      decoded[key] = '';
    }
  }

  const match = decoded.email === originalEmail;

  return res.status(200).json({
    success: match,
    message: match ? 'Lattice security verification successful' : 'Verification failed',
    decoded,
    expected: { email: originalEmail }
  });
}

async function handleTestEndpoint(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Test endpoint is live',
      method: 'GET',
      timestamp: new Date().toISOString(),
      query: url.searchParams.toString() || 'No query parameters provided'
    });
  }

  if (req.method === 'POST') {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Missing request body' });
    }

    return res.status(200).json({
      success: true,
      message: 'POST data received',
      data: req.body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

async function handleVercelStructure(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const configPath = path.join(process.cwd(), 'vercel.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const vercelJson = JSON.parse(configData);

    const sanitized = {
      version: vercelJson.version,
      builds: vercelJson.builds,
      routes: vercelJson.routes
    };

    return res.status(200).json(sanitized);
  } catch (error) {
    console.error('Failed to read vercel.json:', error);
    return res.status(404).json({ error: 'vercel.json not found or unreadable' });
  }
}

module.exports = {
  handleEnvCheck,
  handleHealthCheck,
  handleLatticeTest,
  handleTestEndpoint,
  handleVercelStructure
};

