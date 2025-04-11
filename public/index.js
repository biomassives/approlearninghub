// Main JavaScript file for ApproVideo
import { 
  loadSecureSession, 
  saveSecureSession, 
  clearSecureSession, 
  setBypassCrypto, 
  isCryptoBypassed, 
  printSession 
} from './session-crypto.js';

// DOM references
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const videoGrid = document.getElementById('videoGrid');
const skeletonLoader = document.getElementById('skeletonLoader');
const infiniteScrollTrigger = document.getElementById('infiniteScrollTrigger');

// Global state
let currentCategory = '';
let currentPage = 1;
let isLoading = false;
let hasMoreContent = true;

// Configuration
const API_BASE_URL = '/api'; // Set to relative path
const ITEMS_PER_PAGE = 12;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners first
  setupEventListeners();
  
  // Handle crypto bypass via URL parameter for testing
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('bypass_crypto')) {
    setBypassCrypto(urlParams.get('bypass_crypto') === 'true');
    console.log(`Crypto bypass ${isCryptoBypassed() ? 'ENABLED' : 'DISABLED'} for testing`);
  }
  
  // Initialize session
  initializeSession();
  
  // Load initial content
  loadFeaturedContent();
});

// Initialize session with error handling
async function initializeSession() {
  try {
    const session = await loadSecureSession();
    updateUIForUser(session);
    
    // Debug info in console (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      printSession(false);
    }
  } catch (error) {
    console.error('Error initializing session, proceeding as guest:', error);
    // Fallback to treating user as guest
    updateUIForUser({ role: 'guest', email: 'unknown@example.com' });
    
    // Auto-enable bypass if there's an initialization error
    setBypassCrypto(true);
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 500));
  }
  
  // Sorting functionality
  if (sortSelect) {
    sortSelect.addEventListener('change', handleSort);
  }
  
  // Category navigation
  document.querySelectorAll('.main-category-icon').forEach(icon => {
    icon.addEventListener('click', handleCategoryClick);
  });
  
  // Infinite scroll
  if (infiniteScrollTrigger) {
    const observer = new IntersectionObserver(handleInfiniteScroll, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });
    
    observer.observe(infiniteScrollTrigger);
  }
}

// Handle search input
function handleSearch() {
  const searchTerm = searchInput.value.trim();
  if (searchTerm.length >= 2) {
    currentPage = 1;
    hasMoreContent = true;
    loadSearchResults(searchTerm);
  } else if (searchTerm.length === 0) {
    loadFeaturedContent();
  }
}

// Handle sort selection
function handleSort() {
  if (!sortSelect) return;
  
  const sortBy = sortSelect.value;
  
  // Reload current view with new sort
  currentPage = 1;
  hasMoreContent = true;
  
  if (currentCategory) {
    loadCategoryContent(currentCategory);
  } else if (searchInput && searchInput.value.trim().length >= 2) {
    loadSearchResults(searchInput.value.trim());
  } else {
    loadFeaturedContent();
  }
}

// Handle category click
function handleCategoryClick(e) {
  e.preventDefault();
  const category = e.currentTarget.dataset.category;
  
  if (!category) return;
  
  // Update UI to show selected category
  document.querySelectorAll('.main-category-icon').forEach(icon => {
    icon.classList.remove('active');
  });
  e.currentTarget.classList.add('active');
  
  // Load content for this category
  currentCategory = category;
  currentPage = 1;
  hasMoreContent = true;
  loadCategoryContent(category);
  
  // Show any intro text if available
  updateIntroText(e.currentTarget);
}

// Handle infinite scroll
function handleInfiniteScroll(entries) {
  if (entries[0].isIntersecting && !isLoading && hasMoreContent) {
    currentPage++;
    if (currentCategory) {
      loadCategoryContent(currentCategory, currentPage);
    } else if (searchInput && searchInput.value.trim().length >= 2) {
      loadSearchResults(searchInput.value.trim(), currentPage);
    } else {
      loadFeaturedContent(currentPage);
    }
  }
}

