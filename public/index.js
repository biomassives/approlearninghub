// index.js – ApproVideo Homepage Entry Script
// Handles dynamic category → subcategory → video display, initial JSON load, and merging API results

import {
  initCategoryUI,
  renderCategories,
  renderSubcategories,
  updateBreadcrumb,
  addPreferredCategory,
  getPreferredCategories,
  setActiveCategory
} from './js/modules/categorySearchUI.js';
import { debounce, formatDuration, formatDate, formatViews } from './js/modules/utils.js';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/api';

let categoriesData = [];
let currentCategory = null;
let currentSubcategory = null;
let currentSearchTerm = '';
let currentSort = 'date';
let displayList = [];
let itemsLoaded = 0;
const pageSize = 16;

// Basic schema validation for video items
function isValidVideoItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.youtubeId === 'string'
  );
}

function sortDisplayList() {
  switch (currentSort) {
    case 'views':
      displayList.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'title':
      displayList.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'duration':
      displayList.sort((a, b) => (b.duration || 0) - (a.duration || 0));
      break;
    default:
      displayList.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// New function: Load videos from local JSON and merge with API
async function loadMergedContent() {
  try {
    const localRes = await fetch('/data/videos_org_site.json');
    const localVideos = await localRes.json();

    let mergedVideos = [...localVideos];

    try {
      const apiRes = await fetch(`${API_BASE_URL}/videos`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const seen = new Set(localVideos.map(v => v.id));
        const newItems = apiData.items?.filter(v => !seen.has(v.id)) || [];
        mergedVideos = [...localVideos, ...newItems];
      } else {
        console.warn('API videos fetch failed:', apiRes.statusText);
      }
    } catch (apiErr) {
      console.warn('Error contacting /api/videos:', apiErr);
    }

    // Filter with schema validation
    displayList = mergedVideos.filter(isValidVideoItem);
    itemsLoaded = displayList.length;

    const contentContainer = document.getElementById('content-container');
    contentContainer.innerHTML = '';
    renderContentItems(displayList, contentContainer);

    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    const resultsCount = document.getElementById('results-count');
    if (resultsCount) resultsCount.textContent = `${displayList.length} results`;

  } catch (err) {
    console.error('Error loading initial video data:', err);
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
      contentContainer.innerHTML = '<div class="error">Failed to load initial video data.</div>';
    }
  }
}

function renderContentItems(items, container) {
  if (items.length === 0 && itemsLoaded === 0) {
    container.innerHTML = '<div class="no-results">No content found. Try adjusting your filters.</div>';
    return;
  }
  if (itemsLoaded === 0) {
    container.innerHTML = '';
  }
  items.forEach((item, index) => {
    if (!isValidVideoItem(item)) return;
    if (index >= itemsLoaded - items.length) {
      const itemElement = createContentItemElement(item);
      container.appendChild(itemElement);
    }
  });
}

function createContentItemElement(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'content-item';
  itemElement.dataset.id = item.id;

  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  thumbnail.innerHTML = `
    <img src="${item.thumbnail || '/assets/placeholder.gif'}" alt="${item.title}">
    <div class="play-overlay">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
    <div class="duration">${formatDuration(item.duration)}</div>
  `;

  const details = document.createElement('div');
  details.className = 'item-details';
  details.innerHTML = `
    <h3 class="item-title">${item.title}</h3>
    <div class="item-meta">
      <span class="item-date">${formatDate(item.date)}</span>
      <span class="item-views">${formatViews(item.views)} views</span>
    </div>
    <p class="item-description">${item.description || ''}</p>
  `;

  itemElement.appendChild(thumbnail);
  itemElement.appendChild(details);

  itemElement.addEventListener('click', () => openDetailPanel(item));

  return itemElement;
}

function openDetailPanel(item) {
  const panel = document.getElementById('video-detail-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="panel-overlay">
      <div class="panel-content">
        <button class="close-panel">×</button>
        <h2>${item.title}</h2>
        <iframe src="https://www.youtube.com/embed/${item.youtubeId}" frameborder="0" allowfullscreen></iframe>
        <p>${item.description}</p>
        <ul>
          ${item.additionalInfo?.map(i => `<li>${i}</li>`).join('') || ''}
        </ul>
      </div>
    </div>
  `;
  panel.style.display = 'block';
  panel.querySelector('.close-panel').addEventListener('click', () => {
    panel.style.display = 'none';
    panel.innerHTML = '';
  });
}

async function loadCategories() {
  try {
    const res = await fetch('/data/categories.json');
    if (!res.ok) throw new Error('Failed to load categories');
    const data = await res.json();

    categoriesData = data.map(area => ({
      id: area.area,
      name: area.area,
      subcategories: area.subcategories.map((sub, i) => ({
        id: `${area.area.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        name: sub.title,
        description: sub.description,
        tags: sub.tags
      }))
    }));

    initCategoryUI(categoriesData);
    renderCategories(document.getElementById('category-container'));
    updateBreadcrumb(document.getElementById('breadcrumb'));

    const preferredCats = getPreferredCategories();
    if (preferredCats.length > 0) {
      const defaultCat = preferredCats[0];
      currentCategory = defaultCat;
      setActiveCategory(defaultCat);
      renderSubcategories(document.getElementById('subcategory-links'), defaultCat);
      updateBreadcrumb(document.getElementById('breadcrumb'), defaultCat);
    } else {
      updateBreadcrumb(document.getElementById('breadcrumb'));
    }

    loadMergedContent();
  } catch (err) {
    console.error('Error loading categories:', err);
    const categoryContainer = document.getElementById('category-container');
    if (categoryContainer) {
      categoryContainer.innerHTML = '<div class="error">Failed to load categories. Please try again later.</div>';
    }
  }
}

function setupEventListeners() {

  document.getElementById('sort-selector').addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortDisplayList();
    renderContentItems(displayList, document.getElementById('content-container'));
  });
  
  document.addEventListener('languageChanged', e => {
    const lang = e.detail.language;
    fetch(`/data/translations/${lang}.json`).then(res => res.json()).then(data => {
      document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        if (data.category?.[key]) el.textContent = data.category[key];
        if (data.subcategory?.[key]) el.textContent = data.subcategory[key];
      });
    });
  });
}

function init() {
  loadCategories();
  setupEventListeners();
}

init();

/*
🟢 Launch Tips:
1. Log load times for both JSON + API fetches to monitor performance.
2. Add visual feedback if fallback occurs.
3. Ensure /api/videos supports sorting/pagination if desired later.
4. Periodically sync /data/videos_org_site.json with fresh curated data.
5. Cache merged result in session/local storage for quick back-navigation.
*/