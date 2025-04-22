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
//   - user-progress
//   - user-notes
//   - track-progress
//   - save-note
//   - get-zoom-link
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const {
  handleVideos,
  handleSearch,
  handleTimelineData,
  handleHomePageData,
  handleFeaturedVideos,
  handleClinics,
  handleModules,
  handlePanels,
  handleUserProgress,
  handleUserNotes,
  handleTrackProgress,
  handleSaveNote,
  handleGetZoomLink
} = require('../lib/publicHandlers');

module.exports = async function publicRouter(req, res) {
  const action = req.query.action || req.body?.action;

  switch (action) {
    // Existing endpoints
    case 'videos': return handleVideos(req, res);
    case 'search': return handleSearch(req, res);
    case 'timeline': return handleTimelineData(req, res);
    case 'homepage': return handleHomePageData(req, res);
    case 'featured': return handleFeaturedVideos(req, res);
    
    // Learning module endpoints
    case 'clinics': return handleClinics(req, res);
    case 'modules': return handleModules(req, res);
    case 'panels': return handlePanels(req, res);
    case 'user-progress': return handleUserProgress(req, res);
    case 'user-notes': return handleUserNotes(req, res);
    case 'get-zoom-link': return handleGetZoomLink(req, res);
    
    // POST-based actions handled via POST method check
    default:
      if (req.method === 'POST') {
        switch (action) {
          case 'track-progress': return handleTrackProgress(req, res);
          case 'save-note': return handleSaveNote(req, res);
          default: break;
        }
      }
      
      return res.status(404).json({ error: 'Invalid public action' });
  }
};