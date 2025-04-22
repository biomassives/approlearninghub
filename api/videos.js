// /api/videos.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticate, authorize } = require('./middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Local data cache with seed data approach
let cachedVideos = null;
let lastCacheUpdate = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all videos with optional filtering
 * Public endpoint
 */
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      subcategory, 
      tag, 
      featured,
      status = 'published',
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = req.query;

    // Check cache first if no specific filters
    if (!category && !subcategory && !tag && !featured && 
        cachedVideos && 
        (Date.now() - lastCacheUpdate) < CACHE_TTL) {
      const paginatedCache = cachedVideos.slice(offset, offset + limit);
      return res.json({
        success: true,
        videos: paginatedCache,
        total: cachedVideos.length,
        fromCache: true
      });
    }

    // Build query
    let query = supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug),
        video_tags (
          tag:tag_id (id, name, slug)
        ),
        video_resources (*)
      `)
      .eq('status', status);
    
    // Apply filters
    if (category) {
      // First try direct category_id match
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      if (categoryData) {
        query = query.eq('category_id', categoryData.id);
      }
    }
    
    if (subcategory) {
      const { data: subcategoryData } = await supabase
        .from('subcategories')
        .select('id')
        .eq('slug', subcategory)
        .single();
      
      if (subcategoryData) {
        query = query.eq('subcategory_id', subcategoryData.id);
      }
    }
    
    if (tag) {
      // This requires a more complex join query
      // Get the tag id first
      const { data: tagData } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', tag)
        .single();
      
      if (tagData) {
        // Get videos with this tag
        const { data: videoIds } = await supabase
          .from('video_tags')
          .select('video_id')
          .eq('tag_id', tagData.id);
        
        if (videoIds && videoIds.length > 0) {
          const ids = videoIds.map(v => v.video_id);
          query = query.in('id', ids);
        } else {
          // No videos with this tag
          return res.json({
            success: true,
            videos: [],
            total: 0
          });
        }
      }
    }
    
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    
    // Add sorting
    switch(sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'title':
        query = query.order('title', { ascending: true });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }
    
    // Add pagination
    const countQuery = query;
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data: videos, error } = await query;
    
    if (error) {
      console.error('Videos query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
        error: error.message
      });
    }
    
    // Get total count for pagination
    const { count, error: countError } = await countQuery.count();
    
    if (countError) {
      console.error('Count query error:', countError);
    }
    
    // Format the response
    const formattedVideos = videos.map(video => {
      // Format tags
      const tags = video.video_tags ? 
        video.video_tags.map(vt => vt.tag) : [];
      
      // Return formatted video
      return {
        id: video.id,
        title: video.title,
        description: video.description,
        youtubeId: video.youtube_id,
        url: video.url,
        thumbnailUrl: video.thumbnail_url,
        rating: video.rating,
        creator: video.creator,
        host: video.host,
        featured: video.featured,
        duration: video.duration,
        category: video.category,
        subcategory: video.subcategory,
        tags: tags,
        resources: video.video_resources,
        panels: video.panels,
        createdAt: video.created_at,
        publishedAt: video.published_at
      };
    });
    
    // Update cache if this was a full request
    if (!category && !subcategory && !tag && !featured) {
      cachedVideos = formattedVideos;
      lastCacheUpdate = Date.now();
    }
    
    return res.json({
      success: true,
      videos: formattedVideos,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (err) {
    console.error('Videos fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get featured videos 
 * Public endpoint
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const { data: featuredVideos, error } = await supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug)
      `)
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Featured videos query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve featured videos',
        error: error.message
      });
    }
    
    return res.json({
      success: true,
      videos: featuredVideos
    });
    
  } catch (err) {
    console.error('Featured videos fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get a single video by ID
 * Public endpoint
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: video, error } = await supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug),
        video_tags (
          tag:tag_id (id, name, slug)
        ),
        video_resources (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Video fetch error:', error);
      return res.status(404).json({
        success: false,
        message: 'Video not found',
        error: error.message
      });
    }
    
    // Format tags
    const tags = video.video_tags ? 
      video.video_tags.map(vt => vt.tag) : [];
    
    // Format the response
    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      youtubeId: video.youtube_id,
      url: video.url,
      thumbnailUrl: video.thumbnail_url,
      transcript: video.transcript,
      rating: video.rating,
      creator: video.creator,
      host: video.host,
      featured: video.featured,
      duration: video.duration,
      materials: video.materials,
      steps: video.steps,
      panels: video.panels,
      category: video.category,
      subcategory: video.subcategory,
      tags: tags,
      resources: video.video_resources,
      createdAt: video.created_at,
      publishedAt: video.published_at
    };
    
    return res.json({
      success: true,
      video: formattedVideo
    });
    
  } catch (err) {
    console.error('Video fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Update existing video
 * Protected endpoint - requires authentication and appropriate role
 */
router.put('/:id', authenticate, authorize(['admin', 'expert']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      youtube_id,
      url,
      thumbnail_url,
      category_id,
      subcategory_id,
      tags,
      featured,
      panels,
      materials,
      steps,
      transcript,
      status
    } = req.body;
    
    // Check if video exists and belongs to user or user is admin
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Only the creator or admin can update
    if (req.user.role !== 'admin' && existingVideo.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this video'
      });
    }
    
    // Update the video
    const updates = {
      updated_at: new Date()
    };
    
    // Only add defined fields to update
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (youtube_id !== undefined) updates.youtube_id = youtube_id;
    if (url !== undefined) updates.url = url;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (category_id !== undefined) updates.category_id = category_id;
    if (subcategory_id !== undefined) updates.subcategory_id = subcategory_id;
    if (featured !== undefined) updates.featured = featured;
    if (panels !== undefined) updates.panels = panels;
    if (materials !== undefined) updates.materials = materials;
    if (steps !== undefined) updates.steps = steps;
    if (transcript !== undefined) updates.transcript = transcript;
    
    // Only admin can change status
    if (status !== undefined && req.user.role === 'admin') {
      updates.status = status;
      
      // If changing to published, set published_at
      if (status === 'published') {
        updates.published_at = new Date();
      }
    }
    
    const { data: updatedVideo, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Video update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update video',
        error: error.message
      });
    }
    
    // If tags were provided, update them
    if (tags !== undefined) {
      // First remove existing tags
      const { error: deleteError } = await supabase
        .from('video_tags')
        .delete()
        .eq('video_id', id);
      
      if (deleteError) {
        console.error('Tag deletion error:', deleteError);
        // Continue anyway
      }
      
      // Then add new tags if provided
      if (tags && tags.length > 0) {
        const tagInserts = tags.map(tagId => ({
          video_id: id,
          tag_id: tagId
        }));
        
        const { error: tagError } = await supabase
          .from('video_tags')
          .insert(tagInserts);
        
        if (tagError) {
          console.error('Tag association error:', tagError);
          // Don't fail the whole request, just log the error
        }
      }
    }
    
    return res.json({
      success: true,
      message: 'Video updated successfully',
      video: updatedVideo
    });
    
  } catch (err) {
    console.error('Video update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Delete a video
 * Protected endpoint - requires admin role
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete related records
    await supabase.from('video_tags').delete().eq('video_id', id);
    await supabase.from('video_resources').delete().eq('video_id', id);
    
    // Then delete the video
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Video deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete video',
        error: error.message
      });
    }
    
    return res.json({
      success: true,
      message: 'Video deleted successfully'
    });
    
  } catch (err) {
    console.error('Video deletion error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Add a resource to a video
 * Protected endpoint - requires authentication and appropriate role
 */
router.post('/:id/resources', authenticate, authorize(['admin', 'expert']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      resource_type, 
      title, 
      url, 
      description 
    } = req.body;
    
    if (!resource_type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Resource type and title are required'
      });
    }
    
    // Check if video exists and belongs to user or user is admin
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }
    
    // Only the creator or admin can add resources
    if (req.user.role !== 'admin' && existingVideo.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this video'
      });
    }
    
    // Add the resource
    const { data: newResource, error } = await supabase
      .from('video_resources')
      .insert([
        {
          video_id: id,
          resource_type,
          title,
          url,
          description,
          created_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Resource creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add resource',
        error: error.message
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Resource added successfully',
      resource: newResource
    });
    
  } catch (err) {
    console.error('Resource creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Remove a resource from a video
 * Protected endpoint - requires authentication and appropriate role
 */
router.delete('/:videoId/resources/:resourceId', authenticate, authorize(['admin', 'expert']), async (req, res) => {
  try {
    const { videoId, resourceId } = req.params;
    
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
    
    // Only the creator or admin can remove resources
    if (req.user.role !== 'admin' && existingVideo.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this video'
      });
    }
    
    // Remove the resource
    const { error } = await supabase
      .from('video_resources')
      .delete()
      .eq('id', resourceId)
      .eq('video_id', videoId);
    
    if (error) {
      console.error('Resource deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove resource',
        error: error.message
      });
    }
    
    return res.json({
      success: true,
      message: 'Resource removed successfully'
    });
    
  } catch (err) {
    console.error('Resource deletion error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

module.exports = router;

/**
 * Get videos by category slug
 * Public endpoint
 */
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Get category ID from slug
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (categoryError || !category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get videos in this category
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug)
      `)
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Category videos query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
        error: error.message
      });
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('videos')
      .select('id', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published');
    
    if (countError) {
      console.error('Count query error:', countError);
    }
    
    return res.json({
      success: true,
      videos,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (err) {
    console.error('Category videos fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Search videos
 * Public endpoint
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 20, offset = 0 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    // Search videos
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug)
      `)
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Search query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to search videos',
        error: error.message
      });
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('videos')
      .select('id', { count: 'exact' })
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    
    if (countError) {
      console.error('Count query error:', countError);
    }
    
    return res.json({
      success: true,
      videos,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      query
    });
    
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get videos by tag
 * Public endpoint
 */
