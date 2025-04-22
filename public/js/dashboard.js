// File: public/js/dashboard.js
// Main dashboard initialization, navigation, and data loaders

// --- EXTERNAL MODULE IMPORTS ---
import { initLatticeSession, verifySession, refreshSession } from './lattice-auth.js';
import { getCurrentUser, checkAccess, signOut } from './supabase-auth.js';
import { showMessage, formatDate, formatTime, debounce } from './shared-utils.js';
import { loadCategories, getCategories } from './category-manager.js';
import confetti from './lib/canvas-confetti.js';  // Confetti on first visits

// --- STATE & DOM CACHING ---
let currentUser = null;
let currentLatticeInfo = null;
let currentCategories = [];
let visitCount = 0;

// Cache key sections
typedef domStruct {
  NodeList<Element> navLinks;
  NodeList<Element> sections;
  HTMLElement timeline;
  HTMLElement featured;
  {
    HTMLElement resources;
    HTMLElement workshops;
    HTMLElement projects;
  } stats;
}
const dom = /** @type {domStruct} */ ({
  navLinks: null,
  sections: null,
  timeline: null,
  featured: null,
  stats: {
    resources: null,
    workshops: null,
    projects: null
  }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Fetch user & session security
  currentUser = await getCurrentUser();
  if (!currentUser) return window.location.href = '/login.html';

  currentLatticeInfo = await initLatticeSession();
  await checkRoleAccess(currentUser);

  // 2) Category Manager
  await loadCategories();
  currentCategories = getCategories();

  // 3) Confetti on first 5 visits
  maybeConfetti();

  // 4) Cache DOM references
  cacheDom();

  // 5) Render initial dashboard
  initNavigation();
  loadDashboardData();
  loadTimeline();
  loadFeaturedContent();

  // 6) Event delegation for buttons
  setupDelegation();
});

// --- CONFETTI ON FIRST VISITS ---
function maybeConfetti() {
  try {
    visitCount = parseInt(localStorage.getItem('dashboardVisits') || '0', 10) + 1;
    localStorage.setItem('dashboardVisits', visitCount);
    if (visitCount <= 5) {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { x: 0.5, y: 0.3 }
      });
    }
  } catch (e) {
    console.warn('Confetti tracking failed', e);
  }
}

// --- CACHE DOM ELEMENTS ---
function cacheDom() {
  dom.navLinks = document.querySelectorAll('.nav-link');
  dom.sections = document.querySelectorAll('.dashboard-section');
  dom.timeline = document.getElementById('timeline-container');
  dom.featured = document.getElementById('featured-content');
  dom.stats.resources = document.getElementById('available-resources-count');
  dom.stats.workshops = document.getElementById('upcoming-workshops-count');
  dom.stats.projects = document.getElementById('impact-projects-count');
}

// --- ROLE ACCESS CONTROL ---
async function checkRoleAccess(user) {
  const role = user.app_metadata?.roles?.[0] || 'user';
  if (role !== 'expert') document.querySelectorAll('.expert-only').forEach(el => el.remove());
  if (role !== 'admin')  document.querySelectorAll('.admin-only').forEach(el => el.remove());
}

// --- NAVIGATION ---
function initNavigation() {
  dom.navLinks.forEach(link =>
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.section;
      dom.navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      dom.sections.forEach(sec => sec.classList.toggle('hidden', sec.id !== target));
      loadDataForSection(target);
      history.replaceState(null, '', `#${target}`);
    })
  );

  const initial = location.hash.slice(1) || 'dashboard';
  document.querySelector(`.nav-link[data-section="${initial}"]`)?.click();
}

// --- EVENT DELEGATION ---
function setupDelegation() {
  document.body.addEventListener('click', event => {
    if (event.target.matches('.register-workshop-btn')) {
      handleWorkshopRegistration(event.target.dataset.workshopId, event.target);
    }
    if (event.target.matches('[data-page-prev], [data-page-next]')) {
      const type = event.target.dataset.pageType;
      const dir = event.target.dataset.pagePrev ? 'prev' : 'next';
      handlePaginationClick(type, dir);
    }
    if (event.target.id === 'verify-session-btn') {
      verifySession().then(ok => showMessage('dashboard-errors', ok ? 'Session Valid' : 'Session Invalid', ok ? 'success' : 'error'));
    }
  });
}

// --- SECTION LOADERS ---
function loadDataForSection(section) {
  switch (section) {
    case 'dashboard': loadDashboardData(); break;
    case 'timeline':  loadTimeline(); break;
    case 'learning':  loadLearningResources(); break;
    case 'workshops': loadWorkshops(); break;
    case 'projects':  loadProjects(); break;
  }
}

// --- LOADERS IMPLEMENTED ---
async function loadDashboardData() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const stats = await res.json();
    dom.stats.resources.textContent = stats.resourceCount ?? '—';
    dom.stats.workshops.textContent = stats.upcomingWorkshops ?? '—';
    dom.stats.projects.textContent = stats.implementedProjects ?? '—';
  } catch (e) {
    console.error('Dashboard data error', e);
  }
}