// Load featured content
async function loadFeaturedContent(page = 1) {
  if (isLoading) return;
  
  isLoading = true;
  toggleLoader(true);
  
  try {
    // Real API call to your backend
    const response = await fetchAPI('/videos', {
      page,
      limit: ITEMS_PER_PAGE,
      sort: sortSelect ? sortSelect.value : 'newest'
    });
    
    if (page === 1) {
      clearContent();
    }
    
    renderContent(response.data);
    hasMoreContent = response.pagination.hasMore;
  } catch (error) {
    console.error('Error loading featured content:', error);
    showErrorMessage('Failed to load content. Please try again later.');
  } finally {
    isLoading = false;
    toggleLoader(false);
  }
}

// Load category content
async function loadCategoryContent(category, page = 1) {
  if (isLoading) return;
  
  isLoading = true;
  toggleLoader(true);
  
  try {
    // Real API call with category filter
    const response = await fetchAPI('/videos', {
      page,
      limit: ITEMS_PER_PAGE,
      category,
      sort: sortSelect ? sortSelect.value : 'newest'
    });
    
    if (page === 1) {
      clearContent();
    }
    
    renderContent(response.data);
    hasMoreContent = response.pagination.hasMore;
    
    // Update page title
    document.title = `${category} - ApproVideo`;
  } catch (error) {
    console.error(`Error loading content for category ${category}:`, error);
    showErrorMessage('Failed to load category content. Please try again later.');
  } finally {
    isLoading = false;
    toggleLoader(false);
  }
}

// Load search results
async function loadSearchResults(term, page = 1) {
  if (isLoading) return;
  
  isLoading = true;
  toggleLoader(true);
  
  try {
    // Real API call with search parameter
    const response = await fetchAPI('/videos', {
      page,
      limit: ITEMS_PER_PAGE,
      search: term,
      sort: sortSelect ? sortSelect.value : 'newest'
    });
    
    if (page === 1) {
      clearContent();
    }
    
    renderContent(response.data);
    hasMoreContent = response.pagination.hasMore;
    
    // Update page title
    document.title = `Search: ${term} - ApproVideo`;
  } catch (error) {
    console.error(`Error searching for "${term}":`, error);
    showErrorMessage('Failed to load search results. Please try again later.');
  } finally {
    isLoading = false;
    toggleLoader(false);
  }
}

// Helper function to make API calls
async function fetchAPI(endpoint, params = {}) {
  // Build query string from params
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });
  
  const url = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Render content to the page
function renderContent(items) {
  if (!videoGrid || !items || !Array.isArray(items)) return;
  
  videoGrid.classList.remove('hidden');
  
  if (items.length === 0) {
    showNoResultsMessage();
    return;
  }
  
  items.forEach(item => {
    const card = createVideoCard(item);
    videoGrid.appendChild(card);
  });
}

// Create a video card element
function createVideoCard(item) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-102';
  card.dataset.date = new Date(item.createdAt || item.created_at || Date.now()).getTime();
  card.dataset.views = item.views || 0;
  card.dataset.title = item.title || 'Untitled Video';
  
  // Format tags
  const tagsHtml = Array.isArray(item.tags) && item.tags.length > 0 
    ? `<div class="flex flex-wrap mt-2 gap-1">
         ${item.tags.slice(0, 3).map(tag => 
           `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">${tag}</span>`
         ).join('')}
         ${item.tags.length > 3 ? `<span class="text-xs text-gray-500">+${item.tags.length - 3} more</span>` : ''}
       </div>`
    : '';
  
  // Get thumbnail, fall back to placeholder if not found
  const thumbnail = item.thumbnail || item.thumbnailUrl || `https://picsum.photos/400/225?random=${item.id}`;
  
  // Determine video duration
  const duration = item.duration || item.length || Math.floor(Math.random() * 600) + 30;
  
  card.innerHTML = `
    <a href="/video/${item.id}" class="block">
      <div class="relative pb-[56.25%]">
        <img src="${thumbnail}" alt="${item.title}" class="absolute inset-0 w-full h-full object-cover">
        <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          ${formatDuration(duration)}
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">${item.title}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">${item.description || ''}</p>
        ${tagsHtml}
        <div class="flex items-center justify-between mt-4">
          <span class="text-xs text-gray-500 dark:text-gray-500">${formatDate(item.createdAt || item.created_at)}</span>
          <span class="text-xs text-gray-500 dark:text-gray-500">${formatViews(item.views || 0)} views</span>
        </div>
      </div>
    </a>
  `;
  
  return card;
}

