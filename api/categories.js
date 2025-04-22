// /api/categories.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('./middleware/auth');


const supabase = require('./lib/supabaseClient');

// Local cache for categories to reduce database hits
let categoriesCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get all categories
 * Public endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (categoriesCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return res.json({
        success: true,
        categories: categoriesCache,
        fromCache: true
      });
    }
    
    // Fetch all parent categories
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id, 
        name, 
        slug, 
        icon_class, 
        description, 
        subview,
        created_at,
        subcategories:subcategories(
          id, 
          name, 
          slug, 
          description, 
          subview
        )
      `)
      .is('parent_id', null)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Categories fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        error: error.message
      });
    }
    
    // Format and structure the response
    const formattedCategories = categories.map(category => {
      const subcats = category.subcategories || [];
      
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon_class,
        description: category.description,
        subview: category.subview,
        subcategories: subcats.sort((a, b) => a.name.localeCompare(b.name))
      };
    });
    
    // Update cache
    categoriesCache = formattedCategories;
    lastCacheUpdate = Date.now();
    
    return res.json({
      success: true,
      categories: formattedCategories
    });
    
  } catch (err) {
    console.error('Categories fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get a single category by slug with its subcategories
 * Public endpoint
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Fetch the category
    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        id, 
        name, 
        slug, 
        icon_class, 
        description, 
        subview,
        created_at,
        subcategories:subcategories(
          id, 
          name, 
          slug, 
          description, 
          subview
        )
      `)
      .eq('slug', slug)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get video count for this category
    const { count: videoCount, error: countError } = await supabase
      .from('videos')
      .select('id', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published');
    
    if (countError) {
      console.error('Video count error:', countError);
    }
    
    // Format and structure the response
    const formattedCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon_class,
      description: category.description,
      subview: category.subview,
      videoCount: videoCount || 0,
      subcategories: (category.subcategories || []).sort((a, b) => a.name.localeCompare(b.name))
    };
    
    return res.json({
      success: true,
      category: formattedCategory
    });
    
  } catch (err) {
    console.error('Category fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get a subcategory by slug with its videos
 * Public endpoint
 */
router.get('/sub/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Fetch the subcategory
    const { data: subcategory, error } = await supabase
      .from('subcategories')
      .select(`
        id, 
        name, 
        slug, 
        description, 
        subview,
        category:category_id(
          id, 
          name, 
          slug
        )
      `)
      .eq('slug', slug)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    // Get videos for this subcategory
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        youtube_id,
        thumbnail_url,
        rating,
        created_at,
        published_at,
        duration
      `)
      .eq('subcategory_id', subcategory.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (videosError) {
      console.error('Videos fetch error:', videosError);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
        error: videosError.message
      });
    }
    
    // Get total video count for pagination
    const { count: videoCount, error: countError } = await supabase
      .from('videos')
      .select('id', { count: 'exact' })
      .eq('subcategory_id', subcategory.id)
      .eq('status', 'published');
    
    if (countError) {
      console.error('Video count error:', countError);
    }
    
    // Format and structure the response
    const formattedSubcategory = {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      subview: subcategory.subview,
      category: subcategory.category,
      videos,
      videoCount: videoCount || 0
    };
    
    return res.json({
      success: true,
      subcategory: formattedSubcategory,
      total: videoCount || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (err) {
    console.error('Subcategory fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Create a new category
 * Admin only endpoint
 */
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      name,
      slug,
      icon_class,
      description,
      subview
    } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }
    
    // Check if slug is already taken
    const { data: existingCategory, error: slugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    
    if (!slugError && existingCategory && existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slug already in use'
      });
    }
    
    // Create category
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert([
        {
          name,
          slug,
          icon_class,
          description,
          subview,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Category creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
    
    // Clear cache
    categoriesCache = null;
    
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: newCategory
    });
    
  } catch (err) {
    console.error('Category creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Create a new subcategory
 * Admin only endpoint
 */
router.post('/:categoryId/subcategories', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      name,
      slug,
      description,
      subview
    } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }
    
    // Check if parent category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }
    
    // Check if slug is already taken
    const { data: existingSubcategory, error: slugError } = await supabase
      .from('subcategories')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    
    if (!slugError && existingSubcategory && existingSubcategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slug already in use'
      });
    }
    
    // Create subcategory
    const { data: newSubcategory, error } = await supabase
      .from('subcategories')
      .insert([
        {
          category_id: categoryId,
          name,
          slug,
          description,
          subview,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Subcategory creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create subcategory',
        error: error.message
      });
    }
    
    // Clear cache
    categoriesCache = null;
    
    return res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      subcategory: newSubcategory
    });
    
  } catch (err) {
    console.error('Subcategory creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Update a category
 * Admin only endpoint
 */
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      icon_class,
      description,
      subview
    } = req.body;
    
    // Check if slug is already taken by another category
    if (slug) {
      const { data: existingCategory, error: slugError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .limit(1);
      
      if (!slugError && existingCategory && existingCategory.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Slug already in use'
        });
      }
    }
    
    // Build update object
    const updates = {
      updated_at: new Date()
    };
    
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (icon_class !== undefined) updates.icon_class = icon_class;
    if (description !== undefined) updates.description = description;
    if (subview !== undefined) updates.subview = subview;
    
    // Update category
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Category update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
    
    // Clear cache
    categoriesCache = null;
    
    return res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    });
    
  } catch (err) {
    console.error('Category update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Update a subcategory
 * Admin only endpoint
 */
router.put('/sub/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      subview,
      category_id
    } = req.body;
    
    // Check if slug is already taken by another subcategory
    if (slug) {
      const { data: existingSubcategory, error: slugError } = await supabase
        .from('subcategories')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .limit(1);
      
      if (!slugError && existingSubcategory && existingSubcategory.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Slug already in use'
        });
      }
    }
    
    // Build update object
    const updates = {
      updated_at: new Date()
    };
    
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (subview !== undefined) updates.subview = subview;
    if (category_id !== undefined) updates.category_id = category_id;
    
    // Update subcategory
    const { data: updatedSubcategory, error } = await supabase
      .from('subcategories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Subcategory update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update subcategory',
        error: error.message
      });
    }
    
    // Clear cache
    categoriesCache = null;
    
    return res.json({
      success: true,
      message: 'Subcategory updated successfully',
      subcategory: updatedSubcategory
    });
    
  } catch (err) {
    console.error('Subcategory update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Delete a category
 * Admin only endpoint
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has subcategories
    const { data: subcategories, error: subcatError } = await supabase
      .from('subcategories')
      .select('id')
      .eq('category_id', id);
    
    if (!subcatError && subcategories && subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    }
    
    // Check if category has videos
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    
    if (!videosError && videos && videos.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with videos. Reassign videos first.'
      });
    }
    
    // Delete category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Category deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message
      });
    }
    
    // Clear cache
    categoriesCache = null;
    
    return res.json({
      success: true,
      message: 'Category deleted successfully'
    });
    
  } catch (err) {
    console.error('Category deletion error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

module.exports = router;