// lib/taxonomyHandlers.js
// ApproVideo Taxonomy API Handlers
// Supports category, subcategory, and tag management functionalities
// with Supabase integration and lattice security
//
// Supported handlers:
//   - handleFetchCategories
//   - handleFetchTags
//   - handleCreateCategory
//   - handleUpdateCategory
//   - handleDeleteCategory
//   - handleCreateSubcategory
//   - handleUpdateSubcategory
//   - handleDeleteSubcategory
//   - handleCreateTag
//   - handleUpdateTag
//   - handleDeleteTag
//   - handleFetchCategoryCounts
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const { verifyLatticeSession } = require('./latticeAuth');
const supabase = require('./supabaseServer');

// Helper function to verify user permissions
async function verifyPermissions(req, requiredRole = 'editor') {
  const userId = req.user?.id;
  if (!userId) throw new Error('Authentication required');
  
  // Verify lattice session
  const latticeVerified = await verifyLatticeSession(req.headers.authorization);
  if (!latticeVerified) throw new Error('Security session validation failed');

  // Verify user role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error) throw new Error('Failed to verify user role');
  
  const userRole = profile?.role || 'user';
  const roles = {
    user: 0,
    editor: 1,
    expert: 2, 
    admin: 3
  };
  
  if (roles[userRole] < roles[requiredRole]) {
    throw new Error('Insufficient permissions');
  }
  
  return { userId, role: userRole };
}

// Generate a URL-friendly slug from a string
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

// Fetch all categories with their subcategories
async function handleFetchCategories(req, res) {
  try {
    // Only require basic user role for fetching
    await verifyPermissions(req, 'user');
    
    const { data, error } = await supabase
      .from('Category')
      .select(`
        id,
        name,
        slug,
        subcategories:Subcategory(*)
      `)
      .order('name');
    
    if (error) throw error;
    
    // Sort subcategories alphabetically for each category
    const processedData = data.map(category => ({
      ...category,
      subcategories: (category.subcategories || []).sort((a, b) => 
        a.name.localeCompare(b.name)
      )
    }));
    
    return res.status(200).json({ 
      success: true, 
      categories: processedData 
    });
  } catch (err) {
    console.error('Error in handleFetchCategories:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to fetch categories'
    });
  }
}

// Fetch all tags
async function handleFetchTags(req, res) {
  try {
    // Only require basic user role for fetching
    await verifyPermissions(req, 'user');
    
    const { data, error } = await supabase
      .from('Tag')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      tags: data 
    });
  } catch (err) {
    console.error('Error in handleFetchTags:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to fetch tags'
    });
  }
}





// Update an existing subcategory
async function handleUpdateSubcategory(req, res) {
  try {
    // Require editor role for updating subcategories
    await verifyPermissions(req, 'editor');
    
    const { id, updates } = req.body;
    if (!id || !updates) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subcategory ID and updates are required'
      });
    }
    
    // Get current subcategory data for validation
    const { data: existing, error: fetchError } = await supabase
      .from('Subcategory')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(404).json({ 
        success: false, 
        error: 'Subcategory not found'
      });
    }
    
    // Prepare updates object
    const validUpdates = {};
    if (updates.name && typeof updates.name === 'string' && updates.name.trim()) {
      validUpdates.name = updates.name.trim();
      
      // Auto-generate slug if name changes and slug not provided
      if (!updates.slug) {
        validUpdates.slug = slugify(updates.name);
      }
    }
    
    if (updates.slug && typeof updates.slug === 'string' && updates.slug.trim()) {
      validUpdates.slug = updates.slug.trim();
    }
    
    // Allow changing parent category
    if (updates.category_id) {
      // Check if new parent category exists
      const { data: category, error: categoryError } = await supabase
        .from('Category')
        .select('id')
        .eq('id', updates.category_id)
        .single();
      
      if (categoryError) {
        return res.status(400).json({ 
          success: false, 
          error: 'New parent category not found'
        });
      }
      
      validUpdates.category_id = updates.category_id;
    }
    
    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid updates provided'
      });
    }
    
    // Check for duplicate slug if slug is being updated
    if (validUpdates.slug) {
      const categoryId = validUpdates.category_id || existing.category_id;
      
      const { data: duplicate, error: checkError } = await supabase
        .from('Subcategory')
        .select('id')
        .eq('slug', validUpdates.slug)
        .eq('category_id', categoryId)
        .neq('id', id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw checkError;
      }
      
      if (duplicate) {
        return res.status(400).json({ 
          success: false, 
          error: 'A subcategory with this slug already exists in this category'
        });
      }
    }
    
    // Update the subcategory
    const { data, error } = await supabase
      .from('Subcategory')
      .update(validUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      subcategory: data
    });
  } catch (err) {
    console.error('Error in handleUpdateSubcategory:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to update subcategory'
    });
  }
}



