// index.js (or wherever your main script runs)


// Assuming safeHtml is still imported or available globally if needed
// import safeHtml from './safeHtmlUtils.js';

class PublicVideoPortal {
  constructor() {
    // REMOVED: this.supabase initialization

    this.safeHtml = safeHtml; // Keep if used in render methods
    this.currentPage = 0;
    this.isLoading = false;
    this.hasMore = true;
    this.BATCH_SIZE = 12;
    this.selectedCategory = null; // State for category filter
    this.searchQuery = ''; // State for search term
    this.sortBy = 'newest'; // State for sorting ('newest', 'popular', 'az')

    // Start initialization
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.showSkeletonLoader();
    await this.loadVideos(); // Initial load
  }

      setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('change', (e) => {
                console.log('Search input changed:', e.target.value);
                this.searchQuery = e.target.value.trim();
                this.selectedCategory = null;
                updateCategoryVisuals(null); // <-- Deselect visual category on search
                this.resetAndReload();
            });
            searchInput.closest('form')?.addEventListener('submit', (e) => e.preventDefault());
        }
      // Prevent form submission if inside a form
      searchInput.closest('form')?.addEventListener('submit', (e) => e.preventDefault());
    }

    // Category buttons/links - Assuming these are handled by CategoryManager or similar now
    // Ensure clicks on category/subcategory items eventually call a method like this:
    // this.filterByCategory('your-category-slug');

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.handleSort(e.target.value);
      });
    }

    // Infinite scroll
    this.setupInfiniteScroll();
  }

  // Add this method to handle category selection consistently
  filterByCategory(categorySlug) {
        console.log('Filtering by category:', categorySlug);
        if (this.selectedCategory === categorySlug) {
            this.selectedCategory = null;
        } else {
            this.selectedCategory = categorySlug;
            this.searchQuery = ''; // Clear search on category select
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
        }
        updateCategoryVisuals(this.selectedCategory); // <-- Update visuals on category change
        this.resetAndReload();
  }





  setupInfiniteScroll() { // Keep as is
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
          console.log('Infinite scroll triggered');
          this.loadVideos();
        }
      },
      { threshold: 0.1 }
    );

    const trigger = document.getElementById('infiniteScrollTrigger');
    if (trigger) {
      observer.observe(trigger);
    } else {
        console.warn("Infinite scroll trigger element not found.");
    }
  }

  showSkeletonLoader() { // Keep as is
    const loader = document.getElementById('skeletonLoader');
    if (!loader) return;
    const skeletons = Array(6).fill().map(() => this.createSkeletonCard()).join('');
    loader.innerHTML = skeletons;
    loader.classList.remove('hidden');
    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) videoGrid.classList.add('hidden');
  }

  createSkeletonCard() { // Keep as is
      return `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
        <div class="w-full h-48 bg-gray-300 dark:bg-gray-700"></div>
        <div class="p-4">
          <div class="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
          <div class="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div class="flex gap-2 mb-4">
            <div class="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div class="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    `;
  }

  // *** UPDATED loadVideos ***
  async loadVideos() {
    if (this.isLoading || !this.hasMore) return;

    console.log(`Loading videos - Page: ${this.currentPage + 1}, Category: ${this.selectedCategory}, Search: ${this.searchQuery}, Sort: ${this.sortBy}`);
    this.isLoading = true;
    // Optionally show a more prominent loading indicator
    // const loadingIndicator = document.getElementById('loadingIndicator');
    // if(loadingIndicator) loadingIndicator.classList.remove('hidden');

    try {
      // Construct API URL with parameters
      const params = new URLSearchParams({
        page: this.currentPage + 1, // API uses 1-based paging
        limit: this.BATCH_SIZE,
        sort: this.sortBy
      });
      if (this.selectedCategory) {
        params.append('category', this.selectedCategory);
      }
      if (this.searchQuery) {
        params.append('search', this.searchQuery);
      }

      const apiUrl = `/api/videos?${params.toString()}`;
      console.log('Fetching:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        // Try to get error details from response body
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorMsg;
        } catch(e) { /* Ignore if response body isn't valid JSON */ }
        throw new Error(errorMsg);
      }

      const result = await response.json(); // Expecting { data: [], pagination: { ..., hasMore: boolean } }

      if (!result || !result.data || !result.pagination) {
         throw new Error('Invalid API response format');
      }

      console.log('API Response:', result);

      this.hasMore = result.pagination.hasMore || false;
      this.renderVideos(result.data);
      this.currentPage++; // Increment page number for the *next* load

    } catch (error) {
      console.error('Error loading videos via API:', error);
      this.showError(error.message || 'Failed to load videos');
      this.hasMore = false; // Stop trying to load more on error
    } finally {
      this.isLoading = false;
      document.getElementById('skeletonLoader')?.classList.add('hidden');
      document.getElementById('videoGrid')?.classList.remove('hidden');
      // if(loadingIndicator) loadingIndicator.classList.add('hidden');
    }
  }

  renderVideos(videos) { // Keep largely as is, ensure data structure matches
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;

    const videoHTML = videos.map(video => this.createVideoCard(video)).join('');

    if (this.currentPage === 0) { // Check if it's the first batch for this load sequence
      videoGrid.innerHTML = videoHTML;
      if (videos.length === 0) {
          videoGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No videos found matching your criteria.</p>';
      }
    } else {
      videoGrid.insertAdjacentHTML('beforeend', videoHTML);
    }
  }

  resetAndReload() {
    console.log('Resetting and reloading videos...');
    this.currentPage = 0; // Reset page number for API call
    this.hasMore = true; // Assume there is more data until proven otherwise
    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
      videoGrid.innerHTML = ''; // Clear existing videos immediately
    }
    this.showSkeletonLoader();
    // Add a small delay to allow UI to update before network request (optional)
    // setTimeout(() => this.loadVideos(), 50);
    this.loadVideos();
  }

  createVideoCard(video) { // Keep as is, ensure video object structure matches API response
    // Double check video object properties match what the API now sends
    // Especially `tags` and `panels` should be arrays from the backend now.
    const safeVideo = this.safeHtml.escapeObject ? this.safeHtml.escapeObject(video) : video; // Handle potential removal of safeHtml

    // Original youtubeId link construction - verify this still works or adjust if needed
    const thumbnailUrl = `https://img.youtube.com/vi/$${safeVideo.youtubeId}/maxresdefault.jpg`;
    const fallbackThumbnailUrl = `https://img.youtube.com/vi/$${safeVideo.youtubeId}/0.jpg`;
    const videoUrl = `https://www.youtube.com/watch?v=$${safeVideo.youtubeId}`; // Verify this is the correct video link format

    return `
      <div class="video-card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col" data-video-id="${safeVideo.id}">
        <div class="relative aspect-video">
          <a target="_blank" rel="noopener noreferrer" href="${videoUrl}">
            <img
              src="${thumbnailUrl}"
              alt="${safeVideo.title || 'Video thumbnail'}"
              class="w-full h-full object-cover"
              onerror="this.onerror=null; this.src='${fallbackThumbnailUrl}';"
              loading="lazy"
            >
          </a>
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <h3 class="video-title text-lg font-semibold mb-2 line-clamp-2">${safeVideo.title || 'Untitled Video'}</h3>
          <p class="video-description text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3 flex-grow">${safeVideo.description || 'No description available.'}</p>
          <div class="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
            <i class="fas ${this.getCategoryIcon(safeVideo.category)}"></i>
            <span>${safeVideo.category || 'General'}</span>
            ${safeVideo.subcategory ? `
              <span class="mx-1">/</span>
              <span>${safeVideo.subcategory}</span>
            ` : ''}
          </div>
          ${this.renderPanels(safeVideo.panels)}
          <div class="flex flex-wrap gap-1 mt-3">
            ${this.renderTags(safeVideo.tags)}
          </div>
        </div>
      </div>
    `;
  }

  renderPanels(panels) { // Keep as is, assuming API returns panels as an array
    if (!panels || !Array.isArray(panels) || !panels.length) return '';
     // Ensure safeHtml is available or remove escaping if API guarantees safety
    const escape = this.safeHtml?.escape || (str => str);
    return `
      <div class="mt-2 space-y-1">
        ${panels.map(panel => `
          <details class="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm group">
             <summary class="font-medium cursor-pointer group-open:mb-1">${escape(panel.title || 'Details')}</summary>
             <p class="text-gray-600 dark:text-gray-300">${escape(panel.content || '')}</p>
          </details>
        `).join('')}
      </div>
    `;
  }

  renderTags(tags) { // Keep as is, assuming API returns tags as an array
    if (!tags || !Array.isArray(tags) || !tags.length) return '';
     // Ensure safeHtml is available or remove escaping
    const escape = this.safeHtml?.escape || (str => str);
    return tags.map(tag => `
      <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
        ${escape(tag.trim())}
      </span>
    `).join('');
  }

  getCategoryIcon(category) { // Keep as is or update icons
     const icons = {
      'shelter': 'fa-building', // From HTML
      'water': 'fa-tint', // From HTML
      'energy': 'fa-bolt', // From HTML
      'health': 'fa-heartbeat', // From HTML
      'agronomy': 'fa-seedling', // From HTML (mapped from Food button)
      'food': 'fa-seedling', // Direct match
       // Subcategories from API/JSON data
      'waterdistribution': 'fa-faucet',
      'telemedicine': 'fa-laptop-medical',
      'selfsuficienthealthcare': 'fa-clinic-medical', // Renamed? 'selfsufficienthealthcare' in HTML
      'firstaid': 'fa-briefcase-medical',
      'waterpurification': 'fa-filter',
      'sustainable-agriculture-techniques': 'fa-leaf', // Renamed? 'sustainableag' in HTML
      'biogas': 'fa-fire',
      // Add others as needed based on actual category values
      'default': 'fa-tag'
    };
    return icons[category?.toLowerCase()] || icons['default'];
  }

  // *** UPDATED handleSort ***
  handleSort(sortValue) {
    console.log('Sort changed to:', sortValue);
    // sortValue should be 'newest', 'popular', 'az' from the select options
    this.sortBy = sortValue;
    this.resetAndReload();
  }

  showError(message) { // Keep as is
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;
    const escape = this.safeHtml?.escape || (str => str); // Ensure safeHtml if used
    videoGrid.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-red-600 mb-2 text-lg">Oops! Something went wrong.</p>
        <p class="text-gray-600 dark:text-gray-400 mb-4">${escape(message)}</p>
        <button
          onclick="window.location.reload()"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    `;
    // Hide loader if error occurs
    document.getElementById('skeletonLoader')?.classList.add('hidden');
  }
}


// Helper function (place outside the class or make it a method)
function updateCategoryVisuals(selectedSlug) {
  const activeClass = 'active-category-filter';

  // Select all potential category elements (adjust selectors if needed)
  const allCategoryElements = document.querySelectorAll(
    '.group > a[data-category], .drop-up-item[data-category]'
  );

  allCategoryElements.forEach(el => {
    // Remove active class from all
    el.classList.remove(activeClass);
    // Add active class if the element's slug matches the selected one
    if (selectedSlug && el.getAttribute('data-category') === selectedSlug) {
      el.classList.add(activeClass);
    }
  });
}






document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Portal and other modules ---
    const portal = new PublicVideoPortal();
    let introTexts = {}; // Cache for the intro texts

    // --- Load Intro Texts ---
    async function loadIntroTexts() {
        try {
            const response = await fetch('/data/subarea-intro-texts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            introTexts = await response.json();
            console.log('Intro texts loaded:', introTexts);
        } catch (error) {
            console.error('Error loading subarea-intro-texts.json:', error);
            // Optionally show an error to the user
        }
    }
    loadIntroTexts(); // Load texts when DOM is ready

    // --- Get References to UI Elements ---
    const mainCategoryIcons = document.querySelectorAll('.main-category-icon'); // Add this class to your main category links/buttons
    const subcategoryDisplayBox = document.getElementById('mondrian-box');
    const subcategoryLinksContainer = document.getElementById('subcategory-links');
    const introTextDisplayBox = document.getElementById('intro-text-display');
    const introTitleElement = document.getElementById('intro-title');
    const introTextElement = document.getElementById('intro-text');
    const addResourceLinkElement = document.getElementById('add-resource-link');

    // --- Event Listener for MAIN Category Icons ---
    mainCategoryIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const mainCategorySlug = icon.getAttribute('data-category'); // e.g., "Water"
            if (!mainCategorySlug) return;

            console.log('Main category icon clicked:', mainCategorySlug);

            // Find the corresponding subcategories from the HTML structure
            // Assumes subcats are in a '.drop-up-menu' next to the clicked icon's parent group
            const group = icon.closest('.group');
            const dropUpMenu = group?.querySelector('.drop-up-menu');
            const subcategoryItems = dropUpMenu?.querySelectorAll('.drop-up-item');

            if (subcategoryItems && subcategoryItems.length > 0) {
                // Populate the subcategory display area
                subcategoryLinksContainer.innerHTML = ''; // Clear previous
                subcategoryItems.forEach(item => {
                    // Clone the item to avoid moving it from the original menu
                    const clone = item.cloneNode(true);
                    // Add styling if needed for this context
                    clone.classList.add('m-1', 'inline-block'); // Example styling
                    clone.classList.remove('absolute', 'hidden'); // Remove potentially conflicting styles
                    subcategoryLinksContainer.appendChild(clone);
                });

                // Show subcategory box, hide intro text box
                subcategoryDisplayBox?.classList.remove('hidden');
                introTextDisplayBox?.classList.add('hidden');

            } else {
                console.warn(`No subcategories found for main category: ${mainCategorySlug}`);
                // Optionally filter directly by main category if no subcats exist
                // portal.filterByCategory(mainCategorySlug);
                subcategoryDisplayBox?.classList.add('hidden');
                introTextDisplayBox?.classList.add('hidden');
            }
        });
    });

    // --- Event Listener for dynamically shown SUBCATEGORIES ---
    if (subcategoryLinksContainer) {

    // Make the listener async to use await for auth check
    subcategoryLinksContainer.addEventListener('click', async (e) => { // Added async
        const targetLink = e.target.closest('.drop-up-item[data-category]');
        if (targetLink) {
            e.preventDefault();
            const subCategorySlug = targetLink.getAttribute('data-category');

            if (subCategorySlug) {
                console.log('Subcategory selected:', subCategorySlug);

                // *** Check Auth Status ***
                const authStatus = await checkAuthStatus();
                console.log('Auth Status:', authStatus);

                // 1. Display Intro Text
                const introData = introTexts[subCategorySlug];
                if (introData && introTitleElement && introTextElement && addResourceLinkElement) {
                    introTitleElement.textContent = introData.title || 'Overview';
                    introTextElement.textContent = introData.text || 'No introduction available for this topic.';
                    addResourceLinkElement.href = introData.addResourceLink || '#';

                    // *** Conditionally show "Add Resource" link ***
                    // Show if logged in (add role check if needed, e.g., authStatus.userRole === 'editor')
                    addResourceLinkElement.style.display = authStatus.isLoggedIn ? 'inline-block' : 'none';

                    introTextDisplayBox?.classList.remove('hidden');
                } else {
                    console.warn(`No intro text found for subcategory: ${subCategorySlug}`);
                    introTextDisplayBox?.classList.add('hidden');
                    // Hide link explicitly if text box is hidden
                    if(addResourceLinkElement) addResourceLinkElement.style.display = 'none';
                }

                // 2. Trigger Video Filtering in the Portal
                portal.filterByCategory(subCategorySlug);

                // 3. Hide the subcategory selection box
                subcategoryDisplayBox?.classList.add('hidden');
            }
        }
    });
} else {
    console.warn("Element with ID 'subcategory-links' not found for delegation.");
}



  // 1. Initialize the Portal (Handles data loading, search, sort, infinite scroll)
  const portal = new PublicVideoPortal();

  // 2. Banner Rotation (Keep as is)
  const banner = document.querySelector('.bg-gradient-to-r.from-green-600');
  const bannerMessages = [ /* ... messages ... */ ]; // Ensure messages array is defined
  if (banner && bannerMessages && bannerMessages.length > 0) {
      let currentMessageIndex = 0;
      function updateBannerMessage() { /* ... */ }
      updateBannerMessage();
      setInterval(updateBannerMessage, 5000);
  }

  // 3. Theme Toggle (Seems duplicated - prefer CategoryManager or one here)
  //    If using CategoryManager, remove this block. If not, keep it.
  const darkModeToggle = document.getElementById('darkModeToggle'); // Assuming this ID exists
  const html = document.documentElement;
  function updateTheme(isDark) { /* ... */ }
  if (darkModeToggle) {
     // Check saved preference logic
     // Add click listener
  } else {
     // If using CategoryManager, make sure its toggle button has id="themeToggle"
     // Or adjust CategoryManager to find its button differently.
  }

  // 4. Category/Subcategory Interaction
  //    Rely on PublicVideoPortal.filterByCategory method.
  //    Need to ensure clicks on main category icons AND subcategory links trigger this method.

  // Example: Attaching listener to the subcategory links container
  const subcategoryLinksContainer = document.getElementById('subcategory-links');
  if (subcategoryLinksContainer) {
      subcategoryLinksContainer.addEventListener('click', (e) => {
          if (e.target.matches('.drop-up-item, .drop-up-item *')) { // Handle clicks on item or its children
              e.preventDefault();
              const targetLink = e.target.closest('.drop-up-item');
              const categorySlug = targetLink?.getAttribute('data-category');
              if (categorySlug) {
                  portal.filterByCategory(categorySlug); // Call the portal's method
                  // Optionally close the dropdown/mondrian box here
                  document.getElementById('mondrian-box')?.classList.add('hidden');
              }
          }
      });
  }

  // TODO: Add similar logic for the main category buttons if they should also trigger filtering.
  // Example for main category buttons (adjust selector if needed):
  document.querySelectorAll('.icon-button[data-category]').forEach(button => {
      button.addEventListener('click', (e) => {
          e.preventDefault();
          const categorySlug = button.getAttribute('data-category');
           // This might be a MAIN category, decide if clicking it filters directly
           // or just opens the subcategory menu. Assuming filter for now:
          if (categorySlug) {
              portal.filterByCategory(categorySlug);
          }
           // Prevent dropdowns from closing immediately if handled elsewhere
          // e.stopPropagation();
      });
  });


  // 5. Remove Redundant Listeners/Logic previously identified:
  //    - Client-side search filtering loop
  //    - Client-side sorting logic
  //    - Redundant infinite scroll observer outside the class
  //    - Ensure event listeners added here don't conflict with those in the class constructor.

  // 6. Modals (Keep setup as is)
  const sponsorButton = document.getElementById('sponsor-us');
  const editorButton = document.getElementById('be-an-editor');
  // Add logic to open/close modals...

  // ... rest of your modal, footer animation, etc. setup ...

});

// Ensure CategoryManager initialization doesn't conflict if used alongside DOMContentLoaded setup.
// Consider integrating CategoryManager's theme toggle logic into the DOMContentLoaded setup
// or ensuring only one theme toggle mechanism is active.

// Make sure PublicVideoPortal class definition comes before this

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize the Portal (Handles data loading, search, sort, infinite scroll)
  //    Make sure this line runs before attaching listeners that use 'portal'
  const portal = new PublicVideoPortal();

  // 2. Banner Rotation (Keep as is)
  const banner = document.querySelector('.bg-gradient-to-r.from-green-600');
  // Make sure bannerMessages array is defined here or globally
  const bannerMessages = [
      "🎥 Sharing knowledge that changes lives - One video at a time",
      "🌱 Building resilience through appropriate technology",
      "💧 Clean water, safe shelter, better lives",
      "🌟 Empowering communities with sustainable solutions",
      "🤝 Technology that serves humanity",
      "🏗️ Building bridges to a sustainable future",
      "💪 Local solutions, global impact",
      "🌍 Every community deserves access to vital knowledge"
  ];
  if (banner && bannerMessages && bannerMessages.length > 0) {
    let currentMessageIndex = 0;
    function updateBannerMessage() {
        if(banner) banner.textContent = bannerMessages[currentMessageIndex];
        currentMessageIndex = (currentMessageIndex + 1) % bannerMessages.length;
    }
    updateBannerMessage();
    setInterval(updateBannerMessage, 5000);
  }

  // 3. Theme Toggle (Ensure only one mechanism is active - either here or CategoryManager)
  // Example logic if handling theme toggle here:
  const darkModeToggle = document.getElementById('themeToggle'); // Make sure this ID exists on your toggle button
  const html = document.documentElement;
  function updateTheme(isDark) {
      html.classList.toggle('dark', isDark);
      localStorage.setItem('darkMode', isDark);
  }
  if (darkModeToggle) {
      // Check saved preference
      if (localStorage.getItem('darkMode') === 'true' ||
          (!localStorage.getItem('darkMode') &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        updateTheme(true);
      } else {
        updateTheme(false); // Explicitly set light mode if no dark preference
      }
      // Add click listener
      darkModeToggle.addEventListener('click', () => {
        updateTheme(!html.classList.contains('dark'));
      });
  }


  // --- 4. Category & Subcategory Filtering Listeners ---
  //    These listeners will call portal.filterByCategory

  // Listener for MAIN Category Icons/Links
  // Selects the <a> tag within the .group div that has a data-category attribute
  const mainCategoryLinks = document.querySelectorAll('.group > a[data-category]');
  mainCategoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default link navigation

      // Get the category slug from the main link itself
      const categorySlug = link.getAttribute('data-category');

      if (categorySlug) {
        console.log('Main category link clicked:', categorySlug);
        portal.filterByCategory(categorySlug); // Call the filtering method

        // Optional: Close all drop-up menus after a main category is clicked for filtering
        document.querySelectorAll('.drop-up-menu').forEach(menu => {
            // You might need a more sophisticated way if you want menus to stay open on hover
            // This example hides them on click
           // menu.classList.add('hidden');
        });
        // Optional: Close the Mondrian box if it was open
        document.getElementById('mondrian-box')?.classList.add('hidden');

      } else {
          console.warn("Clicked main category link missing data-category attribute.");
      }
    });
  });

  // Listener for SUBcategory Links (using event delegation)
  // Attaches one listener to the container where subcategory links are dynamically added
  const subcategoryLinksContainer = document.getElementById('subcategory-links');
  if (subcategoryLinksContainer) {
    subcategoryLinksContainer.addEventListener('click', (e) => {
      // Check if the clicked element or its parent is a subcategory link
      const targetLink = e.target.closest('.drop-up-item[data-category]');

      if (targetLink) {
        e.preventDefault(); // Prevent default link navigation
        const categorySlug = targetLink.getAttribute('data-category');

        if (categorySlug) {
          console.log('Subcategory link clicked:', categorySlug);
          portal.filterByCategory(categorySlug); // Call the filtering method

          // Close the subcategory display box after selection
          document.getElementById('mondrian-box')?.classList.add('hidden');
        } else {
            console.warn("Clicked subcategory link missing data-category attribute.");
        }
      }
    });
  } else {
      console.warn("Element with ID 'subcategory-links' not found. Subcategory click filtering might not work.");
  }

  // --- 5. Remove Redundant/Conflicting Logic ---
  // IMPORTANT: Go through the rest of your DOMContentLoaded listener and REMOVE
  // any other event listeners or code sections that were previously handling
  // category clicks, client-side search filtering, or client-side sorting,
  // as these functionalities are now managed within the PublicVideoPortal class
  // and triggered by the listeners added above or within the class itself.

  // --- 6. Modals & Footer Setup (Keep as is) ---
    const sponsorButton = document.getElementById('sponsor-us');
    const editorButton = document.getElementById('be-an-editor');
    const sponsorModal = document.getElementById('sponsor-modal');
    const editorModal = document.getElementById('editor-modal');
    const closeSponsor = document.getElementById('close-sponsor-modal');
    const closeEditor = document.getElementById('close-editor-modal');

    sponsorButton?.addEventListener('click', () => sponsorModal?.classList.remove('hidden'));
    editorButton?.addEventListener('click', () => editorModal?.classList.remove('hidden'));
    closeSponsor?.addEventListener('click', () => sponsorModal?.classList.add('hidden'));
    closeEditor?.addEventListener('click', () => editorModal?.classList.add('hidden'));

    // Mission reveal
    const missionReveal = document.getElementById('mission-reveal');
    missionReveal?.addEventListener('click', () => {
        missionReveal.querySelector('.mission-text')?.classList.toggle('hidden');
    });


  
  // ... any other non-conflicting initial setup code ...

}); // End of DOMContentLoaded
