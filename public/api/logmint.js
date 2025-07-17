export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { artistName, walletAddress, nftAddress, timestamp } = req.body;

  if (!artistName || !walletAddress || !nftAddress) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const kvKey = `poap:${nftAddress}`;
  const entry = { artistName, walletAddress, nftAddress, timestamp };

  const response = await fetch(`${process.env.KV_REST_API_URL}/set/${kvKey}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  const result = await response.json();
  res.status(200).json({ success: true, result });
}
