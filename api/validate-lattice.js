// File: /api/validate-lattice.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { challenge, address, timestamp } = req.body;

    if (!challenge || !address || !timestamp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // TODO: Insert actual validation logic or interface with C++ bindings
    const isValid = true; // Simulated result

    if (isValid) {
      return res.status(200).json({ status: 'ok', sig: `signed(${challenge})` });
    } else {
      return res.status(403).json({ status: 'invalid' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
