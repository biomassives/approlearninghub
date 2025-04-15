// api/public.js
// ApproVideo Public API Router
// Supports the following endpoints via `?action=` query string:
//   - videos
//   - search
//   - featured
//   - homepage
//   - timeline
//   - clinics
//   - modules
//   - panels
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleClinics,
  handleModules,
  handlePanels,
  handleVideos,
  handleSearch,
  handleTimelineData,
  handleHomePageData,
  handleFeaturedVideos
} = require('../lib/publicHandlers');

module.exports = async function publicRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    case 'clinics': return handleClinics(req, res);
    case 'modules': return handleModules(req, res);
    case 'panels': return handlePanels(req, res);
    case 'videos': return handleVideos(req, res);
    case 'search': return handleSearch(req, res);
    case 'timeline': return handleTimelineData(req, res);
    case 'homepage': return handleHomePageData(req, res);
    case 'featured': return handleFeaturedVideos(req, res);
    default: return res.status(404).json({ error: 'Invalid public action' });
  }
};

