// /public/js/dashboard-apr21.arc.js


import { initLatticeSession, verifySession, refreshSession } from './lattice-auth.js'; // Assuming these exist
import { getCurrentUser, checkAccess, signOut, updateUserProfile, changePassword } from './supabase-auth.js'; // Assuming extensions to supabase-auth
import { showMessage, formatDate, formatTime, debounce } from './shared-utils.js'; // Assuming debounce exists
import { loadCategories, getCategories } from './category-manager.js'; // Assuming getCategories exists
// import { applyTranslations } from './dashboard-translations.js'; // If translations need manual application

// --- State Variables ---
let currentUser = null;
let currentLatticeInfo = null;
let currentCategories = [];
let currentLearningPage = 1;
let totalLearningPages = 1;
let currentWorkshopsPage = 1;
let totalWorkshopsPages = 1;
let currentProjectsPage = 1;
let totalProjectsPages = 1;
const ITEMS_PER_PAGE = 9; // Adjust as needed
let currentCalendarDate = new Date();

// --- DOM Elements (Cache common elements) ---
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const profileModal = document.getElementById('profile-modal');
const settingsModal = document.getElementById('settings-modal');
const startProjectModal = document.getElementById('start-project-modal');
const mainContentArea = document.querySelector('.dashboard-main');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Authentication Check
    currentUser = await getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login.html'; // Redirect to login
      return;
    }

    // Initial UI Setup
    displayUserInfo(currentUser);
    // applyTranslations(currentUser.languagePreference || 'en'); // Apply translations if needed

    // Initialize Lattice Session
    currentLatticeInfo = await initLatticeSession();
    displayLatticeInfo(currentLatticeInfo);

    // Role-Based Access Control
    await checkRoleAccess(currentUser);

    // Load Initial Data (Categories first)
    await loadCategories(); // Load categories into category-manager
    currentCategories = getCategories(); // Get them for local use
    populateCategoryFilters(currentCategories);
    populateCategoryTabs(currentCategories);

    // Load data for the default section (Dashboard)
    await loadDashboardData();
    await loadTimeline();
    await loadFeaturedContent(); // Separate function for clarity

    // Set up event listeners
    setupEventListeners();

    // Initialize navigation logic
    initNavigation();

    // Initial load for other sections (optional, can load on demand)
    // await loadLearningResources();
    // await loadWorkshops();
    // await loadProjects();

  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showMessage('dashboard-errors', 'Error initializing dashboard. Please refresh.', 'error');
    // Fallback: hide dynamic content areas, show error message
    document.querySelectorAll('.loading').forEach(el => el.textContent = 'Error loading content.');
  }
});

// --- User & Session Display ---
function displayUserInfo(user) {
  const userName = user.user_metadata?.full_name || user.email || 'User';
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-display-name').textContent = userName;
  // Profile modal fields will be populated when the modal is opened
}

function displayLatticeInfo(latticeInfo) {
    if (!latticeInfo) return;
    document.getElementById('lattice-preview').textContent = `${latticeInfo.sessionId?.substring(0, 8)}...` || 'N/A';
    document.getElementById('session-created').textContent = latticeInfo.timestamp ? formatDate(new Date(latticeInfo.timestamp)) : 'N/A';
}

// --- Role Access Control ---
async function checkRoleAccess(user) {
  try {
    const userRole = user.app_metadata?.roles?.[0] || 'user'; // Adjust based on your Supabase role setup
    document.getElementById('profile-role').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    // Check roles using checkAccess (adjust function name/params if needed)
    const isExpert = userRole === 'expert' || userRole === 'admin'; // Example logic
    const isAdmin = userRole === 'admin';

    document.querySelectorAll('.expert-only').forEach(el => el.classList.toggle('hidden', !isExpert));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));

    if (isExpert) {
        await loadExpertReviewCounts(); // Load counts if expert
    }

    // Hide specific content sections if needed (example)
    // const editorAccess = await checkAccess('editor'); // Assuming checkAccess returns { allowed: boolean }
    // document.getElementById('editor-content')?.classList.toggle('hidden', !editorAccess.allowed);

  } catch (error) {
    console.error('Error checking role access:', error);
     showMessage('dashboard-errors', 'Could not verify user permissions.', 'error');
  }
}

// --- Navigation & Section Handling ---
function initNavigation() {
  const navLinks = document.querySelectorAll('.main-nav .nav-link');
  const sections = document.querySelectorAll('.dashboard-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetSectionId = link.getAttribute('data-section');

      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show target section, hide others
      sections.forEach(section => {
        section.classList.toggle('hidden', section.id !== targetSectionId);
        section.classList.toggle('active', section.id === targetSectionId); // Use 'active' if needed by CSS
      });

      // Update URL hash
      window.location.hash = targetSectionId;

      // Load data for the section if not already loaded (or refresh)
      loadDataForSection(targetSectionId);
    });
  });

    // Handle initial hash or default to dashboard
    const initialHash = window.location.hash.substring(1);
    const initialLink = document.querySelector(`.nav-link[data-section="${initialHash}"]`);
    if (initialLink) {
        initialLink.click(); // Simulate click to activate the section
    } else {
        // Activate dashboard by default if no hash or invalid hash
        document.querySelector('.nav-link[data-section="dashboard"]').classList.add('active');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('active');
    }
}

function navigateToSection(sectionId) {
    const targetLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (targetLink) {
        targetLink.click();
    }
}

// --- Data Loading Functions ---

// Load data based on the currently active section
function loadDataForSection(sectionId) {
  switch (sectionId) {
    case 'dashboard':
      // Already loaded initially, maybe refresh timeline?
      loadTimeline();
      loadFeaturedContent();
      break;
    case 'learning':
      loadLearningResources();
      break;
    case 'workshops':
      loadWorkshopCalendar(); // Load calendar for current month
      loadWorkshops();        // Load list view based on default filter
      break;
    case 'projects':
      loadProjects();
      initProjectMap(); // Initialize or update map data
      break;
    case 'community-development':
      loadCommunityDevelopmentData();
      break;
    case 'community':
      loadCommunityData();
      break;
    case 'expert-tools':
      loadExpertReviewCounts(); // Reload counts
      break;
    // Add cases for other sections if needed
  }
}

