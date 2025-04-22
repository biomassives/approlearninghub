const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient'); // for potential DB operations

/**
 * GET /diagnostics/env
 * Checks required and optional environment variables.
 */
async function handleEnvCheck(req, res) {
  if (req.method === 'OPTIONS') {
    res.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Content-Length, Content-Type'
    );
    return res.sendStatus(200);
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'NODE_ENV'];
    const optionalVars = ['VERCEL_URL', 'VERCEL_ENV', 'VERCEL_REGION'];

    const missing = requiredVars.filter(v => !process.env[v]);
    const optionalPresent = optionalVars.filter(v => process.env[v]);

    const success = missing.length === 0;
    return res.status(success ? 200 : 400).json({
      success,
      checked: requiredVars,
      missing,
      optionalPresent,
      message: success
        ? 'All required environment variables are set'
        : 'Some required environment variables are missing'
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during environment check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /diagnostics/health
 * Returns basic health and server info.
 */
async function handleHealthCheck(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
  res.set({
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'"
  });

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: '1.0.0',
    uptime: process.uptime()
  });
}

/**
 * POST /diagnostics/lattice
 * Verifies secure lattice payload against original email.
 */
async function handleLatticeTest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const { securedData, originalEmail } = req.body || {};
  if (!securedData || !originalEmail) {
    return res.status(400).json({ success: false, message: 'Missing parameters: securedData and originalEmail' });
  }

  const decoded = {};
  for (const key in securedData) {
    try {
      const str = Buffer.from(securedData[key], 'base64').toString('utf8');
      decoded[key] = str.slice(0, Math.floor(str.length / 2));
    } catch {
      decoded[key] = null;
    }
  }
  const match = decoded.email === originalEmail;
  return res.status(200).json({
    success: match,
    message: match ? 'Verification successful' : 'Verification failed',
    decoded,
    expected: { email: originalEmail }
  });
}

/**
 * GET/POST /diagnostics/test
 * Echoes back method, timestamp, query or body.
 */
async function handleTestEndpoint(req, res) {
  if (req.method === 'GET') {
    const query = req.url.split('?')[1] || '';
    return res.status(200).json({ success: true, method: 'GET', timestamp: new Date().toISOString(), query });
  }
  if (req.method === 'POST') {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Missing body' });
    }
    return res.status(200).json({ success: true, method: 'POST', timestamp: new Date().toISOString(), data: req.body });
  }
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

/**
 * GET /diagnostics/vercel
 * Reads vercel.json and returns its structure.
 */
async function handleVercelStructure(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
    return res.status(200).json({ version: cfg.version, builds: cfg.builds, routes: cfg.routes });
  } catch (e) {
    console.error('Vercel config error:', e);
    return res.status(404).json({ error: 'vercel.json not found or unreadable' });
  }
}

/**
 * POST /diagnostics/bug-report
 * Logs or persists user-submitted bug reports.
 */
async function handleBugReport(req, res) {
  const { userId, description, steps, severity } = req.body || {};
  if (!userId || !description) {
    return res.status(400).json({ success: false, message: 'Missing userId or description' });
  }
  // TODO: Persist to DB or send notification/email
  console.info('Bug report received:', { userId, severity, steps, description });
  return res.status(201).json({ success: true, message: 'Bug report received' });
}

/**
 * POST /diagnostics/feature-request
 * Logs or persists user feature requests.
 */
async function handleFeatureRequest(req, res) {
  const { userId, feature, details } = req.body || {};
  if (!userId || !feature) {
    return res.status(400).json({ success: false, message: 'Missing userId or feature' });
  }
  console.info('Feature request received:', { userId, feature, details });
  return res.status(201).json({ success: true, message: 'Feature request received' });
}

/**
 * GET /diagnostics/release-notes
 * Returns contents of CHANGELOG.md.
 */
async function handleGetReleaseNotes(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const notes = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');
    return res.status(200).json({ success: true, notes });
  } catch (e) {
    console.error('Changelog read error:', e);
    return res.status(404).json({ success: false, message: 'CHANGELOG.md not found' });
  }
}

/**
 * GET /diagnostics/audio-preflight
 * Provides instructions for client-side audio testing.
 */
async function handleAudioPreflight(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  return res.status(200).json({
    success: true,
    message: 'Audio preflight: invoke client-side test at /client/audio-test'
  });
}

module.exports = {
  handleEnvCheck,
  handleHealthCheck,
  handleLatticeTest,
  handleTestEndpoint,
  handleVercelStructure,
  handleBugReport,
  handleFeatureRequest,
  handleGetReleaseNotes,
  handleAudioPreflight
};