router.get('/tag/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Get tag ID from slug
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (tagError || !tag) {
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
    
    if (!videoTags || videoTags.length === 0) {
      return res.json({
        success: true,
        videos: [],
        total: 0
      });
    }
    
    // Get the videos
    const videoIds = videoTags.map(vt => vt.video_id);
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        *,
        category:category_id (id, name, slug),
        subcategory:subcategory_id (id, name, slug)
      `)
      .in('id', videoIds)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Tag videos query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
        error: error.message
      });
    }
    
    return res.json({
      success: true,
      videos,
      total: videoIds.length,
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
 * Create a new video
 * Protected endpoint - requires authentication and editor/admin role
 */
router.post('/', authenticate, authorize(['admin', 'expert']), async (req, res) => {
  try {
    const {
      title,
      description,
      youtube_id,
      url,
      thumbnail_url,
      category_id,
      subcategory_id,
      tags,
      featured = false,
      panels,
      materials,
      steps,
      transcript
    } = req.body;
    
    if (!title || !youtube_id) {
      return res.status(400).json({
        success: false,
        message: 'Title and YouTube ID are required'
      });
    }
    
    // Insert the video
    const { data: newVideo, error } = await supabase
      .from('videos')
      .insert([
        {
          title,
          description,
          youtube_id,
          url,
          thumbnail_url,
          category_id,
          subcategory_id,
          featured,
          panels,
          materials,
          steps,
          transcript,
          status: 'pending', // Default to pending, admin will approve
          user_id: req.user.id, // Set the creator
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Video creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create video',
        error: error.message
      });
    }
    
    // If tags were provided, add them
    if (tags && tags.length > 0) {
      const tagInserts = tags.map(tagId => ({
        video_id: newVideo.id,
        tag_id: tagId
      }));
      
      const { error: tagError } = await supabase
        .from('video_tags')
        .insert(tagInserts);
      
      if (tagError) {
        console.error('Tag association error:', tagError);
        // Don't fail the whole request, just log the error
      }
    }
  
    return res.status(201).json({
      success: true,
      message: 'Video created successfully',
      video: newVideo
    });
    
  } catch (err) { // <--- This 'catch' needs the corresponding 'try' block to be closed first
    console.error('Video creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
// --- You were missing a brace here to close the 'catch' block ---

} // <--- Add this closing brace for the 'catch' block

}); // <--- This brace closes the router.post(...) function definition. You already have this one.

