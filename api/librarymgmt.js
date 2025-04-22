const {
    handleListCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleListTags,
    handleAddTag,
    handleDeleteTag,
    handleAddVideo,
    handleListVideos,
    handleDeleteVideo,
    handleUpdateVideo
  } = require('../lib/libraryHandlers');
  
  module.exports = async function (req, res, next) {
    try {
      const action = (req.body && req.body.action) || (req.query && req.query.action);
      if (!action) {
        return res.status(400).json({ error: 'No action specified' });
      }
  
      switch (action) {
        case 'list-categories':
          return await handleListCategories(req, res, next);
        case 'add-category':
          return await handleAddCategory(req, res, next);
        case 'update-category':
          return await handleUpdateCategory(req, res, next);
        case 'delete-category':
          return await handleDeleteCategory(req, res, next);
        case 'list-tags':
          return await handleListTags(req, res, next);
        case 'add-tag':
          return await handleAddTag(req, res, next);
        case 'update-tag':
          return await handleUpdateTag(req, res, next);  
        case 'delete-tag':
          return await handleDeleteTag(req, res, next);
        case 'add-video':
            return await handleAddVideo(req, res, next);
        case 'list-videos':
            return await handleListVideos(req, res, next);
        case 'delete-video':
            return await handleDeleteVideo(req, res, next);  
        case 'update-video':
          return await handleUpdateVideo(req, res, next);
        default:
          return res.status(400).json({ error: 'Unknown action' });
      }
    } catch (err) {
      return next(err);
    }
  };
  