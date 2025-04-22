// api/integrations.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('./middleware/auth');
const { getSupabase } = require('./lib/supabaseClient');

// Use the shared Supabase client instance
const supabase = getSupabase();
console.log('📡 Integrations handler loaded');

// Base route for all integrations
router.get('/', authenticate, async (req, res) => {
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

// Settings endpoint
router.get('/settings', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Integration settings fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch integration settings',
      error: error.message
    });
  }
});

// Zoom templates endpoint
router.get('/zoom-templates', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('zoom_templates')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    // If no templates exist, return an empty array instead of null
    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Zoom templates fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Zoom templates',
      error: error.message
    });
  }
});

// Add more integration routes as needed
// ...

// Export the router
module.exports = router;
