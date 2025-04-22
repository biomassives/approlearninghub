// api/translations.js
// ApproVideo Translation API Router
// Supports the following endpoints via `?action=` query string:
//   - suggest
//   - invite
//   - accept-invite
//   - verify-invite
//   - list
//   - fetch
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleSuggest,
  handleInvite,
  handleAcceptInvite,
  handleVerifyInvite,
  handleListLanguages,
  handleFetchTranslations
} = require('../lib/translationHandler');

module.exports = async function translationRouter(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'suggest': return handleSuggest(req, res);
    case 'invite': return handleInvite(req, res);
    case 'accept-invite': return handleAcceptInvite(req, res);
    case 'verify-invite': return handleVerifyInvite(req, res);
    case 'list': return handleListLanguages(req, res);
    case 'fetch': return handleFetchTranslations(req, res);
    default: return res.status(404).json({ error: 'Invalid translation action' });
  }
};
