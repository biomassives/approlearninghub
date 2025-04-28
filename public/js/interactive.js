// js/interactive.js
// Interactive Video Platform JavaScript

// --- Configuration ---
const API_BASE_URL = '/api/videos'; // Assuming your API is served at this path
const VIDEOS_PER_PAGE = 12; // How many videos to load per request
const MOCK_MODE = false; // Set to false when real API is available

// --- Category Structure (for UI Navigation) ---
const categoryUIData = [
    { 
        area: "Shelter", 
        icon: "fa-home", 
        subcategories: [ 
            { 
                title: "Low-cost, Durable Construction Methods", 
                tags: ["building", "construction", "affordable", "DIY"] 
            }, 
            { 
                title: "Locally Available Materials", 
                tags: ["materials", "local", "resources", "sustainable"] 
            } 
        ] 
    },
    { 
        area: "Water", 
        icon: "fa-tint", 
        subcategories: [ 
            { 
                title: "Purification", 
                tags: ["clean water", "filtering", "health", "safety"] 
            }, 
            { 
                title: "Desalination", 
                tags: ["salt water", "fresh water", "coastal"] 
            }, 
            { 
                title: "Efficient Distribution", 
                tags: ["irrigation", "storage", "community systems"] 
            } 
        ] 
    },
    { 
        area: "Waste Management", 
        icon: "fa-recycle", 
        subcategories: [ 
            { 
                title: "Composting", 
                tags: ["organic", "soil", "garden"] 
            }, 
            { 
                title: "Recycling Systems", 
                tags: ["reuse", "materials", "community"] 
            }, 
            { 
                title: "Upcycling", 
                tags: ["creative reuse", "crafts", "repurpose"] 
            }, 
            { 
                title: "Wastewater Management", 
                tags: ["sewage", "grey water", "treatment"] 
            } 
        ] 
    },
    { 
        area: "Energy", 
        icon: "fa-solar-panel", 
        subcategories: [ 
            { 
                title: "DIY Solar Energy", 
                tags: ["renewable", "electricity", "panels"] 
            }, 
            { 
                title: "Biogas Generation", 
                tags: ["organic", "methane", "cooking"] 
            }, 
            { 
                title: "Microgrids for Sustainable Power", 
                tags: ["community", "distribution", "independence"] 
            }, 
            { 
                title: "Hand Pressed Heat & Cooking Fuel Briquettes", 
                tags: ["biomass", "cooking", "heating"] 
            } 
        ] 
    },
    { 
        area: "Health", 
        icon: "fa-heartbeat", 
        subcategories: [ 
            { 
                title: "EMT Skills", 
                tags: ["emergency", "medical", "training"] 
            }, 
            { 
                title: "Telemedicine", 
                tags: ["remote", "healthcare", "technology"] 
            }, 
            { 
                title: "First Aid", 
                tags: ["emergency", "care", "basics"] 
            }, 
            { 
                title: "Self-sufficient Healthcare", 
                tags: ["independence", "community", "wellness"] 
            } 
        ] 
    },
    { 
        area: "Sustainable Food", 
        icon: "fa-seedling", 
        subcategories: [ 
            { 
                title: "Urban Gardening", 
                tags: ["city", "growing", "local"] 
            }, 
            { 
                title: "Hydro/Aero/Fish -ponics", 
                tags: ["soilless", "growing", "aquaculture"] 
            }, 
            { 
                title: "Sustainable Agriculture Techniques", 
                tags: ["farming", "permaculture", "regenerative"] 
            }, 
            { 
                title: "Fungli, Algae, Insects, & Tech", 
                tags: ["alternative protein", "nutrition", "future food"] 
            } 
        ] 
    }
];

