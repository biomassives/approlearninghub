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

// Fetch and display content based on current filters
async function loadContent() {
  try {
    // Show loading state
    const contentContainer = document.getElementById('content-container');
    const subcategoryContainer = document.getElementById('subcategory-container');
    const resultsInfo = document.getElementById('results-info');
    
    if (itemsLoaded === 0) {
      contentContainer.innerHTML = '<div class="loading">Loading content...</div>';
    }

    // Handle main page view vs category view vs subcategory view
    if (!currentCategory) {
      // Main homepage view - only show categories, hide subcategories and content
      if (subcategoryContainer) subcategoryContainer.style.display = 'none';
      if (contentContainer) contentContainer.style.display = 'none';
      if (resultsInfo) resultsInfo.style.display = 'none';
      return;
    } else {
      // Category selected - show subcategories
      if (subcategoryContainer) subcategoryContainer.style.display = 'block';
      
      // If no subcategory is selected yet, don't load content
      if (!currentSubcategory && !currentSearchTerm) {
        if (contentContainer) contentContainer.style.display = 'none';
        if (resultsInfo) resultsInfo.style.display = 'none';
        return;
      } else {
        // Subcategory or search term exists - show content area
        if (contentContainer) contentContainer.style.display = 'block';
        if (resultsInfo) resultsInfo.style.display = 'block';
      }
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (currentCategory) params.append('category', currentCategory);
    if (currentSubcategory) params.append('subcategory', currentSubcategory);
    if (currentSearchTerm) params.append('search', currentSearchTerm);
    params.append('sort', currentSort);
    params.append('offset', itemsLoaded);
    params.append('limit', pageSize);

    // Fetch content from API
    const url = `${API_BASE_URL}/content?${params.toString()}`;
    console.log(`Fetching content with URL: ${url}`);
    
    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      console.warn('API fetch failed, falling back to static data:', err);
      // Fallback to static data file if API fails
      response = await fetch('/data/content.json');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load content: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    let items = [];
    
    // Handle both API response format and static JSON format
    if (Array.isArray(data)) {
      // Static JSON format
      items = data;
      
      // Apply filters manually for static data
      if (currentCategory) {
        items = items.filter(item => 
          item.category && item.category.toLowerCase() === currentCategory.toLowerCase()
        );
      }
      
      if (currentSubcategory) {
        items = items.filter(item => 
          item.subcategory && item.subcategory.toLowerCase() === currentSubcategory.toLowerCase()
        );
      }
      
      if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        items = items.filter(item => 
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
      }
      
      // Manual sorting for static data
      switch (currentSort) {
        case 'date':
          items.sort((a, b) => new Date(b.date) - new Date(a.date));
          break;
        case 'views':
          items.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'title':
          items.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'duration':
          items.sort((a, b) => (b.duration || 0) - (a.duration || 0));
          break;
      }
      
      // Manual pagination
      const total = items.length;
      items = items.slice(itemsLoaded, itemsLoaded + pageSize);
      
      // First load - replace content
      if (itemsLoaded === 0) {
        displayList = items;
        contentContainer.innerHTML = '';
      } else {
        // Append content
        displayList = [...displayList, ...items];
      }
      
      // Update loaded items count
      itemsLoaded = displayList.length;
      
      // Show/hide load more button based on if there are more items
      const loadMoreBtn = document.getElementById('load-more');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = itemsLoaded < total ? 'block' : 'none';
      }
      
      // Update results count
      const resultsCount = document.getElementById('results-count');
      if (resultsCount) {
        resultsCount.textContent = `${total} results`;
      }
    } else {
      // API response format
      items = data.items || [];
      
      // First load - replace content
      if (itemsLoaded === 0) {
        displayList = items;
        contentContainer.innerHTML = '';
      } else {
        // Append content
        displayList = [...displayList, ...items];
      }
      
      // Update loaded items count
      itemsLoaded = displayList.length;
      
      // Show/hide load more button based on if there are more items
      const loadMoreBtn = document.getElementById('load-more');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
      }
      
      // Update results count
      const resultsCount = document.getElementById('results-count');
      if (resultsCount) {
        resultsCount.textContent = `${data.total} results`;
      }
    }
    
    // Render content items
    renderContentItems(displayList, contentContainer);
    
  } catch (err) {
    console.error('Error loading content:', err);
    const contentContainer = document.getElementById('content-container');
    contentContainer.innerHTML = '<div class="error">Failed to load content. Please try again later.</div>';
  }
}

