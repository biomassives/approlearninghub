const fs = require('fs');
const path = require('path');

module.exports = async function handleVercelStructure(req, res) {
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
};
