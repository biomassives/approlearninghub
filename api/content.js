// /api/content.js
const express = require('express');
const router = express.Router();

// Sample data for testing
const featuredContent = [
  {
    id: 1,
    title: 'Getting Started with ApproVideo',
    description: 'Learn the basics of our platform',
    type: 'video',
    url: '/videos/getting-started',
    thumbnail: '/images/thumbnails/getting-started.jpg',
    featured: true
  },
  {
    id: 2,
    title: 'Advanced Library Management',
    description: 'Master the library management features',
    type: 'article',
    url: '/articles/advanced-library',
    thumbnail: '/images/thumbnails/library-mgmt.jpg',
    featured: true
  },
  {
    id: 3,
    title: 'Content Security Best Practices',
    description: 'Learn about our lattice method for data security',
    type: 'guide',
    url: '/guides/security',
    thumbnail: '/images/thumbnails/security.jpg',
    featured: true
  }
];

// Featured content endpoint - simplified to avoid errors
router.get('/featured', (req, res) => {
  try {
    console.log('🔍 Featured content requested with query:', req.query);
    
    const limit = parseInt(req.query.limit) || 10;
    const content = featuredContent.slice(0, limit);
    
    return res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error in featured endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get content by ID - simplified to avoid errors
router.get('/:id', (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    const content = featuredContent.find(item => item.id === contentId);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: `Content with ID ${contentId} not found`
      });
    }
    
    return res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error in content/:id endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;