// Render content items to the container
function renderContentItems(items, container) {
  if (items.length === 0 && itemsLoaded === 0) {
    container.innerHTML = '<div class="no-results">No content found. Try adjusting your filters.</div>';
    return;
  }
  
  // For initial load, clear the container first
  if (itemsLoaded === 0) {
    container.innerHTML = '';
  }
  
  // Create and append content item elements
  items.forEach((item, index) => {
    // Only render new items (avoid duplicates)
    if (index >= itemsLoaded - items.length) {
      const itemElement = createContentItemElement(item);
      container.appendChild(itemElement);
    }
  });
}

// Create a DOM element for a content item
function createContentItemElement(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'content-item';
  itemElement.dataset.id = item.id;
  
  // Create thumbnail with play button overlay
  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  thumbnail.innerHTML = `
    <img src="${item.thumbnail || '/images/placeholder.jpg'}" alt="${item.title}">
    <div class="play-overlay">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
    <div class="duration">${formatDuration(item.duration)}</div>
  `;
  
  // Create content details
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
  
  // Append elements to item
  itemElement.appendChild(thumbnail);
  itemElement.appendChild(details);
  
  // Add click handler to navigate to content
  itemElement.addEventListener('click', () => {
    window.location.href = `/view/${item.id}`;
  });
  
  return itemElement;
}

// Fetch category data dynamically
async function loadCategories() {
  try {
    // Fetch categories from the local JSON file
    const res = await fetch('/data/categories.json');
    if (!res.ok) throw new Error('Failed to load categories');
    
    const data = await res.json();
    
    // Transform category structure for compatibility with your UI modules
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
    
    // Check for preferred category
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
    
    loadContent();
  } catch (err) {
    console.error('Error loading categories:', err);
    const categoryContainer = document.getElementById('category-container');
    if (categoryContainer) {
      categoryContainer.innerHTML = '<div class="error">Failed to load categories. Please try again later.</div>';
    }
  }
}

// Event handlers for UI interactions
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentSearchTerm = e.target.value.trim();
      itemsLoaded = 0; // Reset for new search
      loadContent();
    }, 500));
  }
  
  // Sort selector
  const sortSelector = document.getElementById('sort-selector');
  if (sortSelector) {
    sortSelector.addEventListener('change', (e) => {
      currentSort = e.target.value;
      itemsLoaded = 0; // Reset for new sort
      loadContent();
    });
  }
  
  // Load more button
  const loadMoreBtn = document.getElementById('load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadContent(); // Will load next page based on current itemsLoaded
    });
  }
  
  // Category selection (delegate to parent)
  const categoryContainer = document.getElementById('category-container');
  if (categoryContainer) {
    categoryContainer.addEventListener('click', (e) => {
      const catElement = e.target.closest('[data-category-id]');
      if (catElement) {
        const categoryId = catElement.dataset.categoryId;
        currentCategory = categoryId;
        currentSubcategory = null;
        itemsLoaded = 0; // Reset for new category
        
        // Update UI
        setActiveCategory(categoryId);
        renderSubcategories(document.getElementById('subcategory-links'), categoryId);
        updateBreadcrumb(document.getElementById('breadcrumb'), categoryId);
        
        // Add to preferred categories
        addPreferredCategory(categoryId);
        
        // Load filtered content - this will just show subcategories since no subcategory is selected
        loadContent();
      }
    });
  }
  
  // Subcategory selection (delegate to parent)
  const subcategoryLinks = document.getElementById('subcategory-links');
  if (subcategoryLinks) {
    subcategoryLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        e.preventDefault();
        const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
        const subcategoryId = link.dataset.subcategoryId;
        const categoryId = link.dataset.categoryId;
        
        currentSubcategory = subcategoryId;
        itemsLoaded = 0; // Reset for new subcategory
        
        // Update UI
        const activeLinks = subcategoryLinks.querySelectorAll('.active');
        activeLinks.forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        
        updateBreadcrumb(
          document.getElementById('breadcrumb'), 
          categoryId, 
          subcategoryId
        );
        
        // Load filtered content - now will show the subcategory content
        loadContent();
      }
    });
  }
  
  // "Show all" link (if it exists in your UI)
  const showAllLink = document.getElementById('show-all-link');
  if (showAllLink) {
    showAllLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentSubcategory = null;
      currentSearchTerm = '';
      itemsLoaded = 0;
      
      // Update UI - remove active state from all subcategory links
      const subcategoryLinks = document.getElementById('subcategory-links');
      if (subcategoryLinks) {
        const activeLinks = subcategoryLinks.querySelectorAll('.active');
        activeLinks.forEach(el => el.classList.remove('active'));
      }
      
      // Update search input 
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      
      updateBreadcrumb(document.getElementById('breadcrumb'), currentCategory);
      
      // Load all content for the current category
      loadContent();
    });
  }
}

// Initialize the application
function init() {
  loadCategories();
  setupEventListeners();
}

// Start the application
init();