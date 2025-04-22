// js/library-curation.js
import authService from './auth-service.js';

const apiBase = '/api/library';

/**
 * Fetch and render categories, tags, and videos for curation
 * Only visible to roles: admin, expert, organizer
 */
export async function initLibraryCuration(containerId) {
  const session = await authService.getSession();
  if (!session.success) return;
  const role = session.user.role;
  const allowed = ['admin','expert','organizer'];
  if (!allowed.includes(role)) return; // no UI for other roles

  const container = document.getElementById(containerId);
  container.innerHTML = `
    <h2>Library Curation</h2>
    <div id="categories-curation">
      <h3>Categories</h3>
      <ul id="category-list">Loading...</ul>
      <button id="add-category-btn">Add Category</button>
    </div>
    <div id="videos-curation">
      <h3>Videos</h3>
      <ul id="video-list">Loading...</ul>
      <button id="add-video-btn">Add Video</button>
    </div>
  `;

  // Load categories
  try {
    const resCat = await fetch(`${apiBase}/categories`, { credentials: 'include' });
    const { categories = resCat.data } = await resCat.json();
    const listEl = document.getElementById('category-list');
    listEl.innerHTML = categories.map(c => `<li>${c.name}</li>`).join('');
  } catch (e) {
    console.error('Failed loading categories', e);
  }

  // Load videos
  try {
    const resVid = await fetch(`${apiBase}/videos`, { credentials: 'include' });
    const { videos = resVid.data } = await resVid.json();
    const vidEl = document.getElementById('video-list');
    vidEl.innerHTML = videos.map(v => `<li>${v.title}</li>`).join('');
  } catch (e) {
    console.error('Failed loading videos', e);
  }

  // TODO: wire up add/update/delete handlers with proper modals or prompts
}