// Create a new tag
async function handleCreateTag(req, res) {
  try {
    // Require editor role for creating tags
    await verifyPermissions(req, 'editor');
    
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tag name is required'
      });
    }
    
    // Generate slug if not provided
    const slug = req.body.slug || slugify(name);
    
    // Check for duplicate slug
    const { data: existing, error: checkError } = await supabase
      .from('Tag')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'A tag with this slug already exists'
      });
    }
    
    // Create the tag
    const { data, error } = await supabase
      .from('Tag')
      .insert({ name: name.trim(), slug })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json({ 
      success: true, 
      tag: data
    });
  } catch (err) {
    console.error('Error in handleCreateTag:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to create tag'
    });
  }
}




// Create a new category
async function handleCreateCategory(req, res) {
  try {
    // Require editor role for creating categories
    await verifyPermissions(req, 'editor');
    
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category name is required'
      });
    }
    
    // Generate slug if not provided
    const slug = req.body.slug || slugify(name);
    
    // Check for duplicate slug
    const { data: existing, error: checkError } = await supabase
      .from('Category')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'A category with this slug already exists'
      });
    }
    
    // Create the category
    const { data, error } = await supabase
      .from('Category')
      .insert({ name: name.trim(), slug })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json({ 
      success: true, 
      category: data
    });
  } catch (err) {
    console.error('Error in handleCreateCategory:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to create category'
    });
  }
}

// Update an existing category
async function handleUpdateCategory(req, res) {
  try {
    // Require editor role for updating categories
    await verifyPermissions(req, 'editor');
    
    const { id, updates } = req.body;
    if (!id || !updates) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category ID and updates are required'
      });
    }
    
    // Prepare updates object
    const validUpdates = {};
    if (updates.name && typeof updates.name === 'string' && updates.name.trim()) {
      validUpdates.name = updates.name.trim();
      
      // Auto-generate slug if name changes and slug not provided
      if (!updates.slug) {
        validUpdates.slug = slugify(updates.name);
      }
    }
    
    if (updates.slug && typeof updates.slug === 'string' && updates.slug.trim()) {
      validUpdates.slug = updates.slug.trim();
    }
    
    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid updates provided'
      });
    }
    
    // Check for duplicate slug if slug is being updated
    if (validUpdates.slug) {
      const { data: existing, error: checkError } = await supabase
        .from('Category')
        .select('id')
        .eq('slug', validUpdates.slug)
        .neq('id', id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw checkError;
      }
      
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: 'A category with this slug already exists'
        });
      }
    }
    
    // Update the category
    const { data, error } = await supabase
      .from('Category')
      .update(validUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      category: data
    });
  } catch (err) {
    console.error('Error in handleUpdateCategory:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to update category'
    });
  }
}

