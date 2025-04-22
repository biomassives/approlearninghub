// lib/libraryHandlers.js
require('dotenv').config();
const supabase = require('./supabaseClient');

/** GET /api/library/categories */
async function handleListCategories(req, res) {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    res.json({ success: true, categories: data });
  } catch (err) {
    console.error('handleListCategories error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/library/categories */
async function handleAddCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Missing category name' });
    const { data, error } = await supabase.from('categories').insert([{ name }]).single();
    if (error) throw error;
    res.status(201).json({ success: true, category: data });
  } catch (err) {
    console.error('handleAddCategory error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/library/categories/:id */
async function handleUpdateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Missing category name' });
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json({ success: true, category: data });
  } catch (err) {
    console.error('handleUpdateCategory error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** DELETE /api/library/categories/:id */
async function handleDeleteCategory(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('handleDeleteCategory error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/library/tags */
async function handleListTags(req, res) {
  try {
    const { data, error } = await supabase.from('tags').select('*');
    if (error) throw error;
    res.json({ success: true, tags: data });
  } catch (err) {
    console.error('handleListTags error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/library/tags */
async function handleAddTag(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Missing tag name' });
    const { data, error } = await supabase.from('tags').insert([{ name }]).single();
    if (error) throw error;
    res.status(201).json({ success: true, tag: data });
  } catch (err) {
    console.error('handleAddTag error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/library/tags/:id */
async function handleUpdateTag(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Missing tag name' });
    const { data, error } = await supabase.from('tags').update({ name }).eq('id', id).single();
    if (error) throw error;
    res.json({ success: true, tag: data });
  } catch (err) {
    console.error('handleUpdateTag error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** DELETE /api/library/tags/:id */
async function handleDeleteTag(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('handleDeleteTag error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/library/videos */
async function handleListVideos(req, res) {
  try {
    const { data, error } = await supabase.from('videos').select('*');
    if (error) throw error;
    res.json({ success: true, videos: data });
  } catch (err) {
    console.error('handleListVideos error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/library/videos */
async function handleAddVideo(req, res) {
  try {
    const { title, url, categoryId, tagIds } = req.body;
    if (!title || !url) return res.status(400).json({ success: false, error: 'Missing title or URL' });
    const payload = { title, url, category_id: categoryId, tags: tagIds };
    const { data, error } = await supabase.from('videos').insert([payload]).single();
    if (error) throw error;
    res.status(201).json({ success: true, video: data });
  } catch (err) {
    console.error('handleAddVideo error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/library/videos/:id */
async function handleUpdateVideo(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('videos').update(updates).eq('id', id).single();
    if (error) throw error;
    res.json({ success: true, video: data });
  } catch (err) {
    console.error('handleUpdateVideo error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** DELETE /api/library/videos/:id */
async function handleDeleteVideo(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('handleDeleteVideo error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/library/modules */
async function handleAddModule(req, res) {
  try {
    const { title, description, categoryId } = req.body;
    if (!title || !description) return res.status(400).json({ success: false, error: 'Missing title or description' });
    const payload = { title, description, category_id: categoryId };
    const { data, error } = await supabase.from('modules').insert([payload]).single();
    if (error) throw error;
    res.status(201).json({ success: true, module: data });
  } catch (err) {
    console.error('handleAddModule error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/library/modules/:id */
async function handleUpdateModule(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('modules').update(updates).eq('id', id).single();
    if (error) throw error;
    res.json({ success: true, module: data });
  } catch (err) {
    console.error('handleUpdateModule error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
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
};
