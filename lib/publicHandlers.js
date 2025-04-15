// lib/publicHandlers.js
// ApproVideo Public API Handlers
// Each exported function supports a specific query string action
// Used by `/api/public.js`
//
// Supported handlers:
//   - handleVideos
//   - handleSearch
//   - handleFeaturedVideos
//   - handleHomePageData
//   - handleTimelineData
//   - handleClinics
//   - handleModules
//   - handlePanels
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

let lastFetched = null;
let cachedSupabaseVideos = [];

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function sortVideos(items, sortKey) {
  switch (sortKey) {
    case 'views':
      return items.sort((a, b) => (b.views || 0) - (a.views || 0));
    case 'title':
      return items.sort((a, b) => a.title.localeCompare(b.title));
    case 'date':
    default:
      return items.sort((a, b) => new Date(b.date || b.datePublished) - new Date(a.date || a.datePublished));
  }
}

async function fetchFreshVideosFromSupabase(since) {
  let query = supabase
    .from('Video')
    .select(`
      id, title, description, youtubeId, transcript, rating, creator,
      host, datePublished, createdAt, updatedAt, tags, category,
      subcategory, status, statusNote,
      panels(id, title, content, created_at, updated_at)
    `)
    .is('status', null);

  if (since) query = query.gt('updatedAt', since);
  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] Video fetch error:', error);
    return [];
  }
  return data || [];
}

async function handleVideos(req, res) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const url = new URL(req.url, `${protocol}://${host}`);
    const searchParams = url.searchParams;

    const category = normalize(searchParams.get('category'));
    const subcategory = normalize(searchParams.get('subcategory'));
    const searchTerm = normalize(searchParams.get('search'));
    const sort = searchParams.get('sort') || 'date';
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '16', 10);

    const filePath = path.resolve(process.cwd(), 'data/featured_videos.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    let staticVideos = JSON.parse(fileData);

    const now = new Date();
    if (!lastFetched || now - lastFetched > 1000 * 60) {
      const freshVideos = await fetchFreshVideosFromSupabase(lastFetched?.toISOString());
      if (freshVideos.length > 0) {
        cachedSupabaseVideos = [
          ...cachedSupabaseVideos.filter(existing =>
            !freshVideos.some(newV => newV.id === existing.id)
          ),
          ...freshVideos
        ];
      }
      lastFetched = now;
    }

    let allVideos = [...staticVideos, ...cachedSupabaseVideos];

    if (category) allVideos = allVideos.filter(v => normalize(v.category) === category);
    if (subcategory) allVideos = allVideos.filter(v => normalize(v.subcategory) === subcategory);
    if (searchTerm) {
      allVideos = allVideos.filter(v =>
        (v.title && normalize(v.title).includes(searchTerm)) ||
        (v.description && normalize(v.description).includes(searchTerm)) ||
        (v.tags && v.tags.some(tag => normalize(tag).includes(searchTerm)))
      );
    }

    const sorted = sortVideos(allVideos, sort);
    const paginated = sorted.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      items: paginated,
      total: sorted.length,
      hasMore: offset + limit < sorted.length
    });
  } catch (error) {
    console.error('Error loading video data:', error);
    return res.status(500).json({ success: false, message: 'Failed to load video content' });
  }
}

// Placeholder functions (replace these with real handler logic when available)
const handleSearch = async (req, res) => res.status(200).json({ success: true, message: 'Search logic here' });
const handleFeaturedVideos = async (req, res) => res.status(200).json({ success: true, message: 'Featured videos logic here' });
const handleHomePageData = async (req, res) => res.status(200).json({ success: true, message: 'Home page data here' });
const handleTimelineData = async (req, res) => res.status(200).json({ success: true, message: 'Timeline data here' });
const handleClinics = async (req, res) => res.status(200).json({ success: true, message: 'Clinics data here' });
const handleModules = async (req, res) => res.status(200).json({ success: true, message: 'Modules data here' });
const handlePanels = async (req, res) => res.status(200).json({ success: true, message: 'Panels data here' });

module.exports = {
  handleVideos,
  handleSearch,
  handleFeaturedVideos,
  handleHomePageData,
  handleTimelineData,
  handleClinics,
  handleModules,
  handlePanels
};

