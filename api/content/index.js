/**
 * /api/content
 * Handles internal content creation/editing endpoints.
 * Includes learning modules, library item uploads, and video metadata.
 */

const handleVideos = require('./handlers/videos');
const handleModules = require('./handlers/modules');
const handleLibrary = require('./handlers/library');

module.exports = async (req, res) => {
  const type = req.query.type;

  switch (type) {
    case 'videos': return handleVideos(req, res);
    case 'modules': return handleModules(req, res);
    case 'library': return handleLibrary(req, res);
    default:
      return res.status(400).json({ error: 'Invalid content type' });
  }
};