async function loadDashboardData() {
  console.log("Loading dashboard stats...");
  try {
    const response = await fetch('/api/dashboard/stats'); // Adjust API endpoint
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const stats = await response.json();

    document.getElementById('available-resources-count').textContent = stats.resourceCount ?? '--';
    document.getElementById('upcoming-workshops-count').textContent = stats.upcomingWorkshops ?? '--';
    document.getElementById('impact-projects-count').textContent = stats.implementedProjects ?? '--';

     // Display category distribution summary
     const resourceCategoriesEl = document.getElementById('resource-categories');
     if (stats.categoryDistribution && Object.keys(stats.categoryDistribution).length > 0) {
         const categoryList = Object.entries(stats.categoryDistribution)
             .sort(([,a], [,b]) => b - a) // Sort by count desc
             .slice(0, 3) // Take top 3
             .map(([category, count]) => `${category} (${count})`)
             .join(', ');
         resourceCategoriesEl.textContent = categoryList + (Object.keys(stats.categoryDistribution).length > 3 ? ', ...' : '');
     } else {
         resourceCategoriesEl.textContent = 'Various categories';
     }

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    document.getElementById('available-resources-count').textContent = 'Error';
    document.getElementById('upcoming-workshops-count').textContent = 'Error';
    document.getElementById('impact-projects-count').textContent = 'Error';
    document.getElementById('resource-categories').textContent = 'Error loading categories';
  }
}

async function loadTimeline() {
  console.log("Loading timeline...");
  const container = document.getElementById('timeline-container');
  container.innerHTML = '<p class="loading">Loading activity...</p>';
  try {
    const response = await fetch('/api/user/timeline'); // Adjust API endpoint
     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const events = await response.json();

    container.innerHTML = ''; // Clear loading message
    if (events && events.length > 0) {
      events.slice(0, 5).forEach(event => { // Limit displayed items
        const item = document.createElement('div');
        item.className = `timeline-item ${event.type || 'general'}`; // Use type for styling
        item.innerHTML = `
          <div class="timeline-date">${formatDate(event.timestamp)} ${formatTime(event.timestamp)}</div>
          <div class="timeline-content">
            <div class="timeline-title">${event.title || 'Activity'}</div>
            <div class="timeline-description">${event.description || ''}</div>
          </div>
        `;
        container.appendChild(item);
      });
    } else {
      container.innerHTML = '<p>No recent activity.</p>';
    }
  } catch (error) {
    console.error('Error loading timeline:', error);
    container.innerHTML = '<p class="error-message">Could not load activity timeline.</p>';
  }
}

async function loadFeaturedContent() {
    console.log("Loading featured content...");
    const container = document.getElementById('featured-content');
    container.innerHTML = '<div class="loading">Loading featured content...</div>';
    try {
        const response = await fetch('/api/content/featured?limit=3'); // Adjust API endpoint, add limit
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const featured = await response.json();

        container.innerHTML = ''; // Clear loading
        if (featured && featured.length > 0) {
            featured.forEach(content => container.appendChild(createContentCard(content)));
        } else {
            container.innerHTML = '<div class="no-content">No featured content available right now.</div>';
        }
    } catch (error) {
        console.error('Error loading featured content:', error);
        container.innerHTML = '<div class="error-message">Could not load featured content.</div>';
    }
}

async function loadLearningResources(page = 1) {
    console.log(`Loading learning resources page ${page}...`);
    const container = document.getElementById('resources-grid');
    container.innerHTML = '<div class="loading">Loading resources...</div>';
    currentLearningPage = page;

    // Get filter values
    const searchTerm = document.getElementById('content-search').value;
    const category = document.getElementById('content-category-filter').value;
    const type = document.getElementById('content-type-filter').value;
    const activeCategoryTab = document.querySelector('#category-tabs .category-tab.active')?.dataset.category || 'all';

    // Construct API query parameters
    const params = new URLSearchParams({
        page: currentLearningPage,
        limit: ITEMS_PER_PAGE,
    });
    if (searchTerm) params.append('search', searchTerm);
    if (category !== 'all') params.append('category', category);
    if (type !== 'all') params.append('type', type);
    if (activeCategoryTab !== 'all') params.append('category', activeCategoryTab); // Tab overrides dropdown if set

    try {
        const response = await fetch(`/api/content?${params.toString()}`); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json(); // Expect { items: [], totalItems: number }

        container.innerHTML = ''; // Clear loading
        if (data.items && data.items.length > 0) {
            data.items.forEach(resource => container.appendChild(createResourceCard(resource)));
        } else {
            container.innerHTML = '<div class="no-content">No resources found matching your criteria.</div>';
        }

        // Update pagination
        totalLearningPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
        updatePagination('resources', currentLearningPage, totalLearningPages);

    } catch (error) {
        console.error('Error loading learning resources:', error);
        container.innerHTML = '<div class="error-message">Could not load resources.</div>';
        updatePagination('resources', 1, 1); // Reset pagination on error
    }
}


