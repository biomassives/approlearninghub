// library/library.js
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadCategories();
    document.getElementById('logout-button')
            .addEventListener('click', logout);
  });
  
  let apiToken = null;
  
  async function initAuth() {
    apiToken = localStorage.getItem('token');
    if (!apiToken) return showAnonymous();
  
    try {
      const res = await fetch('/api/auth/access-check', {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error('Not authenticated');
  
      // Show user info
      document.getElementById('user-name').textContent = json.user.email;
      if (json.user.isAdmin) {
        document.getElementById('admin-controls').classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Auth check failed:', err);
      localStorage.removeItem('token');
      showAnonymous();
    }
  }
  
  function showAnonymous() {
    document.getElementById('user-name').textContent = '';
    document.getElementById('admin-controls')
            .classList.add('hidden');
  }
  
  // --- Logout
  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
  
  // --- Load Categories
  async function loadCategories() {
    const container = document.getElementById('category-icons');
    container.innerHTML = `<p>Loading categories…</p>`;
    try {
      const res  = await fetch('/api/library/categories');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load');
  
      renderCategories(json.categories);
    } catch (err) {
      container.innerHTML = `<p class="text-red-600">Error loading categories</p>`;
      console.error(err);
    }
  }
  
  function renderCategories(categories) {
    const container = document.getElementById('category-icons');
    container.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.innerHTML = `<i class="fas fa-folder fa-2x"></i>
                       <span>${cat.name}</span>`;
      btn.onclick = () => selectCategory(cat.id, cat.name);
      container.appendChild(btn);
    });
  }
  
  // --- When a category is picked
  async function selectCategory(catId, catName) {
    // Show subcategory section
    document.getElementById('subcategory-section').classList.remove('hidden');
    document.getElementById('subcategory-title')
            .textContent = `Subcategories of “${catName}”`;
  
    const subEl = document.getElementById('subcategories');
    subEl.innerHTML = `<p>Loading subcategories…</p>`;
  
    try {
      const res  = await fetch(`/api/library/subcategories?categoryId=${catId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
  
      renderSubcategories(json.subcategories, catId, catName);
    } catch (err) {
      subEl.innerHTML = `<p class="text-red-600">Error loading subcategories</p>`;
      console.error(err);
    }
  }
  
  function renderSubcategories(subs, catId, catName) {
    const subEl = document.getElementById('subcategories');
    subEl.innerHTML = '';
    subs.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'subcategory-card';
      card.innerHTML = `<h3>${sub.name}</h3>
                        <p>${sub.description || ''}</p>`;
      card.onclick = () => selectSubcategory(catId, sub.id, sub.name);
      subEl.appendChild(card);
    });
  }
  
  // --- When a subcategory is picked
  async function selectSubcategory(catId, subId, subName) {
    // Show modules section
    document.getElementById('content-section').classList.remove('hidden');
    document.getElementById('content-title')
            .textContent = `Learning Modules in “${subName}”`;
  
    const modEl = document.getElementById('content-details');
    modEl.innerHTML = `<p>Loading modules…</p>`;
  
    try {
      const res  = await fetch(
        `/api/library/modules?categoryId=${catId}&subcategoryId=${subId}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
  
      renderModules(json.modules);
    } catch (err) {
      modEl.innerHTML = `<p class="text-red-600">Error loading modules</p>`;
      console.error(err);
    }
  }
  
  function renderModules(modules) {
    const modEl = document.getElementById('content-details');
    modEl.innerHTML = '';
    modules.forEach(m => {
      const card = document.createElement('div');
      card.className = 'module-card';
      card.innerHTML = `
        <h4>${m.title}</h4>
        <p>${m.summary || ''}</p>
        <button class="btn btn-primary" onclick="window.location.href='/library/module.html?id=${m.id}'">
          View
        </button>
      `;
      modEl.appendChild(card);
    });
  }
  