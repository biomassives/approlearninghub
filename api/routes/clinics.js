// File: /api/routes/clinics.js

const express = require('express');
const router = express.Router();
const path = require('path');


// Route to serve the dynamic clinic template
router.get('/clinic', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/templates/clinic.html'));
});

// Route for resource downloads
router.get('/api/resources/download/:area/:subcategorySlug', (req, res) => {
  const { area, subcategorySlug } = req.params;
  
  // In a real implementation, this would call your existing download handler
  // For now, we'll just send a placeholder response
  res.json({
    success: true,
    message: `Download requested for ${area}/${subcategorySlug}`,
    // In actual implementation, this would trigger the zip download
  });
});

module.exports = router;