// --- Mock Data for Testing (remove in production) ---
const MOCK_VIDEOS = [
    {
        id: "v001",
        title: "DIY Solar Panel Installation Guide",
        description: "Complete walkthrough for installing a small-scale solar panel system for your home or community. Learn how to calculate energy needs, select appropriate components, and safely install your system.",
        tags: ["solar", "renewable energy", "DIY", "installation"],
        youtubeId: "jSa1tvrrYZk",
        category: "Energy",
        subcategory: "DIY Solar Energy",
        panels: [
            { title: "Intro", content: "Introduction to solar energy basics" },
            { title: "Components", content: "Solar panel components overview" },
            { title: "Installation", content: "Step-by-step installation process" },
            { title: "Testing", content: "How to test your system" }
        ]
    },
    {
        id: "v002",
        title: "Low-Cost Water Filtration System",
        description: "Learn how to build a multi-stage water filtration system using locally available materials. This design removes particulates, many pathogens, and some chemical contaminants.",
        tags: ["water", "filtration", "purification", "health"],
        youtubeId: "l4vPMc-IKnw",
        category: "Water",
        subcategory: "Purification"
    },
    {
        id: "v003",
        title: "Building with Earth Bags",
        description: "Comprehensive guide to constructing durable structures using earth bag techniques. This method creates strong, insulated buildings with minimal materials cost.",
        tags: ["construction", "earthbag", "sustainable", "building"],
        youtubeId: "D14_9UJaDyA",
        category: "Shelter",
        subcategory: "Low-cost, Durable Construction Methods"
    },
    {
        id: "v004",
        title: "Community Composting Systems",
        description: "How to set up and manage a neighborhood-scale composting system. Includes guidance on collection, management, and distribution of finished compost.",
        tags: ["compost", "waste", "community", "soil"],
        youtubeId: "1WrQn-QSvw8",
        category: "Waste Management",
        subcategory: "Composting"
    },
    {
        id: "v005",
        title: "Emergency Medical Skills: Wound Care",
        description: "Essential techniques for cleaning, treating, and dressing wounds when professional medical care is unavailable or delayed.",
        tags: ["medical", "emergency", "wounds", "first aid"],
        youtubeId: "ya6G8bsYvQg",
        category: "Health",
        subcategory: "EMT Skills"
    },
    {
        id: "v006",
        title: "Urban Balcony Garden System",
        description: "Maximize food production in small spaces with this vertical gardening system designed for balconies and small patios.",
        tags: ["garden", "urban", "food", "vegetables"],
        youtubeId: "KjIdrG8DhAU",
        category: "Sustainable Food",
        subcategory: "Urban Gardening"
    },
    {
        id: "v007",
        title: "Simple Biogas Digester Construction",
        description: "Build a small-scale biogas digester that converts organic waste into cooking fuel. Includes complete materials list and step-by-step assembly.",
        tags: ["biogas", "energy", "cooking", "methane"],
        youtubeId: "3TDPOXdVAd0",
        category: "Energy",
        subcategory: "Biogas Generation"
    },
    {
        id: "v008",
        title: "Bamboo Construction Techniques",
        description: "Learn how to properly harvest, treat, and use bamboo for durable construction projects. Includes joinery methods and preservation techniques.",
        tags: ["bamboo", "building", "natural", "construction"],
        youtubeId: "X1DddgGVyQQ",
        category: "Shelter",
        subcategory: "Locally Available Materials"
    }
];

// --- State Variables ---
let currentOffset = 0;
let currentCategory = null;
let currentSubcategory = null;
let currentSearchTerm = null;
let isLoading = false;
let hasMoreVideos = true;
let debounceTimer;

// --- DOM Elements ---
const categoryIconsContainer = document.getElementById('category-icons');
const subcategorySection = document.getElementById('subcategory-section');
const subcategoryTitle = document.getElementById('subcategory-title');
const subcategoriesContainer = document.getElementById('subcategories');
const contentSection = document.getElementById('content-section');
const contentTitle = document.getElementById('content-title');
const contentDetailsContainer = document.getElementById('content-details');
const searchInput = document.getElementById('search-input');
const loadingIndicator = document.getElementById('loading-indicator');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const videoDetailModal = document.getElementById('video-detail');
const closeDetailBtn = document.getElementById('close-detail-btn');
const videoDetailTitle = document.getElementById('video-detail-title');
const videoDetailEmbed = document.getElementById('video-detail-embed');
const videoDetailDescription = document.getElementById('video-detail-description');
const videoDetailTags = document.getElementById('video-detail-tags');
const videoDetailPanels = document.getElementById('video-detail-panels');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const errorCloseBtn = document.getElementById('error-close-btn');

