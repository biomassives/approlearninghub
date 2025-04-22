// api/library/index.js
const express   = require('express');
const router    = express.Router();
const supabase  = require('../lib/supabaseClient');
const { authenticate } = require('../middleware/auth');

// Public: list all videos (with category & subcategory labels)
router.get('/videos', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        url,
        thumbnail_url,
        category:categories(name),
        subcategory:subcategories(name),
        published_at
      `)
      .order('published_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /library/videos error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
