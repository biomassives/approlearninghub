// api/integrations.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('./middleware/auth');
const { getSupabase } = require('./lib/supabaseClient');

// Use the shared Supabase client instance
const supabase = getSupabase();

console.log('📡 Integrations handler loaded');

// Define routes with authentication
router.get('/integrations', authenticate, async (req, res) => {
  try {
    // Example implementation - modify as needed
    const { data, error } = await supabase
      .from('integrations')
      .select('*');
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Integration fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch integrations',
      error: error.message
    });
  }
});

// Export the router
module.exports = router;
