module.exports = async function handleLatticeTest(req, res) {
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
  };
  