async function loadTimeline() {
  dom.timeline.innerHTML = '<p class="loading">Loading activity...</p>';
  try {
    const res = await fetch('/api/user/timeline');
    const events = await res.json();
    dom.timeline.innerHTML = '';
    events.slice(0,5).forEach(ev => {
      const div = document.createElement('div');
      div.className = 'timeline-item';
      div.innerHTML = `
        <div class="timeline-date">${formatDate(ev.timestamp)} ${formatTime(ev.timestamp)}</div>
        <div class="timeline-content">
          <strong>${ev.title}</strong>
          <p>${ev.description}</p>
        </div>`;
      dom.timeline.appendChild(div);
    });
  } catch (e) {
    dom.timeline.innerHTML = '<p class="error-message">Failed to load timeline.</p>';
    console.error(e);
  }
}

async function loadFeaturedContent() {
  dom.featured.innerHTML = '<p class="loading">Loading featured...</p>';
  try {
    const res = await fetch('/api/content/featured?limit=3');
    const items = await res.json();
    dom.featured.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'featured-card';
      card.innerHTML = `<h4>${item.title}</h4><p>${item.excerpt}</p><a href="/content/${item.id}">View</a>`;
      dom.featured.appendChild(card);
    });
  } catch (e) {
    dom.featured.innerHTML = '<p class="error-message">Failed to load featured.</p>';
    console.error(e);
  }
}

// --- SECTION LOADERS ---
async function loadLearningResources(page = 1) {
  console.log('Loading learning resources, page', page);
  const container = document.getElementById('resources-grid');
  container.innerHTML = '<p class="loading">Loading learning resources...</p>';
  try {
    const res = await fetch(`/api/content?page=${page}&limit=${ITEMS_PER_PAGE}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); // { items: [], totalItems }

    container.innerHTML = '';
    if (data.items.length) {
      data.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
          <h4>${item.title}</h4>
          <p>${item.excerpt || item.description || ''}</p>
          <a href="/content/${item.id}">View Resource</a>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = '<p>No learning resources found.</p>';
    }
    // update pagination if present
    const totalPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
    updatePagination && updatePagination('resources', page, totalPages);
  } catch (e) {
    console.error('Error loading learning resources:', e);
    container.innerHTML = '<p class="error-message">Failed to load learning resources.</p>';
  }
}

async function loadWorkshops(page = 1) {
  console.log('Loading workshops, page', page);
  const container = document.getElementById('workshops-list');
  container.innerHTML = '<p class="loading">Loading workshops...</p>';
  try {
    const res = await fetch(`/api/workshops?page=${page}&limit=${ITEMS_PER_PAGE}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); // { items: [], totalItems }

    container.innerHTML = '';
    if (data.items.length) {
      data.items.forEach(ws => {
        const card = document.createElement('div');
        card.className = 'workshop-card';
        card.innerHTML = `
          <h4>${ws.title}</h4>
          <p>${formatDate(ws.start_time)} at ${formatTime(ws.start_time)}</p>
          <a href="/workshop/${ws.id}">Details</a>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = '<p>No workshops available.</p>';
    }
    const totalPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
    updatePagination && updatePagination('workshops', page, totalPages);
  } catch (e) {
    console.error('Error loading workshops:', e);
    container.innerHTML = '<p class="error-message">Failed to load workshops.</p>';
  }
}

async function loadProjects(page = 1) {
  console.log('Loading projects, page', page);
  const container = document.getElementById('project-cards');
  container.innerHTML = '<p class="loading">Loading projects...</p>';
  try {
    const res = await fetch(`/api/projects?page=${page}&limit=${ITEMS_PER_PAGE}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    container.innerHTML = '';
    if (data.items.length) {
      data.items.forEach(pr => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
          <h4>${pr.title}</h4>
          <p>Status: ${pr.status}</p>
          <a href="/project/${pr.id}">View Project</a>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = '<p>No projects found.</p>';
    }
    const totalPages = Math.ceil(data.totalItems / ITEMS_PER_PAGE);
    updatePagination && updatePagination('projects', page, totalPages);
  } catch (e) {
    console.error('Error loading projects:', e);
    container.innerHTML = '<p class="error-message">Failed to load projects.</p>';
  }
}

// --- ACTION HANDLERS ---
async function handleWorkshopRegistration(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Registering…';
  try {
    await fetch('/api/workshops/register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workshop_id: id })
    });
    btn.textContent = 'Registered';
  } catch (e) {
    console.error(e);
    btn.textContent = 'Failed';
    btn.disabled = false;
  }
}

function handlePaginationClick(type, dir) {
  console.log(`Paginate ${type} ${dir}`);
}

// Export for testing
export {
  loadDashboardData,
  loadTimeline,
  loadFeaturedContent
};
