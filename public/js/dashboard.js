// File: public/js/dashboard.js
// Orchestrates the dashboard initialization, navigation, and data loading.

// --- EXTERNAL MODULE IMPORTS ---
import { requireAuthOrRedirect } from './auth-guard.js'; // Handles initial auth check and redirect
import { cacheDom as cacheNavDom, initNavigation } from './nav-ui.js'; // Handles nav caching and setup
import { signOut } from './supabase-auth.js'; // Specific function for logout
import { showMessage, formatDate, formatTime } from './shared-utils.js'; // Utilities
import { celebrateFirstVisit } from './confetti-first-visit.js'; // Adjust path if needed
// Loaders now imported from their dedicated module
import {
    loadDashboardData,
    loadTimeline,
    loadFeaturedContent,
    loadLearningResources,
    loadWorkshops,
    loadProjects
} from './dashboard-loaders.js';
// Import action handlers if they exist in a separate actions file, or define below
// import { handleWorkshopRegistration } from './dashboard-actions.js';
// Removed unused imports like initLatticeSession, refreshSession, checkAccess, etc. as auth-guard handles the core flow.
// Removed loadCategories/getCategories unless specifically needed elsewhere after initial load.

// --- CONSTANTS ---
const ITEMS_PER_PAGE = 10; // Define items per page for pagination

// --- STATE ---
let currentUser = null;
let currentPages = { // Track pagination state for each section
    learning: 1,
    workshops: 1,
    projects: 1
};

// --- DOM CACHE ---
// Structure to hold references to key DOM elements
const dom = {
    navLinks: null, // Populated by cacheNavDom
    sections: null, // Populated by cacheNavDom
    userName: null,
    logoutButton: null,
    // Content Containers (match refined HTML IDs)
    timelineContainer: null,
    featuredContentContainer: null,
    resourcesGrid: null,
    workshopsList: null,
    projectCards: null,
    // Stats Display Elements
    stats: {
        resources: null,
        workshops: null,
        projects: null
    }
    // Add specific pagination elements if needed for direct manipulation,
    // though updatePaginationUI can query them directly too.
};


