// /api/tags.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticate, authorize } = require('./middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Local cache for tags
let tagsCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get all tags
 * Public endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (tagsCache && (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      return res.json({
        success: true,
        tags: tagsCache,
        fromCache: true
      });
    }
    
    // Fetch all tags
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Tags fetch error:', error);
      return res.status(500).json({
        success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get video count for each tag
 * Used for tag cloud visualization
 * Public endpoint
 */
router.get('/cloud/data', async (req, res) => {
  try {
    // Check if we have an RPC function for tag counts
    let tagCounts;
    try {
      const { data, error } = await supabase
        .rpc('get_tag_usage_counts');
      
      if (!error) {
        tagCounts = data;
      }
    } catch (rpcErr) {
      console.error('RPC not available:', rpcErr);
    }
    
    // If RPC failed or doesn't exist, do it manually
    if (!tagCounts) {
      // Get all tags
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, name, slug, color');
      
      if (tagsError) {
        console.error('Tags fetch error:', tagsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve tags',
          error: tagsError.message
        });
      }
      
      // Get counts for each tag
      tagCounts = await Promise.all(tags.map(async (tag) => {
        const { count, error: countError } = await supabase
          .from('video_tags')
          .select('*', { count: 'exact' })
          .eq('tag_id', tag.id);
        
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          count: countError ? 0 : count
        };
      }));
    }
    
    // Format for tag cloud visualization
    const tagCloudData = tagCounts
      .filter(tag => tag.count > 0)
      .map(tag => ({
        id: tag.id,
        text: tag.name,
        slug: tag.slug,
        value: tag.count,
        color: tag.color || '#3498db'
      }));
    
    return res.json({
      success: true,
      tags: tagCloudData
    });
    
  } catch (err) {
    console.error('Tag cloud data fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Batch add tags to a video
 * Protected endpoint - requires authentication and appropriate role
 */
router.post('/batch/video/:videoId', authenticate, authorize(['admin', 'expert']), async (req, res) => {
  try {
    const { videoId } = req.params;
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tags array is required'
      });
    }
    
    // Check if video exists and belongs to user or user is admin
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', videoId)
      .single();
    
    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Only the creator or admin can add tags
    if (req.user.role !== 'admin' && existingVideo.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this video'
      });
    }
    
    // Remove existing tags
    const { error: deleteError } = await supabase
      .from('video_tags')
      .delete()
      .eq('video_id', videoId);
    
    if (deleteError) {
      console.error('Tag deletion error:', deleteError);
      // Continue anyway
    }
    
    // Add new tags
    const tagInserts = tags.map(tagId => ({
      video_id: videoId,
      tag_id: tagId,
      created_at: new Date()
    }));
    
    const { data: newTags, error } = await supabase
      .from('video_tags')
      .insert(tagInserts)
      .select();
    
    if (error) {
      console.error('Tag association error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add tags',
        error: error.message
      });
    }
    
    return res.status(201).json({
      success: true,
      message: `${newTags.length} tags added to video`,
      tags: newTags
    });
    
  } catch (err) {
    console.error('Batch tag addition error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

module.exports = router;
        message: 'Failed to retrieve tags',
        error: error.message
      });
    }
    
    // Update cache
    tagsCache = tags;
    lastCacheUpdate = Date.now();
    
    return res.json({
      success: true,
      tags
    });
    
  } catch (err) {
    console.error('Tags fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get a single tag by slug with videos
 * Public endpoint
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Fetch the tag
    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    
    // Get video IDs with this tag
    const { data: videoTags, error: relationError } = await supabase
      .from('video_tags')
      .select('video_id')
      .eq('tag_id', tag.id);
    
    if (relationError) {
      console.error('Video tags query error:', relationError);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve video tags',
        error: relationError.message
      });
    }
    
    let videos = [];
    let total = 0;
    
    // If there are videos with this tag
    if (videoTags && videoTags.length > 0) {
      const videoIds = videoTags.map(vt => vt.video_id);
      total = videoIds.length;
      
      // Get the videos with pagination
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          youtube_id,
          thumbnail_url,
          rating,
          duration,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug),
          created_at,
          published_at
        `)
        .in('id', videoIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (!videosError) {
        videos = videosData;
      } else {
        console.error('Videos fetch error:', videosError);
      }
    }
    
    return res.json({
      success: true,
      tag,
      videos,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (err) {
    console.error('Tag videos fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Create a new tag
 * Admin only endpoint
 */
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      name,
      slug,
      color,
      description
    } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }
    
    // Check if slug is already taken
    const { data: existingTag, error: slugError } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .limit(1);
    
    if (!slugError && existingTag && existingTag.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slug already in use'
      });
    }
    
    // Create tag
    const { data: newTag, error } = await supabase
      .from('tags')
      .insert([
        {
          name,
          slug,
          color,
          description,
          created_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Tag creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create tag',
        error: error.message
      });
    }
    
    // Clear cache
    tagsCache = null;
    
    return res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      tag: newTag
    });
    
  } catch (err) {
    console.error('Tag creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Update a tag
 * Admin only endpoint
 */
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      color,
      description
    } = req.body;
    
    // Check if slug is already taken by another tag
    if (slug) {
      const { data: existingTag, error: slugError } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .limit(1);
      
      if (!slugError && existingTag && existingTag.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Slug already in use'
        });
      }
    }
    
    // Build update object
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;
    
    // Update tag
    const { data: updatedTag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Tag update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update tag',
        error: error.message
      });
    }
    
    // Clear cache
    tagsCache = null;
    
    return res.json({
      success: true,
      message: 'Tag updated successfully',
      tag: updatedTag
    });
    
  } catch (err) {
    console.error('Tag update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Delete a tag
 * Admin only endpoint
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete tag associations first
    const { error: relationError } = await supabase
      .from('video_tags')
      .delete()
      .eq('tag_id', id);
    
    if (relationError) {
      console.error('Tag relation deletion error:', relationError);
      // Continue anyway
    }
    
    // Delete tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Tag deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete tag',
        error: error.message
      });
    }
    
    // Clear cache
    tagsCache = null;
    
    return res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
    
  } catch (err) {
    console.error('Tag deletion error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get popular/trending tags
 * Public endpoint
 */
router.get('/popular/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // This query requires a more complex approach
    // First get counts of tag usage
    const { data: tagCounts, error: countError } = await supabase
      .rpc('get_tag_usage_counts');
    
    if (countError) {
      console.error('Tag count error:', countError);
      
      // Fallback to just getting all tags if RPC fails
      const { data: allTags, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true })
        .limit(limit);
      
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve tags',
          error: error.message
        });
      }
      
      return res.json({
        success: true,
        tags: allTags,
        fallback: true
      });
    }
    
    // Sort by count and limit
    const popularTags = tagCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return res.json({
      success: true,
      tags: popularTags
    });
    
  } catch (err) {
    console.error('Popular tags fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});