async function loadWorkshops(page = 1) {
    console.log(`Loading workshops page ${page}...`);
    const listContainer = document.getElementById('workshops-list');
    listContainer.innerHTML = '<div class="loading">Loading workshops...</div>';
    currentWorkshopsPage = page;

    // Get filter values
    const searchTerm = document.getElementById('workshop-search').value;
    const category = document.getElementById('workshop-category-filter').value;
    const timeFilter = document.getElementById('workshop-time-filter').value; // 'upcoming', 'past', 'registered'

    // Construct API query parameters
    const params = new URLSearchParams({
        page: currentWorkshopsPage,
        limit: ITEMS_PER_PAGE,
        time: timeFilter, // Pass time filter to API
    });
    if (searchTerm) params.append('search', searchTerm);
    if (category !== 'all') params.append('category', category);

    try {
        const response = await fetch(`/api/workshops?${params.toString()}`); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json(); // Expect { items: [], totalItems: number }

        listContainer.innerHTML = ''; // Clear loading
        if (data.items && data.items.length > 0) {
            data.items.forEach(workshop => listContainer.appendChild(createWorkshopCard(workshop)));
        } else {
             let message = 'No workshops found.';
             if (timeFilter === 'upcoming') message = 'No upcoming workshops scheduled.';
             else if (timeFilter === 'past') message = 'No past workshops found.';
             else if (timeFilter === 'registered') message = 'You are not registered for any workshops.';
            listContainer.innerHTML = `<div class="no-content">${message}</div>`;
        }

        // Update pagination
        totalWorkshopsPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
        updatePagination('workshops', currentWorkshopsPage, totalWorkshopsPages);
        document.getElementById('workshops-list-title').textContent = `${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)} Workshops`;


    } catch (error) {
        console.error('Error loading workshops:', error);
        listContainer.innerHTML = '<div class="error-message">Could not load workshops.</div>';
        updatePagination('workshops', 1, 1); // Reset pagination
    }
}

async function loadWorkshopCalendar() {
    console.log("Loading workshop calendar for:", currentCalendarDate);
    const calendarContainer = document.getElementById('workshop-calendar');
    calendarContainer.innerHTML = '<div class="loading">Loading calendar...</div>';
    document.getElementById('current-month-year').textContent =
        currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    try {
        // Fetch workshops for the current month (+/- buffer if needed)
        const response = await fetch(`/api/workshops/calendar?year=${year}&month=${month + 1}`); // Pass year/month
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const eventsByDate = await response.json(); // Expect format like: { "2025-04-20": [{id: 1, title: "Workshop A"}], ... }

        calendarContainer.innerHTML = ''; // Clear loading
        renderCalendarGrid(year, month, eventsByDate);

    } catch (error) {
        console.error('Error loading workshop calendar data:', error);
        calendarContainer.innerHTML = '<div class="error-message">Could not load calendar events.</div>';
    }
}

async function loadProjects(page = 1) {
    console.log(`Loading projects page ${page}...`);
    const container = document.getElementById('project-cards');
    container.innerHTML = '<div class="loading">Loading projects...</div>';
    currentProjectsPage = page;

    // Get filter values
    const searchTerm = document.getElementById('project-search').value;
    const category = document.getElementById('project-category-filter').value;
    const region = document.getElementById('project-region-filter').value;
    const status = document.getElementById('project-status-filter').value;


    // Construct API query parameters
    const params = new URLSearchParams({
        page: currentProjectsPage,
        limit: ITEMS_PER_PAGE,
    });
    if (searchTerm) params.append('search', searchTerm);
    if (category !== 'all') params.append('category', category);
    if (region !== 'all') params.append('region', region);
    if (status !== 'all') params.append('status', status);


    try {
        const response = await fetch(`/api/projects?${params.toString()}`); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json(); // Expect { items: [], totalItems: number }

        container.innerHTML = ''; // Clear loading
        if (data.items && data.items.length > 0) {
            data.items.forEach(project => container.appendChild(createProjectCard(project)));
        } else {
            container.innerHTML = '<div class="no-content">No projects found matching your criteria.</div>';
        }

        // Update pagination
        totalProjectsPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
        updatePagination('projects', currentProjectsPage, totalProjectsPages);

    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<div class="error-message">Could not load projects.</div>';
        updatePagination('projects', 1, 1); // Reset pagination
    }
}


async function viewProcessDetails(processId) {
  openModal('view-process-modal');
  const detailContainer = document.getElementById('process-detail-content');
  detailContainer.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const res = await fetch(`/api/community-development/process/${processId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const proc = await res.json();

    detailContainer.innerHTML = `
      <h3>${proc.title}</h3>
      <p>${proc.description}</p>
      <p>Status: ${proc.status}</p>
      <p>Timeframe: ${proc.timeframe}</p>
      <!-- add more details here -->
    `;
  } catch (error) {
    console.error('Error loading details:', error);
    detailContainer.innerHTML = '<div class="error-message">Could not load details.</div>';
  }
}


function initProjectMap() {
    console.log("Initializing project map...");
    const mapContainer = document.getElementById('projects-map');
    // Placeholder: Requires a mapping library (e.g., Leaflet.js)
    // 1. Check if library is loaded
    // 2. Initialize map on mapContainer
    // 3. Fetch project location data (e.g., /api/projects/locations)
    // 4. Add markers to the map based on fetched data
    // 5. Handle map interactions (zoom, pan, marker clicks)
    mapContainer.innerHTML = `<div class="placeholder-map">
        Map functionality requires integration with a library like Leaflet.js.
        <br>(Fetching data from /api/projects/locations)
        </div>`;

    // Example fetch (adapt to your API)
    /*
    fetch('/api/projects/locations')
        .then(response => response.json())
        .then(locations => {
            // Use locations array [{lat: ..., lng: ..., title: ...}] to add markers
            console.log("Project locations received:", locations);
            // Add Leaflet marker creation logic here
        })
        .catch(error => console.error('Error loading map locations:', error));
    */
}

async function loadCommunityData() {
    console.log("Loading community data...");
    await loadCommunityExperts();
    await loadCommunityDiscussions();
    await loadCommunityImpactStories();
}

async function loadCommunityExperts() {
    const container = document.getElementById('experts-list');
    container.innerHTML = '<div class="loading">Loading experts...</div>';
    try {
        const response = await fetch('/api/community/experts?limit=5'); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const experts = await response.json();
        container.innerHTML = '';
        if (experts && experts.length > 0) {
            experts.forEach(expert => {
                const item = document.createElement('div');
                item.className = 'expert-item'; // Add styling for this class
                item.innerHTML = `
                    <div class="expert-name">${expert.name}</div>
                    <div class="expert-areas">${expert.expertise.join(', ')}</div>
                    <a href="/profile/${expert.id}" class="small-btn">View Profile</a>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p>No experts listed currently.</p>';
        }
    } catch (error) {
        console.error('Error loading experts:', error);
        container.innerHTML = '<p class="error-message">Could not load experts.</p>';
    }
}