// --- Mock API Functions (for development without backend) ---
function mockFetchVideos(params = {}, append = false) {
    console.log('Mock API: Fetching with params:', params);
    
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            let filteredVideos = [...MOCK_VIDEOS];
            
            // Apply category filter if specified
            if (params.category) {
                filteredVideos = filteredVideos.filter(video => 
                    video.category && video.category.toLowerCase() === params.category.toLowerCase()
                );
            }
            
            // Apply subcategory filter if specified
            if (params.subcategory) {
                filteredVideos = filteredVideos.filter(video => 
                    video.subcategory && video.subcategory.toLowerCase() === params.subcategory.toLowerCase()
                );
            }
            
            // Apply search filter if specified
            if (params.search && params.search.trim() !== '') {
                const searchTerm = params.search.toLowerCase();
                filteredVideos = filteredVideos.filter(video => 
                    (video.title && video.title.toLowerCase().includes(searchTerm)) ||
                    (video.description && video.description.toLowerCase().includes(searchTerm)) ||
                    (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
                );
            }
            
            // Apply offset and limit
            const offset = params.offset || 0;
            const limit = params.limit || VIDEOS_PER_PAGE;
            const paginatedVideos = filteredVideos.slice(offset, offset + limit);
            
            // Return mock response
            resolve({
                success: true,
                items: paginatedVideos,
                total: filteredVideos.length,
                hasMore: offset + limit < filteredVideos.length
            });
        }, 500); // Simulate 500ms network delay
    });
}

// --- API Fetch Function ---
async function fetchVideos(params = {}, append = false) {
    if (isLoading) return; // Don't fetch if already loading
    isLoading = true;
    loadingIndicator.classList.remove('hidden');
    
    if (!append) { // Hide load more button only if it's a fresh load
        loadMoreContainer.classList.add('hidden');
    }

    try {
        let data;
        
        if (MOCK_MODE) {
            // Use mock data for development
            data = await mockFetchVideos({
                limit: VIDEOS_PER_PAGE,
                offset: append ? currentOffset : 0,
                ...params // Spread category, subcategory, or search
            });
        } else {
            // Use real API for production
            const urlParams = new URLSearchParams({
                action: 'videos',
                limit: VIDEOS_PER_PAGE,
                offset: append ? currentOffset : 0,
                ...params
            });

            // Remove empty params
            for (let key of Array.from(urlParams.keys())) {
                if (!urlParams.get(key)) {
                    urlParams.delete(key);
                }
            }

            const url = `${API_BASE_URL}?${urlParams.toString()}`;
            console.log("Fetching:", url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            data = await response.json();
        }

        if (data.success) {
            displayVideoResults(data.items || [], append);
            hasMoreVideos = data.hasMore || false;
            
            // Update offset only after successful display
            currentOffset = (append ? currentOffset : 0) + (data.items?.length || 0);
            
            // Show/hide load more button based on hasMore
            loadMoreContainer.classList.toggle('hidden', !hasMoreVideos);
        } else {
            console.error("API Error:", data.message);
            showError(`Error loading videos: ${data.message || 'Unknown error'}`);
            
            if (!append) {
                contentDetailsContainer.innerHTML = `
                    <p class="col-span-full text-center text-gray-500 py-10">
                        Error loading videos. Please try again later.
                    </p>`;
            }
            
            hasMoreVideos = false;
            loadMoreContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        showError(`Failed to connect: ${error.message}`);
        
        if (!append) { // Only show error in main container if it's a fresh load
            contentDetailsContainer.innerHTML = `
                <p class="col-span-full text-center text-gray-500 py-10">
                    Could not connect to video service. Please try again later.
                </p>`;
        } else {
            // Disable load more button
            loadMoreBtn.textContent = 'Error Loading';
            loadMoreBtn.disabled = true;
        }
        
        hasMoreVideos = false;
        loadMoreContainer.classList.add('hidden');
    } finally {
        isLoading = false;
        loadingIndicator.classList.add('hidden');
    }
}

// --- Display Video Results ---
function displayVideoResults(videoItems, append = false) {
    if (!append) {
        contentDetailsContainer.innerHTML = ''; // Clear for new results
        currentOffset = 0; // Reset offset for fresh display
    }

    if (videoItems.length === 0 && !append) {
        contentDetailsContainer.innerHTML = `
            <p class="col-span-full text-center text-gray-500 py-10">
                No videos found matching your criteria.
            </p>`;
        return; // Exit early if no videos found on initial load
    }

    videoItems.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';

        // Construct YouTube thumbnail URL (default quality)
        const thumbnailUrl = video.youtubeId 
            ? `https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg` 
            : 'img/video-placeholder.jpg'; // Add a placeholder image path

        card.innerHTML = `
            <img src="${thumbnailUrl}" alt="${video.title || 'Video thumbnail'}" loading="lazy">
            <div>
                <h4>${video.title || 'Untitled Video'}</h4>
                <p class="description">${(video.description || '').substring(0, 100)}${video.description && video.description.length > 100 ? '...' : ''}</p>
                <p class="tags">Tags: ${(video.tags || []).join(', ')}</p>
            </div>
        `;
        
        card.addEventListener('click', () => showVideoDetail(video));
        contentDetailsContainer.appendChild(card);
    });
}

