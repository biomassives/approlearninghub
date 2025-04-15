module.exports = async function handleHealthCheck(req, res) {
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
  };
  