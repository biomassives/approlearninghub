// lattice-validator.js
// Simple consensus validation based on e8-parse-auth.js structure

window.LatticeValidator = (function () {
  const NODE_ENDPOINTS = [
    'https://node1.worldbridger.one/validate',
    'https://node2.worldbridger.one/validate',
    'https://node3.worldbridger.one/validate'
  ];

  async function verify(data) {
    try {
      const signatures = await Promise.all(
        NODE_ENDPOINTS.map(async (url) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return res.json();
        })
      );

      const validSignatures = signatures.filter(s => s.status === 'ok' && s.sig);

      // Simple 2/3 quorum check
      if (validSignatures.length >= 2) {
        return {
          success: true,
          quorum: validSignatures.length,
          signatures: validSignatures
        };
      } else {
        return {
          success: false,
          error: 'Insufficient consensus',
          signatures
        };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return {
    verify
  };
})();