// --- Show Video Detail Modal ---
function showVideoDetail(video) {
    console.log("Showing detail for:", video);
    videoDetailTitle.textContent = video.title || 'Video Details';
    videoDetailDescription.textContent = video.description || 'No description available.';
    videoDetailTags.innerHTML = `<strong>Tags:</strong> ${(video.tags || []).join(', ')}`;

    // Embed YouTube video
    if (video.youtubeId) {
        videoDetailEmbed.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${video.youtubeId}"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
            </iframe>`;
    } else {
        videoDetailEmbed.innerHTML = '<p class="text-center text-gray-500 p-4">Video source not available.</p>';
    }

    // Display panels/chapters if available
    videoDetailPanels.innerHTML = ''; // Clear previous panels
    
    if (video.panels && video.panels.length > 0) {
        const panelsTitle = document.createElement('h4');
        panelsTitle.className = 'text-lg font-semibold mt-6 mb-2';
        panelsTitle.textContent = 'Chapters/Panels';
        videoDetailPanels.appendChild(panelsTitle);
        
        const panelsList = document.createElement('ul');
        panelsList.className = 'list-disc list-inside space-y-1 text-sm';
        
        video.panels.forEach(panel => {
            const li = document.createElement('li');
            li.textContent = `${panel.title || 'Panel'}: ${panel.content || ''}`; // Adjust as needed
            panelsList.appendChild(li);
        });
        
        videoDetailPanels.appendChild(panelsList);
    }

    videoDetailModal.classList.remove('hidden');
    // Lock background scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// --- Close Video Detail Modal ---
function closeVideoDetail() {
    videoDetailModal.classList.add('hidden');
    videoDetailEmbed.innerHTML = ''; // Stop video playback by removing iframe
    // Unlock background scroll
    document.body.style.overflow = '';
}

// --- Display Subcategories (UI Only) ---
function displaySubcategories(category) {
    subcategoriesContainer.innerHTML = ''; // Clear previous
    subcategoryTitle.textContent = `Subcategories for ${category.area}`;

    if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(sub => {
            const subBtn = document.createElement('button');
            subBtn.className = 'subcategory-btn';
            // Display title and tags (from UI data)
            subBtn.innerHTML = `<strong>${sub.title}</strong><p>${(sub.tags || []).join(', ')}</p>`;

            subBtn.onclick = () => {
                // --- Trigger API fetch based on this subcategory ---
                currentCategory = category.area;
                currentSubcategory = sub.title;
                currentSearchTerm = null; // Clear search term
                
                // Clear search input
                if (searchInput) {
                    searchInput.value = '';
                }
                
                contentTitle.textContent = `Videos for: ${category.area} - ${sub.title}`; // Update main content title
                fetchVideos({ category: currentCategory, subcategory: currentSubcategory }, false); // false = don't append
                
                // Scroll to content section
                contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            
            subcategoriesContainer.appendChild(subBtn);
        });
        
        subcategorySection.classList.remove('hidden');
    } else {
        subcategoriesContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full">No subcategories defined.</p>`;
        subcategorySection.classList.remove('hidden');
    }
    
    subcategorySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Load Categories (UI Only) ---
function loadCategories(categoryStructure) {
    if (!categoryStructure || categoryStructure.length === 0) return;
    categoryIconsContainer.innerHTML = ''; // Clear placeholder

    categoryStructure.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        const iconClass = cat.icon ? `fas ${cat.icon}` : 'fas fa-leaf';
        btn.innerHTML = `<i class="${iconClass} fa-2x"></i><br><span class="font-semibold">${cat.area}</span>`;

        btn.onclick = () => {
            displaySubcategories(cat);
            
            // Also fetch all videos for the main category
            currentCategory = cat.area;
            currentSubcategory = null;
            currentSearchTerm = null;
            
            // Clear search input
            if (searchInput) {
                searchInput.value = '';
            }
            
            contentTitle.textContent = `All Videos for: ${cat.area}`;
            fetchVideos({ category: currentCategory }, false);
        };
        
        categoryIconsContainer.appendChild(btn);
    });
}