// Sample data for testing
const featuredClinicsContent = [
    {
      id: 1,
      title: 'Getting Started with Solar Electic',
      description: 'Learn the basic system setup & maintenance',
      type: 'video',
      url: '/videos/solar-workshop',
      thumbnail: '/images/thumbnails/getting-started.jpg',
      featured: true
    },
    {
      id: 2,
      title: 'Fuel Briquette Production',
      description: 'Master the library management features',
      type: 'article',
      url: '/articles/advanced-library',
      thumbnail: '/images/thumbnails/library-mgmt.jpg',
      featured: true
    },
    {
      id: 3,
      title: 'Evaperative Condensation water sourcing',
      description: 'Learn about our lattice method for data security',
      type: 'guide',
      url: '/guides/security',
      thumbnail: '/images/thumbnails/security.jpg',
      featured: true
    }
  ];


    // ... (rest of the variable declarations: featuredGrid, modal, modalForm etc. remain the same) ...
    const modalClinicDescEl = document.getElementById('add-library-modal-desc'); // Get the description element
    // Add hidden inputs if you want to pass category/subcategory IDs easily to the form submit
    // Ensure these inputs exist in the modal HTML form section:
    // <input type="hidden" id="modal-category-id" name="category_id">
    // <input type="hidden" id="modal-subcategory-id" name="subcategory_id">
    // <input type="hidden" id="modal-tags" name="tags"> // Could store stringified tags
    const modalCategoryIdInput = document.getElementById('modal-category-id');
    const modalSubcategoryIdInput = document.getElementById('modal-subcategory-id');
    const modalTagsInput = document.getElementById('modal-tags');

    function displayFeaturedClinics(clinics) {
        // ... (function definition starts the same) ...
        if (!featuredGrid) return;
        featuredGrid.innerHTML = '';

        if (!clinics || clinics.length === 0) { /* ... no clinics message ... */ return; }

        clinics.forEach(clinic => {
            const card = document.createElement('div');
            card.className = 'featured-clinic-card';

            // ... (title, desc, type, url, thumb, clinicId vars setup) ...
            const title = clinic.title || 'Untitled';
            const clinicId = clinic.id || `clinic-${Math.random().toString(36).substr(2, 9)}`;
            const categoryId = clinic.categoryId || '';
            const categoryName = clinic.categoryName || '';
            const subcategoryId = clinic.subcategoryId || '';
            const subcategoryName = clinic.subcategoryName || '';
            const tagsString = (clinic.tags || []).join(','); // Join tags for data attribute

            // ... (notifyIconClass, notifyText, notifyAriaPressed setup) ...

            // Add data attributes for category/subcategory/tags to the "Add Content" button
            card.innerHTML = `
                <div class="card-thumbnail">
                    </div>
                <div class="card-content">
                    <h3><a href="${clinic.url || '#'}">${title}</a></h3>
                    <p>${clinic.description || ''}</p>
                    <div class="card-actions">
                        <a href="${clinic.url || '#'}" class="action-button view-button">
                             <i class="fa-solid fa-circle-info"></i> View Details
                        </a>
                         <button class="action-button notify-button" data-clinic-id="${clinicId}" aria-pressed="${clinic.notification_preference ? 'true' : 'false'}" title="${clinic.notification_preference ? 'Notifications On' : 'Notify Me'}">
                             <i class="${clinic.notification_preference ? 'fa-solid fa-bell' : 'fa-regular fa-bell'}"></i> <span class="button-text">${clinic.notification_preference ? 'Notifications On' : 'Notify Me'}</span>
                         </button>
                        <button class="action-button add-content-button"
                                data-clinic-id="${clinicId}"
                                data-clinic-title="${title}"
                                data-category-id="${categoryId}"
                                data-category-name="${categoryName}"
                                data-subcategory-id="${subcategoryId}"
                                data-subcategory-name="${subcategoryName}"
                                data-tags="${tagsString}">
                            <i class="fa-solid fa-plus"></i> Add Content
                        </button>
                    </div>
                </div>
            `;
            featuredGrid.appendChild(card);
        });
    }

    // --- Update Modal Handling ---
    function openModal(data) { // Pass a single data object
        if (!modal || !modalClinicTitleEl || !modalClinicDescEl || !modalClinicIdInput || !modalForm) return;

        // Update modal title and hidden clinic ID
        modalClinicTitleEl.textContent = data.clinicTitle || 'Selected Clinic';
        modalClinicIdInput.value = data.clinicId || '';

        // Update modal description with category/subcategory context
        let contextDesc = 'Context: ';
        if (data.categoryName && data.subcategoryName) {
            contextDesc += `${data.categoryName} / ${data.subcategoryName}`;
        } else if (data.categoryName) {
            contextDesc += data.categoryName;
        } else {
            contextDesc = 'Add general content related to this clinic.'; // Fallback if no category info
        }
        modalClinicDescEl.textContent = contextDesc;

        // Optionally store category/subcategory IDs and tags in hidden inputs
        if(modalCategoryIdInput) modalCategoryIdInput.value = data.categoryId || '';
        if(modalSubcategoryIdInput) modalSubcategoryIdInput.value = data.subcategoryId || '';
        if(modalTagsInput) modalTagsInput.value = data.tags || ''; // Store comma-separated tags

        // Reset form and messages
        modalForm.reset();
        modalMessageEl.textContent = '';
        modalMessageEl.className = 'form-message';
        modal.classList.add('active');
        modal.querySelector('input[type="text"], input[type="url"]')?.focus();
    }

    function closeModal() { /* ... (no changes needed) ... */ }

    // --- Update Event Listeners ---
    featuredGrid?.addEventListener('click', (event) => {
        const addContentButton = event.target.closest('.add-content-button');
        const notifyButton = event.target.closest('.notify-button');

        if (addContentButton) {
            event.preventDefault();
            // Collect all data from the button
            const modalData = {
                clinicId: addContentButton.dataset.clinicId,
                clinicTitle: addContentButton.dataset.clinicTitle,
                categoryId: addContentButton.dataset.categoryId,
                categoryName: addContentButton.dataset.categoryName,
                subcategoryId: addContentButton.dataset.subcategoryId,
                subcategoryName: addContentButton.dataset.subcategoryName,
                tags: addContentButton.dataset.tags
            };
            openModal(modalData); // Pass the whole data object
        } else if (notifyButton) {
             /* ... (notify logic remains the same) ... */
             event.preventDefault();
             const clinicId = notifyButton.dataset.clinicId;
             toggleNotificationPreference(notifyButton, clinicId);
        }
    });

    // ... (Modal close listeners remain the same) ...

    // Update Modal Form Submission to include category/subcategory/tags if needed
    modalForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        modalMessageEl.textContent = 'Submitting...';
        modalMessageEl.className = 'form-message';

        const formData = new FormData(modalForm);
        const itemData = {
            title: formData.get('title'),
            url: formData.get('url'),
            content_type: formData.get('content_type'),
            description: formData.get('description') || null,
            related_clinic_id: formData.get('clinic_id'), // From hidden input set by openModal
            // Optionally include category/subcategory/tags if your backend API expects them
            // These would come from hidden inputs populated by openModal, e.g.:
            // category_id: formData.get('category_id'),
            // subcategory_id: formData.get('subcategory_id'),
            // tags: formData.get('tags') ? formData.get('tags').split(',') : [] // Split tags back into array
        };

         // ... (rest of validation and API call logic remains the same) ...
         // Basic validation
        if (!itemData.title || !itemData.url || !itemData.content_type || !itemData.related_clinic_id) {
            modalMessageEl.textContent = 'Please fill required fields.';
            modalMessageEl.classList.add('error');
            return;
        }
         try {
             console.warn(`API call 'addLibraryItem' with data below not implemented yet:`, itemData);
             const response = { success: true, message: 'Content added successfully!' }; // Mock response
             if (response.success) { /* ... */ } else { /* ... */ }
         } catch (error) { /* ... */ }
    });

    // ... (toggleNotificationPreference function remains the same) ...

    // --- Initial Render ---
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    displayFeaturedClinics(featuredClinicsContent);