// Delete a category
async function handleDeleteCategory(req, res) {
  try {
    // Require editor role for deleting categories
    await verifyPermissions(req, 'editor');
    
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category ID is required'
      });
    }
    
    // Check if the category has subcategories
    const { data: subcategories, error: checkError } = await supabase
      .from('Subcategory')
      .select('id')
      .eq('category_id', id);
    
    if (checkError) throw checkError;
    
    if (subcategories && subcategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete a category that has subcategories. Delete the subcategories first.'
      });
    }
    
    // Check if the category is used by any videos
    const { count, error: countError } = await supabase
      .from('Video')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    
    if (countError) throw countError;
    
    if (count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete a category that is used by ${count} videos. Reassign those videos first.`
      });
    }
    
    // Delete the category
    const { error } = await supabase
      .from('Category')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true,
      id
    });
  } catch (err) {
    console.error('Error in handleDeleteCategory:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to delete category'
    });
  }
}

// Create a new subcategory
async function handleCreateSubcategory(req, res) {
  try {
    // Require editor role for creating subcategories
    await verifyPermissions(req, 'editor');
    
    const { name, category_id } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subcategory name is required'
      });
    }
    
    if (!category_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parent category ID is required'
      });
    }
    
    // Check if parent category exists
    const { data: category, error: categoryError } = await supabase
      .from('Category')
      .select('id')
      .eq('id', category_id)
      .single();
    
    if (categoryError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parent category not found'
      });
    }
    
    // Generate slug if not provided
    const slug = req.body.slug || slugify(name);
    
    // Check for duplicate slug within this category
    const { data: existing, error: checkError } = await supabase
      .from('Subcategory')
      .select('id')
      .eq('slug', slug)
      .eq('category_id', category_id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'A subcategory with this slug already exists in this category'
      });
    }
    
    // Create the subcategory
    const { data, error } = await supabase
      .from('Subcategory')
      .insert({ 
        name: name.trim(), 
        slug,
        category_id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json({ 
      success: true, 
      subcategory: data
    });
  } catch (err) {
    console.error('Error in handleCreateSubcategory:', err);
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      error: err.message || 'Failed to create subcategory'
    });
  }
}





// Delete a subcategory
async function handleDeleteSubcategory(req, res) {
try {
  // Require editor role for deleting subcategories
  await verifyPermissions(req, 'editor');
  
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Subcategory ID is required'
    });
  }
  
  // Check if the subcategory is used by any videos
  const { count, error: countError } = await supabase
    .from('Video')
    .select('id', { count: 'exact', head: true })
    .eq('subcategory_id', id);
  
  if (countError) throw countError;
  
  if (count > 0) {
    return res.status(400).json({ 
      success: false, 
      error: `Cannot delete a subcategory that is used by ${count} videos. Reassign those videos first.`
    });
  }
  
  // Delete the subcategory
  const { error } = await supabase
    .from('Subcategory')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  return res.status(200).json({ 
    success: true,
    id
  });
} catch (err) {
  console.error('Error in handleDeleteSubcategory:', err);
  return res.status(err.statusCode || 500).json({ 
    success: false, 
    error: err.message || 'Failed to delete subcategory'
  });
}
}

// Update an existing tag
async function handleUpdateTag(req, res) {
try {
  // Require editor role for updating tags
  await verifyPermissions(req, 'editor');
  
  const { id, updates } = req.body;
  if (!id || !updates) {
    return res.status(400).json({ 
      success: false, 
      error: 'Tag ID and updates are required'
    });
  }
  
  // Prepare updates object
  const validUpdates = {};
  if (updates.name && typeof updates.name === 'string' && updates.name.trim()) {
    validUpdates.name = updates.name.trim();
    
    // Auto-generate slug if name changes and slug not provided
    if (!updates.slug) {
      validUpdates.slug = slugify(updates.name);
    }
  }
  
  if (updates.slug && typeof updates.slug === 'string' && updates.slug.trim()) {
    validUpdates.slug = updates.slug.trim();
  }
  
  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'No valid updates provided'
    });
  }
  
  // Check for duplicate slug if slug is being updated
  if (validUpdates.slug) {
    const { data: existing, error: checkError } = await supabase
      .from('Tag')
      .select('id')
      .eq('slug', validUpdates.slug)
      .neq('id', id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw checkError;
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'A tag with this slug already exists'
      });
    }
  }
  
  // Update the tag
  const { data, error } = await supabase
    .from('Tag')
    .update(validUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  return res.status(200).json({ 
    success: true, 
    tag: data
  });
} catch (err) {
  console.error('Error in handleUpdateTag:', err);
  return res.status(err.statusCode || 500).json({ 
    success: false, 
    error: err.message || 'Failed to update tag'
  });
}
}

// Delete a tag
async function handleDeleteTag(req, res) {
try {
  // Require editor role for deleting tags
  await verifyPermissions(req, 'editor');
  
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Tag ID is required'
    });
  }
  
  // Check for tag usage in videos
  // Note: Assuming tags are stored as an array in the videos table
  const { data: videos, error: fetchError } = await supabase
    .from('Video')
    .select('id, tags')
    .contains('tags', [id]);
  
  if (fetchError) throw fetchError;
  
  if (videos && videos.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete a tag that is used by ${videos.length} videos. Remove the tag from those videos first.`
    });
  }
  
  // Delete the tag
  const { error } = await supabase
    .from('Tag')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  return res.status(200).json({ 
    success: true,
    id
  });
} catch (err) {
  console.error('Error in handleDeleteTag:', err);
  return res.status(err.statusCode || 500).json({ 
    success: false, 
    error: err.message || 'Failed to delete tag'
  });
}
}

// Fetch category and subcategory counts for videos
async function handleFetchCategoryCounts(req, res) {
try {
  // Basic user role is sufficient for viewing counts
  await verifyPermissions(req, 'user');
  
  // Get video counts by category
  const { data: videosByCat, error: catError } = await supabase
    .from('Video')
    .select('category_id');
  
  if (catError) throw catError;
  
  // Get video counts by subcategory
  const { data: videosBySub, error: subError } = await supabase
    .from('Video')
    .select('subcategory_id');
  
  if (subError) throw subError;
  
  // Process the data to get counts
  const categoryCounts = {};
  const subcategoryCounts = {};
  
  videosByCat.forEach(video => {
    if (video.category_id) {
      categoryCounts[video.category_id] = (categoryCounts[video.category_id] || 0) + 1;
    }
  });
  
  videosBySub.forEach(video => {
    if (video.subcategory_id) {
      subcategoryCounts[video.subcategory_id] = (subcategoryCounts[video.subcategory_id] || 0) + 1;
    }
  });
  
  return res.status(200).json({
    success: true,
    counts: {
      categories: categoryCounts,
      subcategories: subcategoryCounts
    }
  });
} catch (err) {
  console.error('Error in handleFetchCategoryCounts:', err);
  return res.status(err.statusCode || 500).json({ 
    success: false, 
    error: err.message || 'Failed to fetch category counts'
  });
}
}

module.exports = {
handleFetchCategories,
handleFetchTags,
handleCreateCategory,
handleUpdateCategory,
handleDeleteCategory,
handleCreateSubcategory,
handleUpdateSubcategory,
handleDeleteSubcategory,
handleCreateTag,
handleUpdateTag,
handleDeleteTag,
handleFetchCategoryCounts
};