// --- Show Error Message ---
function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorContainer.classList.add('hidden');
    }, 5000);
}

// --- Event Listeners ---

// Search Input Handling
searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const searchTerm = e.target.value.trim();

    debounceTimer = setTimeout(() => {
        currentSearchTerm = searchTerm;
        
        if (searchTerm) {
            // Clear category filters when searching
            currentCategory = null;
            currentSubcategory = null;
            contentTitle.textContent = `Search Results for: "${searchTerm}"`;
            // Hide subcategories when searching
            subcategorySection.classList.add('hidden');
        } else {
            // Show all videos when search is cleared
            contentTitle.textContent = 'All Videos';
        }
        
        fetchVideos({ search: currentSearchTerm }, false); // false = don't append
    }, 500); // Debounce for 500ms
});

// Load More Button Handling
loadMoreBtn?.addEventListener('click', () => {
    if (!isLoading && hasMoreVideos) {
        // Fetch next page using current filters
        fetchVideos({
            category: currentCategory,
            subcategory: currentSubcategory,
            search: currentSearchTerm
        }, true); // true = append results
    }
});

// Video Detail Modal Events
closeDetailBtn?.addEventListener('click', closeVideoDetail);

// Close modal on clicking background overlay
videoDetailModal?.addEventListener('click', (event) => {
    if (event.target === videoDetailModal) {
        closeVideoDetail();
    }
});

// Error close button
errorCloseBtn?.addEventListener('click', () => {
    errorContainer.classList.add('hidden');
});

// --- Keyboard Navigation ---
document.addEventListener('keydown', (e) => {
    // Close modal on Escape key
    if (e.key === 'Escape' && !videoDetailModal.classList.contains('hidden')) {
        closeVideoDetail();
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Interactive video interface initializing...');
    
    // Load category UI buttons
    loadCategories(categoryUIData);
    
    // Fetch initial set of videos (latest or featured)
    fetchVideos({}, false);
    
    console.log('Interactive video interface initialized.');
});

      
