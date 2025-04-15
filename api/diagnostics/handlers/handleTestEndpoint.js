module.exports = async function handleTestEndpoint(req, res) {
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
  };
  