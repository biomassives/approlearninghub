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


/**
 * Handles GET /api/library/categories/:categoryId/subcategories
 * Lists subcategories belonging to a specific parent category.
 */
async function handleListSubcategoriesByCategory(req, res) {
    const { categoryId } = req.params;

    if (!categoryId) {
        return res.status(400).json({ success: false, error: 'Parent category ID is required.' });
    }

    try {
        console.log(`[Handlers] Fetching subcategories for category ID: ${categoryId}`);
        const { data, error } = await supabase
            .from('subcategories') // Verify your table name
            .select('id, name, title, description, tags, created_at') // Adjust columns as needed
            .eq('parent_category_id', categoryId) // Verify parent category foreign key column name
            .order('created_at', { ascending: true });

        if (error) throw error;

        console.log(`[Handlers] Found ${data?.length || 0} subcategories.`);
        // Match response structure if needed, e.g., { success: true, subcategories: data }
        res.json({ success: true, data: data || [] });

    } catch (err) {
        console.error('[Handlers] handleListSubcategoriesByCategory error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Handles POST /api/library/subcategories
 * Adds a new subcategory. Requires authentication and authorization (handled by middleware).
 */
async function handleAddSubcategory(req, res) {
    // req.user is attached by the requireAuth (authenticate) middleware
    const userId = req.user?.id; // Get user ID from authenticated request
    const { categoryId, title, description, tags } = req.body;

    // Validation
    if (!userId) {
         // Should ideally be caught by middleware, but good practice to check
         return res.status(401).json({ success: false, error: 'User not authenticated properly.' });
    }
    if (!categoryId || !title) {
        return res.status(400).json({ success: false, error: 'Missing required fields: categoryId and title.' });
    }

    try {
        console.log(`[Handlers] Adding subcategory '${title}' to category ID: ${categoryId} by user ID: ${userId}`);

        const newSubcategoryData = {
            parent_category_id: categoryId, // Verify column name
            title: title,
            name: title, // Assuming 'name' is used like in categories/tags for consistency
            description: description || null,
            // Process tags safely: ensure it's an array, handle null/empty string
            tags: Array.isArray(tags) ? tags.filter(t => t) : (tags ? String(tags).split(',').map(t => t.trim()).filter(t => t) : []),
            created_by: userId, // Verify column name
        };

        const { data, error } = await supabase
            .from('subcategories') // Verify table name
            .insert(newSubcategoryData)
            .select() // Return the newly created row
            .single(); // Expecting only one row back

        if (error) throw error; // Let the catch block handle it

        console.log('[Handlers] Subcategory added successfully:', data);
        // Match response structure - returning the created object
        res.status(201).json({ success: true, subcategory: data });

    } catch (err) {
        console.error('[Handlers] handleAddSubcategory error:', err);
         // Check for specific Supabase errors if needed (e.g., foreign key violation)
         if (err.code === '23503') { // Foreign key violation
             return res.status(400).json({ success: false, error: 'Invalid parent category ID.' });
         }
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Handles PUT /api/library/subcategories/:id
 * Updates an existing subcategory. Requires authentication and authorization.
 */
async function handleUpdateSubcategory(req, res) {
    const { id } = req.params;
    // Destructure only the fields you allow updating from the body
    const { title, description, tags, name } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Subcategory ID is required.' });
    }

    // Prepare updates object, only including fields that were actually provided
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (name !== undefined) updates.name = name; // Assuming name can be updated
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) {
        updates.tags = Array.isArray(tags) ? tags.filter(t => t) : (tags ? String(tags).split(',').map(t => t.trim()).filter(t => t) : []);
    }
    // Add other updatable fields here

    // Check if any valid update fields were provided
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid update data provided.' });
    }

    try {
        console.log(`[Handlers] Updating subcategory ID: ${id} with data:`, updates);

        const { data, error } = await supabase
            .from('subcategories') // Verify table name
            .update(updates)
            .eq('id', id)
            .select() // Return the updated row
            .single();

        if (error) throw error;

        // Supabase returns null data if the 'id' doesn't match any row with RLS select permission
        if (!data) {
             // It's possible the row exists but RLS prevented the select after update,
             // or the row simply doesn't exist. 404 is reasonable.
             return res.status(404).json({ success: false, error: 'Subcategory not found or update failed.' });
        }

        console.log('[Handlers] Subcategory updated successfully:', data);
        // Match response structure - returning the updated object
        res.json({ success: true, subcategory: data });

    } catch (err) {
        console.error('[Handlers] handleUpdateSubcategory error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Handles DELETE /api/library/subcategories/:id
 * Deletes an existing subcategory. Requires authentication and authorization.
 */
async function handleDeleteSubcategory(req, res) {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Subcategory ID is required.' });
    }

    try {
        console.log(`[Handlers] Deleting subcategory ID: ${id}`);

        // Perform the delete operation
        const { error, count } = await supabase
            .from('subcategories') // Verify table name
            .delete()
            .eq('id', id);

        // Check for errors during deletion
        if (error) throw error;

        // Check if any row was actually deleted. Supabase v2+ delete doesn't return count by default.
        // We rely on the error being null for success. If RLS prevents delete, an error might occur?
        // Or maybe no error but nothing is deleted. Checking if an error occurred is primary.
        // If you NEED to confirm deletion, you might need a select before delete, or specific RLS policy.
        // For now, assume success if no error occurred.

        console.log(`[Handlers] Subcategory ${id} deleted request processed.`);
        // Match response structure
        res.json({ success: true, message: `Subcategory ${id} deleted.` });
        // Or use 204 No Content: res.status(204).send();

    } catch (err) {
        console.error('[Handlers] handleDeleteSubcategory error:', err);
        // Handle potential foreign key constraints if modules depend on this subcategory
        // and cascade delete isn't set up in the database.
        if (err.code === '23503') { // Foreign key violation
            return res.status(409).json({ success: false, error: 'Cannot delete subcategory because it still contains modules.' }); // 409 Conflict
        }
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
  handleUpdateModule,
  handleListSubcategoriesByCategory,
  handleAddSubcategory,
  handleUpdateSubcategory,
  handleDeleteSubcategory
};
