// api/library.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../lib/authMiddleware');
const {
  handleListCategories,
  handleAddCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleListTags,
  handleAddTag,
  handleUpdateTag,
  handleDeleteTag,
  handleListVideos,
  handleAddVideo,
  handleUpdateVideo,
  handleDeleteVideo,
  handleAddModule,
  handleUpdateModule
} = require('../lib/libraryHandlers');

// Apply security headers to all library routes
router.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ---- Categories ----
router.route('/categories')
  // Public: list categories
  .get(handleListCategories)
  // Protected: add category
  .post(requireAuth, handleAddCategory);

router.route('/categories/:id')
  // Protected: update category
  .put(requireAuth, handleUpdateCategory)
  // Protected: delete category
  .delete(requireAuth, handleDeleteCategory);

// ---- Tags ----
router.route('/tags')
  // Public: list tags
  .get(handleListTags)
  // Protected: add tag
  .post(requireAuth, handleAddTag);

router.route('/tags/:id')
  // Protected: update tag
  .put(requireAuth, handleUpdateTag)
  // Protected: delete tag
  .delete(requireAuth, handleDeleteTag);

// ---- Videos ----
router.route('/videos')
  // Public: list videos
  .get(handleListVideos)
  // Protected: add video
  .post(requireAuth, handleAddVideo);

router.route('/videos/:id')
  // Protected: update video
  .put(requireAuth, handleUpdateVideo)
  // Protected: delete video
  .delete(requireAuth, handleDeleteVideo);

// ---- Modules ----
router.route('/modules')
  // Protected: add module
  .post(requireAuth, handleAddModule);

router.route('/modules/:id')
  // Protected: update module
  .put(requireAuth, handleUpdateModule);

// Error handler (must be last)
router.use((err, req, res, next) => {
  console.error('Library API error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Server error'
  });
});

module.exports = router;
