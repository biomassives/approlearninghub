/**
 * Module for category, subcategory, breadcrumb, and search UI logic.
 * Provides functions to render categories, subcategories, and breadcrumbs,
 * and manages user interactions related to category navigation.
 * Integrates with localStorage to remember user-preferred categories.
 */

 // Default categories structure (used as fallback if none provided to init)
 const defaultCategories = [
    { id: 'cat1', name: 'Category 1', subcategories: [ {id:'cat1-1', name:'Subcat 1'}, {id:'cat1-2', name:'Subcat 2'} ] },
    { id: 'cat2', name: 'Category 2', subcategories: [ {id:'cat2-1', name:'Subcat A'}, {id:'cat2-2', name:'Subcat B'} ] }
    // Additional categories can be added here
  ];
  
  // Internal storage for category data (will be set in initCategoryUI)
  let categoriesData = defaultCategories;
  
  /**
   * Initialize the category UI module with category data.
   * @param {Array} categories - Array of category objects (each with id, name, subcategories).
   * If not provided or empty, falls back to a default category structure.
   * Also applies any user preference (from localStorage) to reorder categories.
   */
  export function initCategoryUI(categories) {
    if (categories && categories.length) {
      categoriesData = categories;
    } else {
      categoriesData = defaultCategories;
    }
    // Reorder categories if user preferences exist (preferred categories first)
    const preferred = getPreferredCategories();
    if (preferred.length) {
      categoriesData.sort((a, b) => {
        const aIndex = preferred.indexOf(a.id);
        const bIndex = preferred.indexOf(b.id);
        // Categories in preferred list come first (in the order of preference)
        if (aIndex !== -1 && bIndex === -1) return -1;
        if (aIndex === -1 && bIndex !== -1) return 1;
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        return 0; // preserve relative order for those not in preferences
      });
    }
  }
  
  /**
   * Render the main categories list into a container element.
   * Each category is rendered as a clickable button (or link).
   * @param {HTMLElement} container - The DOM element to populate with category buttons.
   */
  export function renderCategories(container) {
    if (!container) return;
    container.innerHTML = '';  // clear any existing content
    categoriesData.forEach(category => {
      const btn = document.createElement('button');
      btn.textContent = category.name;
      btn.dataset.categoryId = category.id;
      // Mark preferred categories with a special class (if desired for styling)
      if (getPreferredCategories().includes(category.id)) {
        btn.classList.add('preferred-category');
      }
      container.appendChild(btn);
    });
  }
  
  /**
   * Render subcategory links for a given category into a container element.
   * Typically called when a category is selected to show its subcategories.
   * @param {HTMLElement} container - The DOM element to populate with subcategory links.
   * @param {string} categoryId - The id of the category whose subcategories should be displayed.
   */
  export function renderSubcategories(container, categoryId) {
    if (!container) return;
    container.innerHTML = '';
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    // If no subcategories, container remains empty (could also hide the container in that case)
    category.subcategories.forEach(subcat => {
      const link = document.createElement('a');
      link.textContent = subcat.name;
      link.href = '#';  // placeholder href, since we handle click via JS
      link.dataset.categoryId = categoryId;
      link.dataset.subcategoryId = subcat.id;
      container.appendChild(link);
    });
  }
  
  /**
   * Update the breadcrumb navigation display based on current selection.
   * - If a category is selected (and no subcategory), shows the category name.
   * - If a subcategory is selected, shows "Category Name / Subcategory Name".
   * - If a search term is active, includes it as "... / Search: \"term\"".
   * - If nothing is selected (homepage default), shows "Home".
   * @param {HTMLElement} container - The DOM element where breadcrumb text should be displayed.
   * @param {string} [categoryId] - The id of the current category (if one is selected).
   * @param {string} [subcategoryId] - The id of the current subcategory (if one is selected).
   * @param {string} [searchTerm] - The current search term, if a search is in effect.
   */
  export function updateBreadcrumb(container, categoryId, subcategoryId, searchTerm) {
    if (!container) return;
    let breadcrumbText = '';
    if (categoryId) {
      const category = categoriesData.find(cat => cat.id === categoryId);
      if (category) {
        breadcrumbText += category.name;
        if (subcategoryId) {
          const subcat = category.subcategories.find(sc => sc.id === subcategoryId);
          if (subcat) {
            breadcrumbText += ' / ' + subcat.name;
          }
        }
      }
    }
    if (searchTerm) {
      // Append search term to breadcrumb
      breadcrumbText += (breadcrumbText ? ' / ' : '') + `Search: "${searchTerm}"`;
    }
    if (!breadcrumbText) {
      // Default to "Home" if no category or search is selected
      breadcrumbText = 'Home';
    }
    container.textContent = breadcrumbText;
  }
  
  /**
   * Record a category as user-preferred in localStorage.
   * Stores a list of preferred category IDs, ensuring the newest preference is first.
   * @param {string} categoryId - The category ID to save as preferred.
   */
  export function addPreferredCategory(categoryId) {
    if (!categoryId) return;
    let prefs = getPreferredCategories();
    // Remove the category if it already exists to avoid duplicates
    prefs = prefs.filter(id => id !== categoryId);
    // Add to front of the list
    prefs.unshift(categoryId);
    // (Optional) Limit the stored preferences list length if needed
    if (prefs.length > 10) {
      prefs = prefs.slice(0, 10);
    }
    try {
      localStorage.setItem('preferredCategories', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Unable to save preferred category to localStorage', e);
    }
  }
  
  /**
   * Retrieve the array of user-preferred category IDs from localStorage.
   * @returns {Array<string>} Array of category IDs stored as preferred (most recent first).
   */
  export function getPreferredCategories() {
    try {
      const stored = localStorage.getItem('preferredCategories');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Visually highlight the active category in the category list.
   * Adds an "active" CSS class to the selected category button and removes it from others.
   * @param {string} categoryId - The id of the category to mark as active.
   */
  export function setActiveCategory(categoryId) {
    const buttons = document.querySelectorAll('[data-category-id]');
    buttons.forEach(btn => {
      if (btn.dataset.categoryId === categoryId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
 