// Show no results message
function showNoResultsMessage() {
  const messageElement = document.createElement('div');
  messageElement.className = 'col-span-full p-8 text-center';
  messageElement.innerHTML = `
    <div class="text-gray-400 dark:text-gray-500 text-xl mb-4">
      <i class="fas fa-search fa-3x mb-4"></i>
      <h3 class="font-semibold">No results found</h3>
    </div>
    <p class="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
  `;
  
  if (videoGrid) {
    videoGrid.appendChild(messageElement);
  }
}

// Clear content container
function clearContent() {
  if (videoGrid) {
    videoGrid.innerHTML = '';
  }
}

// Toggle loader visibility
function toggleLoader(show) {
  if (skeletonLoader) {
    skeletonLoader.classList.toggle('hidden', !show);
  }
}

// Show error message
function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'col-span-full p-4 text-center text-red-500';
  errorElement.textContent = message;
  
  if (videoGrid) {
    clearContent();
    videoGrid.appendChild(errorElement);
    videoGrid.classList.remove('hidden');
  }
}

// Update UI based on user session
function updateUIForUser(session) {
  const loginButton = document.getElementById('loginButton');
  const signupButton = document.getElementById('signupButton');
  const logoutButton = document.getElementById('logoutButton');
  const userInfo = document.getElementById('userInfo');
  const mobileLoginButton = document.getElementById('mobileLoginButton');
  const mobileSignupButton = document.getElementById('mobileSignupButton');
  const mobileLogoutButton = document.getElementById('mobileLogoutButton');
  const mobileUserInfo = document.getElementById('mobileUserInfo');
  
  if (session && session.email !== 'unknown@example.com') {
    // User is logged in
    if (loginButton) loginButton.classList.add('hidden');
    if (signupButton) signupButton.classList.add('hidden');
    if (logoutButton) logoutButton.classList.remove('hidden');
    if (userInfo) {
      userInfo.classList.remove('hidden');
      userInfo.textContent = session.email;
    }
    
    if (mobileLoginButton) mobileLoginButton.classList.add('hidden');
    if (mobileSignupButton) mobileSignupButton.classList.add('hidden');
    if (mobileLogoutButton) mobileLogoutButton.classList.remove('hidden');
    if (mobileUserInfo) {
      mobileUserInfo.classList.remove('hidden');
      mobileUserInfo.textContent = session.email;
    }
  } else {
    // User is not logged in
    if (loginButton) loginButton.classList.remove('hidden');
    if (signupButton) signupButton.classList.remove('hidden');
    if (logoutButton) logoutButton.classList.add('hidden');
    if (userInfo) userInfo.classList.add('hidden');
    
    if (mobileLoginButton) mobileLoginButton.classList.remove('hidden');
    if (mobileSignupButton) mobileSignupButton.classList.remove('hidden');
    if (mobileLogoutButton) mobileLogoutButton.classList.add('hidden');
    if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
  }
}

// Update intro text based on selected category
function updateIntroText(element) {
  const introTitle = document.getElementById('intro-title');
  const introText = document.getElementById('intro-text');
  const introDisplay = document.getElementById('intro-text-display');
  
  if (introTitle && introText && introDisplay && element.dataset.text) {
    introTitle.textContent = element.dataset.category || 'Category';
    introText.textContent = element.dataset.text;
    introDisplay.classList.remove('hidden');
  } else if (introDisplay) {
    introDisplay.classList.add('hidden');
  }
}

// Helper functions
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Invalid date';
  }
}

function formatViews(views) {
  if (!views || isNaN(views)) return '0';
  
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Export for testing
export {
  handleSearch,
  handleSort,
  loadFeaturedContent,
  loadCategoryContent
};
