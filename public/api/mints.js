//approlearninghub/public/api/mints.js

export default async function handler(req, res) {
  const response = await fetch(`${process.env.KV_REST_API_URL}/keys?prefix=poap:`, {
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
    }
  });

  const { keys } = await response.json();

  const results = await Promise.all(
    keys.map(async (key) => {
      const r = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      });
      return r.json();
    })
  );

  res.status(200).json(results);
}
