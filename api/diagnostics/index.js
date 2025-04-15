// api/diagnostics/index.js
// Consolidated diagnostics endpoint using modular handlers

const {
  handleHealthCheck,
  handleEnvCheck,
  handleLatticeTest,
  handleVercelStructure,
  handleTestEndpoint
} = require('./handlers');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const operation = url.pathname.split('/diagnostics/')[1] || url.searchParams.get('op') || 'health';

  try {
    switch (operation) {
      case 'health':
        return handleHealthCheck(req, res);
      case 'env-check':
        return handleEnvCheck(req, res);
      case 'test-lattice':
        return handleLatticeTest(req, res);
      case 'vercel-structure':
        return handleVercelStructure(req, res);
      case 'test-endpoint':
        return handleTestEndpoint(req, res);
      default:
        return res.status(404).json({
          success: false,
          message: `Unknown diagnostic operation: ${operation}`
        });
    }
  } catch (error) {
    console.error(`Error in diagnostics/${operation}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: isDev ? error.message : 'Unknown server error'
    });
  }
};
