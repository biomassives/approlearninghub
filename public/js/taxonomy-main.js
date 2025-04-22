// /public/js/taxonomy-main.js
import { debounce } from '/shared-utils.js';

export async function initTaxonomyManager(api) {
    const categoryContainer = document.getElementById('categories-container');
    const tagCloud = document.getElementById('tag-cloud');
  
    // Event Bindings
    api.on('categories_loaded', renderCategories);
    api.on('tags_loaded', renderTags);
    api.on('category_created', () => api.fetchCategories());
    api.on('category_updated', () => api.fetchCategories());
    api.on('category_deleted', () => api.fetchCategories());
    api.on('tag_created', () => api.fetchTags());
    api.on('tag_deleted', () => api.fetchTags());
  
    api.on('category_created_offline', debounce(renderOfflineBadge, 200));
    api.on('tag_created_offline', debounce(renderOfflineBadge, 200));
  
    await api.fetchCategories();
    await api.fetchTags();
  
    // Hook up modal-based Add Category
    document.getElementById('add-category-btn')?.addEventListener('click', () => {
      openModal('Add New Category', '', async (name) => {
        await api.createCategory({ name });
      });
    });
  
    // Hook up modal-based Add Subcategory
    document.getElementById('add-subcategory-btn')?.addEventListener('click', async () => {
      const categories = await api.fetchCategories();
      const options = categories.map(c => ({ id: c.id, name: c.name }));
  
      openModal('Add New Subcategory', '', async (name, categoryId) => {
        await api.createSubcategory({ name, category_id: categoryId });
      }, options);
    });
  
    
    // Hook up modal-based Add Tag
    document.getElementById('add-tag-btn')?.addEventListener('click', () => {
      openModal('Add New Tag', '', async (name) => {
        await api.createTag({ name });
      });
    });
  
    document.getElementById('newVideoForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
      
        const payload = {
          title: document.getElementById('newTitle').value,
          youtube_url: document.getElementById('newYoutubeUrl').value,
          description: document.getElementById('newDescription').value,
          tags: document.getElementById('newTags').value.split(',').map(t => t.trim()),
          category_id: currentCategoryId,
          subcategory_id: currentSubcategoryId
        };
      
        const res = await fetch('/api/librarymgmt.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-video', ...payload })
        });
      
        const result = await res.json();
      
        if (result.success) {
          console.log('🎉 Video added:', result.data);
          closeModal();
          // maybe refresh or re-fetch if needed
        } else {
          console.error('❌ Failed to add video:', result.error);
        }
      });
      

    // --- Renders ---
    function renderCategories(categories) {
      categoryContainer.innerHTML = '';
      if (!categories || categories.length === 0) {
        return categoryContainer.innerHTML = `<div>No categories found.</div>`;
      }
  
      for (const category of categories) {
        const el = document.createElement('div');
        el.className = 'category-item p-3 border-b border-gray-200 dark:border-gray-600';
        el.innerHTML = `
          <strong>${category.name}</strong>
          <br>
          <small>${category.subcategories?.map(s => s.name).join(', ') || ''}</small>`;
        categoryContainer.appendChild(el);
      }
    }
  
    function renderTags(tags) {
      tagCloud.innerHTML = '';
      if (!tags || tags.length === 0) {
        return tagCloud.innerHTML = `<div>No tags found.</div>`;
      }
  
      for (const tag of tags) {
        const el = document.createElement('div');
        el.className = 'tag-item px-3 py-2 rounded bg-gray-200 dark:bg-gray-600 text-sm font-medium';
        el.textContent = tag.name;
        tagCloud.appendChild(el);
      }
    }
  
    function renderOfflineBadge() {
      const badge = document.getElementById('unsynced-indicator');
      if (badge) badge.classList.remove('hidden');
    }
  }
  



function openModal(title, defaultName = '', onSubmit, categoryOptions = null) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const input = document.getElementById('modal-name-input');
    const select = document.getElementById('modal-category-select');
    const cancelBtn = document.getElementById('modal-cancel');
    const submitBtn = document.getElementById('modal-submit');
  
    modalTitle.textContent = title;
    input.value = defaultName;
    overlay.classList.remove('hidden');
  
    if (categoryOptions && categoryOptions.length > 0) {
      select.classList.remove('hidden');
      select.innerHTML = categoryOptions.map(opt => `<option value="${opt.id}">${opt.name}</option>`).join('');
    } else {
      select.classList.add('hidden');
    }
  
    const cleanup = () => {
      overlay.classList.add('hidden');
      select.classList.add('hidden');
      input.value = '';
      select.innerHTML = '';
    };
  
    cancelBtn.onclick = cleanup;
    submitBtn.onclick = async () => {
      const name = input.value.trim();
      if (!name) return;
  
      const parentId = select.classList.contains('hidden') ? null : select.value;
      await onSubmit(name, parentId);
      cleanup();
    };
  }
  