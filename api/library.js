// api/library.js
const express = require('express');
const router = express.Router();
const { requireAuth, authorize } = require('../lib/authMiddleware');
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
  handleUpdateModule,
  handleListSubcategoriesByCategory, 
  // handleGetSubcategory, 
  handleAddSubcategory,   
  handleUpdateSubcategory,    
  handleDeleteSubcategory     

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
  .post(requireAuth, authorize(['admin', 'expert']), handleAddCategory);

router.route('/categories/:id')
  // Protected: update category
  .put(requireAuth, handleUpdateCategory)
  // Protected: delete category
  .delete(requireAuth, authorize(['admin', 'expert']), handleDeleteCategory);



// Nested route to get subcategories for a specific category
// Public: List subcategories by category
router.get('/categories/:categoryId/subcategories', handleListSubcategoriesByCategory);

// Route to create a new subcategory
// Protected: Add subcategory
router.post(
    '/subcategories',               // Matches frontend expectation
    requireAuth,                    // User must be logged in
    authorize(['admin', 'expert']), // User must have admin or expert role
    handleAddSubcategory            // The handler function in libraryHandlers.js
);

// Routes for operating on a specific subcategory by its ID
router.route('/subcategories/:id')
  // Optional: Get details for a single subcategory (Make public or protected as needed)
  // .get(handleGetSubcategory) // Uncomment and add handler if needed

  // Protected: Update subcategory
  .put(
      requireAuth,
      authorize(['admin', 'expert']),
      handleUpdateSubcategory
  )
  // Protected: Delete subcategory
  .delete(
      requireAuth,
      authorize(['admin', 'expert']),
      handleDeleteSubcategory
  );


// ---- Tags ----
router.route('/tags')
  // Public: list tags
  .get(handleListTags)
  // Protected: add tag
  .post(requireAuth, authorize(['admin', 'expert']), handleAddTag);

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
  .post(requireAuth, authorize(['admin', 'expert']), handleAddModule);

router.route('/modules/:id')
  // Protected: update module
  .put(requireAuth, authorize(['admin', 'expert']), handleUpdateModule);

// Error handler (must be last)
router.use((err, req, res, next) => {
  console.error('Library API error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Server error'
  });
});

module.exports = router;