// --- CORE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
    try {
        // 1. Authenticate User (Redirects if fails)
        currentUser = await requireAuthOrRedirect();
        console.log('User authenticated:', currentUser.email);

        // 2. Cache DOM Elements
        cacheCoreDomElements(); // Cache elements specific to this orchestrator
        const navDom = cacheNavDom(); // Cache nav/section elements via nav-ui module
        dom.navLinks = navDom.navLinks;
        dom.sections = navDom.sections;

        // 3. Initial UI Setup
        dom.userName.textContent = currentUser.user_metadata?.full_name || currentUser.email || 'User'; // Use available user info
        dom.userName.setAttribute('aria-live', 'off'); // Turn off live region once loaded
        celebrateFirstVisit(); // Fire the confetti check

        // 4. Setup Navigation (pass the data loading router function)
        // initNavigation will call loadDataForSection for the initial section
        initNavigation(dom, loadDataForSection);

        // 5. Setup Global Action Listeners (Logout, Pagination, etc.)
        setupActionListeners();

        console.log('Dashboard initialized successfully.');

    } catch (error) {
        // Errors from requireAuthOrRedirect likely mean redirection occurred.
        // Log other initialization errors.
        console.error("Dashboard initialization failed:", error);
        // Display a fallback message ONLY if the body hasn't been replaced by redirection.
        if (document.body && !document.body.getAttribute('data-redirecting')) {
             document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h1>Error</h1>
                    <p>Sorry, the dashboard could not be loaded.</p>
                    <p>Please try <a href="/login.html">logging in</a> again.</p>
                    <p><small>Error details logged to console.</small></p>
                </div>`;
        }
    }
}

// --- DOM CACHING HELPER ---
function cacheCoreDomElements() {
    dom.userName = document.getElementById('user-name');
    dom.logoutButton = document.getElementById('logout-button');
    dom.timelineContainer = document.getElementById('timeline-container');
    dom.featuredContentContainer = document.getElementById('featured-content');
    dom.stats.resources = document.getElementById('available-resources-count');
    dom.stats.workshops = document.getElementById('upcoming-workshops-count');
    dom.stats.projects = document.getElementById('impact-projects-count');
    dom.resourcesGrid = document.getElementById('resources-grid');
    dom.workshopsList = document.getElementById('workshops-list');
    dom.projectCards = document.getElementById('project-cards');
    // Note: Pagination buttons are handled via event delegation in setupActionListeners
    // and updated via updatePaginationUI querying them directly.
}

// --- DATA LOADING ROUTER ---
// Called by initNavigation (from nav-ui.js) when a section link is clicked.
// This function routes the call to the appropriate loader function.
function loadDataForSection(sectionId) {
    console.log(`Routing data load for section: ${sectionId}`);

    // Determine the current page for sections with pagination
    const page = currentPages[sectionId] || 1; // Default to 1 if not paginated

    // Call the specific loader function from dashboard-loaders.js
    // Pass the target container element, page number (if applicable), and the UI updater callback.
    // Loaders are expected to handle aria-busy attributes internally.
    switch (sectionId) {
        case 'dashboard':
            // Dashboard often loads multiple pieces of static content
            loadDashboardData(dom.stats); // Pass the stats DOM object
            loadFeaturedContent(dom.featuredContentContainer);
            loadTimeline(dom.timelineContainer); // Load initial timeline view
            break;
        case 'timeline':
            loadTimeline(dom.timelineContainer);
            break;
        case 'learning':
            loadLearningResources(dom.resourcesGrid, page, updatePaginationUI);
            break;
        case 'workshops':
            loadWorkshops(dom.workshopsList, page, updatePaginationUI);
            break;
        case 'projects':
            loadProjects(dom.projectCards, page, updatePaginationUI);
            break;
        default:
            console.warn(`No data loader explicitly defined for section: ${sectionId}`);
            // Optionally clear the target section or show a message
            const sectionElement = document.getElementById(sectionId);
            if(sectionElement) {
                const contentArea = sectionElement.querySelector('[role="region"]');
                if(contentArea) contentArea.innerHTML = `<p>Content for '${sectionId}' is not available.</p>`;
            }
    }
}


// --- PAGINATION UI UPDATER ---
// Callback function passed to loaders that support pagination.
// Updates the state of pagination buttons and info display.
function updatePaginationUI(section, currentPage, totalPages) {
    console.log(`Updating pagination UI for ${section}: Page ${currentPage} of ${totalPages}`);
    currentPages[section] = currentPage; // Update global state

    // Find controls within the specific section's pagination <nav>
    const paginationNav = document.querySelector(`#${section} .pagination-controls`);
    if (!paginationNav) {
        console.warn(`Pagination controls not found for section: ${section}`);
        return;
    }

    const prevButton = paginationNav.querySelector('button[data-page-direction="prev"]');
    const nextButton = paginationNav.querySelector('button[data-page-direction="next"]');
    const pageInfo = paginationNav.querySelector('.page-info'); // Expects <span class="page-info">

    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= totalPages;

    if (prevButton) {
        prevButton.disabled = isFirstPage;
        prevButton.setAttribute('aria-disabled', isFirstPage.toString());
    }
    if (nextButton) {
        nextButton.disabled = isLastPage;
        nextButton.setAttribute('aria-disabled', isLastPage.toString());
    }
    if (pageInfo) {
        pageInfo.textContent = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'No pages';
    }
}


// --- GLOBAL EVENT LISTENERS ---
function setupActionListeners() {
    // Logout Button
    if (dom.logoutButton) {
        dom.logoutButton.addEventListener('click', handleLogout);
    } else {
        console.warn("Logout button not found during setup.");
    }

    // Event Delegation for dynamically loaded content / actions
    document.body.addEventListener('click', (event) => {
        // Pagination Click Handler
        const paginationButton = event.target.closest('button[data-page-direction]');
        if (paginationButton && !paginationButton.disabled) {
            handlePaginationClick(paginationButton);
            return; // Prevent other handlers if it was a pagination click
        }

        // Workshop Registration Button Handler (Example)
        const workshopButton = event.target.closest('.register-workshop-btn'); // Ensure buttons have this class
        if (workshopButton) {
            handleWorkshopRegistration(workshopButton.dataset.workshopId, workshopButton);
            return;
        }

        // Add other delegated event listeners here...
    });
}

// --- ACTION HANDLERS ---

async function handleLogout() {
    console.log('Logout requested');
    try {
        await signOut();
        // Add a flag to prevent error message display during redirect
        document.body.setAttribute('data-redirecting', 'true');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        showMessage('Logout failed. Please try again.', 'error'); // Use your toast/message system
    }
}

function handlePaginationClick(button) {
    const section = button.dataset.section;
    const direction = button.dataset.pageDirection;

    if (section && direction && currentPages.hasOwnProperty(section)) {
        const currentPage = currentPages[section];
        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        // Basic validation, though disabled state should prevent invalid clicks
        if (newPage >= 1) {
            console.log(`Pagination: Section ${section}, Direction ${direction}, New Page ${newPage}`);
            // Update the current page state *before* loading data
            currentPages[section] = newPage;
            // Trigger reload of the section's content for the new page
            loadDataForSection(section);
        } else {
            console.warn(`Attempted pagination to invalid page: ${newPage}`);
        }
    } else {
        console.error("Pagination click handler failed: Missing data attributes or section state.", button);
    }
}

// Example Workshop Registration Handler (keep here or move to dashboard-actions.js)
async function handleWorkshopRegistration(workshopId, button) {
    if (!workshopId) {
        console.error('Workshop Registration: Missing workshop ID.');
        showMessage('Cannot register for workshop: ID missing.', 'error');
        return;
    }
    console.log(`Registering for workshop: ${workshopId}`);
    button.disabled = true;
    button.textContent = 'Registering...';
    button.setAttribute('aria-label', 'Registering for workshop'); // Update label for screen readers

    try {
        const response = await fetch('/api/workshops/register', { // Use your actual API endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Include Authorization header if required by your API
                 'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
            },
            body: JSON.stringify({ workshop_id: workshopId })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Registration failed with status ' + response.status }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }

        // Success
        button.textContent = 'Registered';
        button.setAttribute('aria-label', 'Successfully registered for workshop'); // Update label
        showMessage('Successfully registered for the workshop!', 'success');
        // Optionally visually disable it further or remove it if desired

    } catch (error) {
        console.error('Workshop registration failed:', error);
        button.disabled = false; // Re-enable button on failure
        button.textContent = 'Register Failed';
        button.setAttribute('aria-label', `Failed to register for workshop. Try again.`);
        showMessage(`Workshop registration failed: ${error.message}`, 'error');
    }
}

// --- Exports (Optional, e.g., for testing) ---
// export { currentUser, currentPages, loadDataForSection };