async function loadCommunityDevelopmentData() {
  console.log("Loading community development data...");
  await Promise.all([
    loadDevelopmentPathways(),
    loadActiveProcesses(),
    loadUpcomingMilestones()
  ]);
}

async function loadDevelopmentPathways() {
  const container = document.getElementById('pathway-visualization');
  container.innerHTML = '<div class="loading">Loading pathways...</div>';
  
  try {
    const res = await fetch('/api/community-development/pathways');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const pathways = await res.json();
    container.innerHTML = '';

    pathways.forEach(path => {
      const div = document.createElement('div');
      div.className = `pathway-item ${path.status}`;
      div.innerHTML = `
        <h4>${path.title}</h4>
        <p>${path.description}</p>
        <span class="pathway-timeframe">${path.timeframe}</span>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error loading pathways:', error);
    container.innerHTML = '<div class="error-message">Could not load pathways.</div>';
  }
}

async function loadActiveProcesses() {
  const container = document.getElementById('process-list');
  container.innerHTML = '<div class="loading">Loading active processes...</div>';
  
  try {
    const res = await fetch('/api/community-development/active-processes');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const processes = await res.json();
    container.innerHTML = '';

    processes.forEach(proc => {
      const div = document.createElement('div');
      div.className = 'process-item';
      div.innerHTML = `
        <h4>${proc.title}</h4>
        <p>${proc.community}</p>
        <p>${proc.status} - ${proc.timeframe}</p>
        <button class="small-btn" onclick="viewProcessDetails('${proc.id}')">View Details</button>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error loading processes:', error);
    container.innerHTML = '<div class="error-message">Could not load processes.</div>';
  }
}

async function loadUpcomingMilestones() {
  const container = document.getElementById('milestone-list');
  container.innerHTML = '<div class="loading">Loading milestones...</div>';
  
  try {
    const res = await fetch('/api/community-development/milestones?upcoming=true');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const milestones = await res.json();
    container.innerHTML = '';

    milestones.forEach(ms => {
      const div = document.createElement('div');
      div.className = 'milestone-item';
      div.innerHTML = `
        <div>${ms.title}</div>
        <div>${formatDate(ms.date)}</div>
        <div>${ms.processTitle}</div>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error loading milestones:', error);
    container.innerHTML = '<div class="error-message">Could not load milestones.</div>';
  }
}

async function loadCommunityDiscussions() {
    const container = document.getElementById('discussions-list');
    container.innerHTML = '<div class="loading">Loading discussions...</div>';
     try {
        const response = await fetch('/api/community/discussions?limit=5'); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const discussions = await response.json();
        container.innerHTML = '';
        if (discussions && discussions.length > 0) {
            discussions.forEach(disc => {
                const item = document.createElement('div');
                item.className = 'discussion-item'; // Add styling
                item.innerHTML = `
                    <div class="discussion-title">${disc.title}</div>
                    <div class="discussion-meta">By ${disc.author} on ${formatDate(disc.createdAt)} | ${disc.replies} replies</div>
                    <a href="/discussion/${disc.id}" class="small-btn">View</a>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p>No active discussions.</p>';
        }
    } catch (error) {
        console.error('Error loading discussions:', error);
        container.innerHTML = '<p class="error-message">Could not load discussions.</p>';
    }
}

async function loadCommunityImpactStories() {
    const container = document.getElementById('impact-stories-list');
    container.innerHTML = '<div class="loading">Loading stories...</div>';
     try {
        const response = await fetch('/api/community/stories?limit=5'); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const stories = await response.json();
        container.innerHTML = '';
        if (stories && stories.length > 0) {
            stories.forEach(story => {
                const item = document.createElement('div');
                item.className = 'story-item'; // Add styling
                item.innerHTML = `
                    <div class="story-title">${story.title}</div>
                     <div class="story-meta">By ${story.author} | Location: ${story.location}</div>
                    <a href="/story/${story.id}" class="small-btn">Read More</a>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p>No impact stories shared yet.</p>';
        }
    } catch (error) {
        console.error('Error loading impact stories:', error);
        container.innerHTML = '<p class="error-message">Could not load stories.</p>';
    }
}

async function loadExpertReviewCounts() {
    console.log("Loading expert review counts...");
     try {
        const response = await fetch('/api/expert/review-counts'); // Adjust API endpoint
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const counts = await response.json(); // Expect { content: number, stories: number, ... }
        document.getElementById('content-reviews-count').textContent = counts.content ?? 0;
        document.getElementById('story-reviews-count').textContent = counts.stories ?? 0;
        // Update other counts if they exist
    } catch (error) {
        console.error('Error loading review counts:', error);
         document.getElementById('content-reviews-count').textContent = '?';
        document.getElementById('story-reviews-count').textContent = '?';
    }
}

// --- Category & Filter Population ---
function populateCategoryFilters(categories) {
    const filters = [
        document.getElementById('content-category-filter'),
        document.getElementById('workshop-category-filter'),
        document.getElementById('project-category-filter'),
        document.getElementById('project-category') // In the modal
    ];
    filters.forEach(filter => {
        if (!filter) return;
        // Clear existing options except the 'All' or 'Select' option
        filter.innerHTML = `<option value="${filter.id === 'project-category' ? '' : 'all'}">${filter.id === 'project-category' ? 'Select a category' : 'All Categories'}</option>`;
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id; // Use category ID as value
            option.textContent = cat.name;
            filter.appendChild(option);
        });
    });
}

function populateCategoryTabs(categories) {
    const tabsContainer = document.getElementById('category-tabs');
    // Clear existing tabs except 'All'
    tabsContainer.querySelectorAll('.category-tab:not([data-category="all"])').forEach(tab => tab.remove());
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = 'category-tab';
        button.dataset.category = cat.id; // Use category ID
        button.textContent = cat.name;
        tabsContainer.appendChild(button);
    });
}

// --- UI Element Creation ---
function createContentCard(content) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `
        <div class="content-type-badge ${content.type?.toLowerCase() || 'general'}">${content.type || 'Resource'}</div>
        <h4>${content.title || 'Untitled Resource'}</h4>
        <div class="content-meta">
            <span class="category-tag">${content.category?.name || 'Uncategorized'}</span>
            <span class="views-count">${content.views ?? 0} views</span>
            </div>
        <p>${content.description ? (content.description.substring(0, 100) + (content.description.length > 100 ? '...' : '')) : 'No description available.'}</p>
        <a href="/content/${content.id}" class="content-link">View Content</a>
    `;
    return card;
}

function createResourceCard(resource) {
    // Can be the same as content card or have specific resource fields
    const card = document.createElement('div');
    card.className = 'resource-card'; // Use different class if styling differs significantly
    card.innerHTML = `
        <div class="resource-type-badge ${resource.type?.toLowerCase() || 'general'}">${resource.type || 'Resource'}</div>
         <h4>${resource.title || 'Untitled Resource'}</h4>
        <div class="resource-meta">
            <span class="category-tag">${resource.category?.name || 'Uncategorized'}</span>
             <span class="author">By: ${resource.author?.name || 'Unknown'}</span>
             <span>${formatDate(resource.published_at || resource.created_at)}</span>
        </div>
        <p>${resource.description ? (resource.description.substring(0, 120) + (resource.description.length > 120 ? '...' : '')) : ''}</p>
        <a href="/resource/${resource.id}" class="primary-btn small-btn">Learn More</a> `;
     return card;
}

function createWorkshopCard(workshop) {
    const card = document.createElement('div');
    card.className = 'workshop-card';
    card.innerHTML = `
        <div class="workshop-date">${formatDate(workshop.start_time)} at ${formatTime(workshop.start_time)}</div>
        <h4 class="workshop-title">${workshop.title || 'Untitled Workshop'}</h4>
        <div class="workshop-meta">
            <span>Category: ${workshop.category?.name || 'General'}</span>
            <span>Led by: ${workshop.instructor?.name || 'Expert'}</span>
            <span>${workshop.status || ''}</span>
        </div>
        <p class="workshop-description">${workshop.description ? (workshop.description.substring(0, 100) + (workshop.description.length > 100 ? '...' : '')) : ''}</p>
        <div class="workshop-actions">
            <button class="primary-btn small-btn register-workshop-btn" data-workshop-id="${workshop.id}" ${workshop.status !== 'upcoming' ? 'disabled' : ''}>Register</button>
            <a href="/workshop/${workshop.id}" class="secondary-btn small-btn">Details</a>
        </div>
    `;
     // Add logic to handle registration status (e.g., change button text if already registered)
     // Example: Check if currentUser.registeredWorkshops includes workshop.id
    return card;
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    const progress = project.progress ?? 0;
    card.innerHTML = `
        <div class="project-header">
             <h4>${project.title || 'Untitled Project'}</h4>
             <div class="project-location">
                <svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                ${project.location || 'Not specified'}
             </div>
        </div>
        <div class="project-meta">
            <span>Category: ${project.category?.name || 'General'}</span>
            <span>Status: ${project.status || 'Unknown'}</span>
             <span>Region: ${project.region || 'Global'}</span>
        </div>
         <div class="project-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${progress}% Complete</div>
        </div>
        <p class="project-description">${project.description ? (project.description.substring(0, 100) + (project.description.length > 100 ? '...' : '')) : ''}</p>
        <div class="project-actions">
            <a href="/project/${project.id}" class="secondary-btn small-btn">View Details</a>
        </div>
    `;
    return card;
}

// --- Calendar Rendering ---
function renderCalendarGrid(year, month, eventsByDate) {
    const calendarContainer = document.getElementById('workshop-calendar');
    calendarContainer.innerHTML = ''; // Clear previous grid

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        calendarContainer.appendChild(emptyCell);
    }

    // Add cells for each day of the month
    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        const currentDate = new Date(year, month, day);
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (dateString === todayDateString) {
            dayCell.classList.add('today');
        }

        dayCell.innerHTML = `<span class="day-number">${day}</span>`;

        // Check if there are events for this date
        if (eventsByDate && eventsByDate[dateString]) {
             eventsByDate[dateString].forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = 'day-event';
                eventEl.textContent = event.title;
                eventEl.title = event.title; // Tooltip
                eventEl.dataset.eventId = event.id;
                // Add click listener to show event details if needed
                // eventEl.addEventListener('click', () => showWorkshopDetails(event.id));
                dayCell.appendChild(eventEl);
             });
        }

        calendarContainer.appendChild(dayCell);
    }

     // Add empty cells for the end of the grid if needed
     const totalCells = startingDayOfWeek + daysInMonth;
     const remainingCells = (7 - (totalCells % 7)) % 7;
      for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day other-month';
        calendarContainer.appendChild(emptyCell);
    }
}


// --- Pagination ---
function updatePagination(type, currentPage, totalPages) {
  const prevBtn = document.getElementById(`prev-${type}`);
  const nextBtn = document.getElementById(`next-${type}`);
  const pageInfo = document.getElementById(`${type}-page-info`);

  if (!prevBtn || !nextBtn || !pageInfo) return; // Elements not found

  pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

function handlePaginationClick(type, direction) {
  if (type === 'resources') {
    const nextPage = direction === 'next' ? currentLearningPage + 1 : currentLearningPage - 1;
    if (nextPage >= 1 && nextPage <= totalLearningPages) {
      loadLearningResources(nextPage);
    }
  } else if (type === 'workshops') {
     const nextPage = direction === 'next' ? currentWorkshopsPage + 1 : currentWorkshopsPage - 1;
     if (nextPage >= 1 && nextPage <= totalWorkshopsPages) {
       loadWorkshops(nextPage);
     }
  } else if (type === 'projects') {
     const nextPage = direction === 'next' ? currentProjectsPage + 1 : currentProjectsPage - 1;
     if (nextPage >= 1 && nextPage <= totalProjectsPages) {
       loadProjects(nextPage);
     }
  }
  // Add cases for other paginated types if needed
}

// --- Modal Handling ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Optionally load data for the modal here
        if (modalId === 'profile-modal') loadProfileData();
        if (modalId === 'start-project-modal') resetProjectForm(); // Ensure form is clear
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        // Clear any messages within the modal
         const messageContainer = modal.querySelector('.message');
         if (messageContainer) {
            messageContainer.textContent = '';
            messageContainer.className = 'message'; // Reset class
         }
    }
}

async function loadProfileData() {
    console.log("Loading profile data for modal...");
     if (!currentUser) return;

     document.getElementById('profile-name-display').textContent = currentUser.user_metadata?.full_name || '';
     document.getElementById('profile-name-input').value = currentUser.user_metadata?.full_name || '';
     document.getElementById('profile-email').textContent = currentUser.email; // Display, not editable usually
     document.getElementById('profile-role').textContent = currentUser.app_metadata?.roles?.[0] || 'user';

     // Load preferences (assuming they are stored in user metadata or a separate profile table)
     document.getElementById('language-preference').value = currentUser.user_metadata?.language || 'en';
     document.getElementById('notifications-preference').checked = currentUser.user_metadata?.email_notifications !== false; // Default to true

     // Load areas of interest/expertise
     const expertiseContainer = document.getElementById('expertise-areas');
     expertiseContainer.innerHTML = '<p class="loading">Loading areas...</p>';
     try {
        // Fetch user's current interests AND all available interests/categories
        // Example: Combine calls or have an endpoint that returns both
        const allAreas = currentCategories; // Use loaded categories as example
        const userInterestsResponse = await fetch('/api/user/profile'); // Endpoint to get full profile
        const userProfile = await userInterestsResponse.json();
        const userInterestIds = userProfile.interested_category_ids || []; // Assuming profile has this

        expertiseContainer.innerHTML = ''; // Clear loading
        if (allAreas && allAreas.length > 0) {
             allAreas.forEach(area => {
                const div = document.createElement('div');
                div.className = 'expertise-checkbox';
                div.innerHTML = `
                    <input type="checkbox" id="interest-${area.id}" name="interests" value="${area.id}" ${userInterestIds.includes(area.id) ? 'checked' : ''}>
                    <label for="interest-${area.id}">${area.name}</label>
                `;
                expertiseContainer.appendChild(div);
             });
        } else {
             expertiseContainer.innerHTML = '<p>No areas available.</p>';
        }

     } catch (error) {
         console.error("Error loading profile expertise:", error);
         expertiseContainer.innerHTML = '<p class="error-message">Could not load areas of interest.</p>';
     }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const saveButton = document.getElementById('save-profile-btn');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showMessage('profile-message-container', '', 'info'); // Clear previous messages

    const fullName = document.getElementById('profile-name-input').value;
    const language = document.getElementById('language-preference').value;
    const notifications = document.getElementById('notifications-preference').checked;
    const selectedInterestIds = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);

    const profileUpdates = {
        data: { // For user_metadata
            full_name: fullName,
            language: language,
            email_notifications: notifications
        },
        // Add other fields if updating a separate profile table
        interested_category_ids: selectedInterestIds
    };

    try {
        // Use the imported Supabase function
        const { data, error } = await updateUserProfile(profileUpdates); // Pass updates object

        if (error) {
            throw new Error(error.message);
        }

        // Update local currentUser object if possible (or refetch)
        currentUser.user_metadata.full_name = fullName;
        currentUser.user_metadata.language = language;
        currentUser.user_metadata.email_notifications = notifications;
        // Update display names outside modal too
        displayUserInfo(currentUser);

        showMessage('profile-message-container', 'Profile updated successfully!', 'success');
        // Optionally close modal after a delay
        setTimeout(() => closeModal('profile-modal'), 1500);

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('profile-message-container', `Error: ${error.message}`, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
        // Reset edit state for name
        document.getElementById('profile-name-display').textContent = fullName;
        document.getElementById('profile-name-display').classList.remove('hidden');
        document.getElementById('profile-name-input').classList.add('hidden');
    }
}

async function handleProjectSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = document.getElementById('submit-project-btn');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
     showMessage('project-form-message-container', '', 'info'); // Clear previous messages

    const formData = new FormData(form);
    const projectData = Object.fromEntries(formData.entries());

    // Add user ID or other required fields
    projectData.user_id = currentUser.id;

    console.log("Submitting project:", projectData);

    try {
        const response = await fetch('/api/projects', { // Your create project endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 // Add Authorization header if needed (e.g., 'Authorization': `Bearer ${accessToken}`)
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to submit project.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const newProject = await response.json();
        showMessage('project-form-message-container', 'Project submitted successfully!', 'success');
        form.reset(); // Clear the form
         // Optionally close modal after a delay
        setTimeout(() => closeModal('start-project-modal'), 1500);
        // Refresh the projects list
        loadProjects();
         // Switch to projects section?
         // navigateToSection('projects');

    } catch (error) {
         console.error('Error submitting project:', error);
         showMessage('project-form-message-container', `Error: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Project';
    }
}


function addMilestoneRow() {
  const container = document.getElementById('milestones-container');
  const milestoneRow = document.createElement('div');
  milestoneRow.className = 'milestone-row';
  milestoneRow.innerHTML = `
    <div class="form-group">
      <label>Title:</label>
      <input type="text" class="milestone-title" required>
    </div>
    <div class="form-group">
      <label>Target Date:</label>
      <input type="date" class="milestone-date" required>
    </div>
    <div class="form-group">
      <label>Description:</label>
      <input type="text" class="milestone-description" required>
    </div>
    <button type="button" class="remove-milestone-btn">Remove</button>
  `;
  container.appendChild(milestoneRow);
}


async function handleCreateProcessSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('save-process-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const process = {
    title: document.getElementById('process-title').value,
    community: document.getElementById('process-community').value,
    category: document.getElementById('process-category').value,
    timeframe: document.getElementById('process-timeframe').value,
    description: document.getElementById('process-description').value,
    stakeholders: document.getElementById('process-stakeholders').value,
    resources: document.getElementById('process-resources').value,
    indicators: document.getElementById('process-indicators').value,
    milestones: Array.from(document.querySelectorAll('.milestone-row')).map(row => ({
      title: row.querySelector('.milestone-title').value,
      date: row.querySelector('.milestone-date').value,
      description: row.querySelector('.milestone-description').value
    }))
  };

  try {
    const res = await fetch('/api/community-development/create-process', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(process)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    showMessage('dashboard-errors', 'Process created successfully!', 'success');
    closeModal('create-process-modal');
    loadActiveProcesses();

  } catch (error) {
    console.error('Error creating process:', error);
    showMessage('dashboard-errors', 'Failed to create process.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Process';
  }
}


function resetProjectForm() {
    const form = document.getElementById('project-form');
    if (form) form.reset();
     showMessage('project-form-message-container', '', 'info'); // Clear messages
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // User Menu
  userMenuBtn.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
  });
  // Close dropdown if clicked outside
  document.addEventListener('click', (event) => {
    if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
      userDropdown.classList.add('hidden');
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut();
        window.location.href = '/login.html'; // Redirect after logout
    } catch (error) {
        console.error('Logout failed:', error);
        showMessage('dashboard-errors', 'Logout failed. Please try again.', 'error');
    }
  });

  // Session Verification
  document.getElementById('verify-session-btn').addEventListener('click', async () => {
     showMessage('dashboard-errors', 'Verifying session...', 'info');
    try {
        const isValid = await verifySession(); // Assuming verifySession returns boolean or throws
        showMessage('dashboard-errors', `Session is ${isValid ? 'valid' : 'invalid'}.`, isValid ? 'success' : 'error');
        document.getElementById('session-status').textContent = isValid ? 'Verified Secure' : 'Verification Failed';
         document.getElementById('session-status').className = isValid ? 'secure-badge' : 'insecure-badge'; // Add insecure styling
    } catch (error) {
        console.error('Session verification error:', error);
        showMessage('dashboard-errors', `Verification error: ${error.message}`, 'error');
         document.getElementById('session-status').textContent = 'Verification Error';
          document.getElementById('session-status').className = 'insecure-badge';
    }
  });

   // Dashboard Action Buttons (Navigate)
   document.getElementById('explore-content-btn').addEventListener('click', () => navigateToSection('learning'));
   document.getElementById('find-workshops-btn').addEventListener('click', () => navigateToSection('workshops'));
   document.getElementById('view-workshops-btn').addEventListener('click', () => navigateToSection('workshops'));
   document.getElementById('view-all-content').addEventListener('click', () => navigateToSection('learning'));


  // Modal Triggers
  document.getElementById('profile-link').addEventListener('click', (e) => { e.preventDefault(); openModal('profile-modal'); });
  document.getElementById('settings-link').addEventListener('click', (e) => { e.preventDefault(); openModal('settings-modal'); });
  document.getElementById('start-project-btn').addEventListener('click', () => openModal('start-project-modal'));

  // Modal Close Buttons
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modalId || btn.closest('.modal')?.id;
      if (modalId) closeModal(modalId);
    });
  });
   // Close modal on background click
   document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Check if the click is directly on the modal background
                closeModal(modal.id);
            }
        });
    });

  // Profile Modal Edit Button
  profileModal.addEventListener('click', (event) => {
      if (event.target.classList.contains('edit-btn') && event.target.dataset.field === 'name') {
          document.getElementById('profile-name-display').classList.add('hidden');
          document.getElementById('profile-name-input').classList.remove('hidden');
          document.getElementById('profile-name-input').focus();
      }
  });

  // Profile Form Submit
  document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);


  // Settings Modal Actions
  document.getElementById('change-password-btn').addEventListener('click', () => {
      // Implement change password flow (likely opens another dedicated modal/form)
      alert('Change Password functionality not yet implemented.');
      // Example: openModal('change-password-modal');
  });
   document.getElementById('download-data-btn').addEventListener('click', async () => {
       showMessage('settings-message-container', 'Preparing your data download...', 'info');
       try {
           const response = await fetch('/api/user/data-export'); // Adjust endpoint
           if (!response.ok) throw new Error('Could not start data export.');
           const blob = await response.blob();
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.style.display = 'none';
           a.href = url;
           a.download = `user_data_${currentUser.id}.zip`; // Or appropriate format
           document.body.appendChild(a);
           a.click();
           window.URL.revokeObjectURL(url);
           a.remove();
            showMessage('settings-message-container', 'Data download initiated.', 'success');
       } catch (error) {
           console.error("Data download error:", error);
           showMessage('settings-message-container', `Error downloading data: ${error.message}`, 'error');
       }
  });
   document.getElementById('delete-account-btn').addEventListener('click', () => {
       // Implement delete account flow (REQUIRES VERY CAREFUL CONFIRMATION)
       if (confirm('ARE YOU ABSOLUTELY SURE? This action cannot be undone and will permanently delete your account and all associated data.')) {
           if (prompt('Type DELETE to confirm account deletion:') === 'DELETE') {
               // Proceed with deletion API call
               alert('Account deletion functionality not yet implemented.');
               // fetch('/api/user/delete', { method: 'DELETE', ... })
           } else {
               showMessage('settings-message-container', 'Account deletion cancelled.', 'info');
           }
       }
  });
   document.getElementById('invalidate-sessions-btn').addEventListener('click', async () => {
       showMessage('settings-message-container', 'Invalidating other sessions...', 'info');
        try {
            // Assumes a Supabase or backend function exists
            const response = await fetch('/api/auth/invalidate-others', { method: 'POST' });
             if (!response.ok) throw new Error('Failed to invalidate sessions.');
            showMessage('settings-message-container', 'All other sessions invalidated successfully.', 'success');
        } catch (error) {
             console.error("Session invalidation error:", error);
             showMessage('settings-message-container', `Error: ${error.message}`, 'error');
        }
   });
    document.getElementById('refresh-session-btn').addEventListener('click', async () => {
        showMessage('settings-message-container', 'Refreshing session...', 'info');
        try {
            currentLatticeInfo = await refreshSession(); // Use imported function
            displayLatticeInfo(currentLatticeInfo);
            showMessage('settings-message-container', 'Session refreshed successfully.', 'success');
        } catch (error) {
            console.error("Session refresh error:", error);
            showMessage('settings-message-container', `Error refreshing session: ${error.message}`, 'error');
        }
    });
     document.getElementById('security-audit-btn').addEventListener('click', () => {
        // Link to or display security logs
        alert('Security Audit Log viewer not yet implemented.');
        // Example: window.location.href = '/security-log';
    });


    document.getElementById('create-process-btn').addEventListener('click', () => {
      openModal('create-process-modal');
    });
  
    document.getElementById('process-form').addEventListener('submit', handleCreateProcessSubmit);
  
    document.getElementById('add-milestone-btn').addEventListener('click', addMilestoneRow);
  
    document.getElementById('milestones-container').addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-milestone-btn')) {
        e.target.closest('.milestone-row').remove();
      }
    });
  
    document.getElementById('process-search').addEventListener('input', debounce(loadActiveProcesses, 300));
    
    document.getElementById('process-category-filter').addEventListener('change', loadActiveProcesses);
    document.getElementById('process-timeframe-filter').addEventListener('change', loadActiveProcesses);
    document.getElementById('process-status-filter').addEventListener('change', loadActiveProcesses);
  
    // Milestone filters
    document.querySelectorAll('.milestone-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.milestone-filter').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadUpcomingMilestones(); // optionally pass filter type
      });
    });
  }


  // Project Form Submit
  document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);

  // --- Filter/Search Event Listeners ---
  const debouncedLoadLearning = debounce(loadLearningResources, 300);
  document.getElementById('content-search').addEventListener('input', debouncedLoadLearning);
  document.getElementById('content-category-filter').addEventListener('change', () => loadLearningResources(1));
  document.getElementById('content-type-filter').addEventListener('change', () => loadLearningResources(1));
   // Category Tabs Listener
    document.getElementById('category-tabs').addEventListener('click', (event) => {
        if (event.target.classList.contains('category-tab')) {
            document.querySelectorAll('#category-tabs .category-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            // Optionally reset dropdown filter when tab is clicked
            // document.getElementById('content-category-filter').value = 'all';
            loadLearningResources(1); // Reload resources based on active tab
        }
    });

  const debouncedLoadWorkshops = debounce(loadWorkshops, 300);
  document.getElementById('workshop-search').addEventListener('input', debouncedLoadWorkshops);
  document.getElementById('workshop-category-filter').addEventListener('change', () => loadWorkshops(1));
  document.getElementById('workshop-time-filter').addEventListener('change', () => loadWorkshops(1));

   // Calendar Navigation
   document.getElementById('prev-month').addEventListener('click', () => {
       currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
       loadWorkshopCalendar();
   });
   document.getElementById('next-month').addEventListener('click', () => {
       currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
       loadWorkshopCalendar();
   });


  const debouncedLoadProjects = debounce(loadProjects, 300);
  document.getElementById('project-search').addEventListener('input', debouncedLoadProjects);
  document.getElementById('project-category-filter').addEventListener('change', () => loadProjects(1));
  document.getElementById('project-region-filter').addEventListener('change', () => loadProjects(1));
  document.getElementById('project-status-filter').addEventListener('change', () => loadProjects(1));


  // --- Pagination Button Listeners ---
  document.getElementById('prev-resources').addEventListener('click', () => handlePaginationClick('resources', 'prev'));
  document.getElementById('next-resources').addEventListener('click', () => handlePaginationClick('resources', 'next'));
  document.getElementById('prev-workshops').addEventListener('click', () => handlePaginationClick('workshops', 'prev'));
  document.getElementById('next-workshops').addEventListener('click', () => handlePaginationClick('workshops', 'next'));
  document.getElementById('prev-projects').addEventListener('click', () => handlePaginationClick('projects', 'prev'));
  document.getElementById('next-projects').addEventListener('click', () => handlePaginationClick('projects', 'next'));

  // --- Dynamic Content Listeners (using event delegation) ---
  mainContentArea.addEventListener('click', (event) => {
      // Workshop Registration Button
       if (event.target.classList.contains('register-workshop-btn')) {
            const workshopId = event.target.dataset.workshopId;
            handleWorkshopRegistration(workshopId, event.target);
        }
        // Add other delegated listeners if needed (e.g., clicking a project card)
  });




// --- Action Handlers ---
async function handleWorkshopRegistration(workshopId, button) {
     button.disabled = true;
     button.textContent = 'Registering...';
     console.log(`Registering for workshop ${workshopId}`);
     try {
        const response = await fetch('/api/workshops/register', { // Adjust API endpoint
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ workshop_id: workshopId })
        });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({message: 'Registration failed.'}));
             throw new Error(errorData.message || `HTTP error! ${response.status}`);
        }
        // Update UI - change button text/state, maybe show a success message
        button.textContent = 'Registered';
        // You might need to reload 'My Registrations' if the user switches filter
        showMessage('dashboard-errors', 'Successfully registered!', 'success'); // Use a relevant message area

     } catch (error) {
        console.error('Workshop registration error:', error);
        showMessage('dashboard-errors', `Registration failed: ${error.message}`, 'error');
        button.disabled = false; // Re-enable button on failure
        button.textContent = 'Register';
     }
}


// --- Utility functions (already imported but good practice) ---
// Debounce function (if not in shared-utils)
// function debounce(func, wait) { ... }

// formatDate, formatTime, showMessage (assumed imported)