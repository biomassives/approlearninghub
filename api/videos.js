// api/videos.js
import express from 'express';
const app = express();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises; // Using promises version of fs
const path = require('path');

// --- Supabase Client Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  // Consider throwing an error or handling this more gracefully depending on requirements
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Helper to Load and Parse Featured Videos ---
let featuredVideosCache = null; // Simple in-memory cache

async function getFeaturedVideos() {
  if (featuredVideosCache) {
    return featuredVideosCache;
  }
  try {
    // Construct path relative to the api directory (assuming data/ is at the project root)
    const filePath = path.resolve(__dirname, '..', 'data', 'featured_videos.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    let videos = JSON.parse(fileContent);

    // Parse the stringified tags array for each video
    videos = videos.map(video => {
      try {
        // Only parse if tags exist and is a string representation of an array
        if (video.tags && typeof video.tags === 'string' && video.tags.startsWith('[') && video.tags.endsWith(']')) {
          video.tags = JSON.parse(video.tags);
        } else if (!Array.isArray(video.tags)) {
          // Handle cases where tags might be null, undefined, or not array-like after potential parse
          video.tags = [];
        }
      } catch (parseError) {
        console.warn(`Failed to parse tags for featured video ${video.id}: ${video.tags}`, parseError);
        video.tags = []; // Default to empty array on parse error
      }
      // Ensure panels is an array if it exists
       if (video.panels === null || video.panels === undefined) {
           video.panels = [];
       } else if (!Array.isArray(video.panels)) {
           console.warn(`Featured video ${video.id} has non-array panels, setting to empty.`);
           video.panels = [];
       }
      return video;
    });

    featuredVideosCache = videos;
    return featuredVideosCache;
  } catch (error) {
    console.error('Error reading or parsing featured_videos.json:', error);
    return []; // Return empty array if file reading/parsing fails
  }
}

// --- Request Handler ---
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // --- Get Query Parameters ---
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sort || 'newest';

    // Calculate pagination range
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    // --- Fetch Featured Videos (from cache or file) ---
    const featuredVideos = await getFeaturedVideos();

    // --- Determine if Featured Videos should be prepended ---
    // Prepend only on the first page AND when no specific filters are active
    const shouldPrependFeatured = (page === 1 && !category && !search);

    // --- Build and Execute Supabase Query ---
    let supabaseData = [];
    let count = 0;
    let supabaseError = null;

    // Adjust limit if prepending featured videos to avoid fetching unnecessary data?
    // For simplicity now, we fetch the standard limit and potentially return more on page 1.
    // let queryLimit = shouldPrependFeatured ? Math.max(0, limit - featuredVideos.length) : limit;
    let queryLimit = limit; // Fetching full limit for now

    let query = supabase
      .from('videos')
      .select('*', { count: 'exact' });

    // Apply Filters (same as before)
    if (category) query = query.eq('category', category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    // query = query.eq('status', 'approved'); // Example status filter

    // Apply Sorting (same as before)
    switch (sortBy) {
      case 'popular': query = query.order('views', { ascending: false }); break;
      case 'az': query = query.order('title', { ascending: true }); break;
      case 'newest': default: query = query.order('createdAt', { ascending: false }); break;
    }

    // Apply Pagination - Fetch 'limit' items starting from the calculated index
    // Note: If prepending featured, this might fetch items that get replaced/pushed to next page.
     query = query.range(startIndex, endIndex);


    // Execute
    const { data, error, count: totalSupabaseCount } = await query;
    if (error) {
        console.error('Supabase Query Error:', error);
        supabaseError = error; // Store error but continue to potentially show featured
    } else {
        supabaseData = data || [];
        count = totalSupabaseCount || 0; // Total count matching Supabase query criteria
    }


    // --- Combine Data ---
    let responseData = [];
    if (shouldPrependFeatured) {
      // Get IDs of featured videos to check for duplicates from Supabase
      const featuredIds = new Set(featuredVideos.map(v => v.id));
      // Filter out Supabase results that are already featured
      const uniqueSupabaseData = supabaseData.filter(v => !featuredIds.has(v.id));
      // Combine: Featured first, then unique Supabase results
      responseData = [...featuredVideos, ...uniqueSupabaseData];
      // Note: The number of items might exceed 'limit' on page 1.
      // We'll base 'hasMore' on the Supabase count for subsequent pages.
    } else {
      // If not prepending, just use the Supabase results directly
      responseData = supabaseData;
    }

    // Handle Supabase error AFTER trying to prepare response (maybe featured vids are enough)
    if (supabaseError && responseData.length === 0) {
         // If Supabase failed AND we have no featured data to show, throw error
         throw supabaseError;
    }


    // --- Prepare Final Response ---
    // Calculate hasMore based on the total count from Supabase vs requested range end
    const hasMore = endIndex + 1 < count;
    // Adjust total count if prepending featured videos causes count mismatch?
    // For now, report Supabase total count matching the filter criteria.
    const reportedTotal = count;


    res.status(200).json({
      data: responseData,
      pagination: {
        currentPage: page,
        limit: limit, // The requested limit
        totalItems: reportedTotal, // Total items matching Supabase query
        totalPages: Math.ceil(reportedTotal / limit),
        hasMore: hasMore,
      }
    });

  } catch (error) {
    console.error('API Function Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch video data.' });
  }
};
