// /public/js/taxonomy-api.js

class TaxonomyAPI {
    constructor(supabaseClient, userId = 'anonymous') {
      this.supabase = supabaseClient;
      this.userId = userId;
      this.eventListeners = {};
      this.localQueue = this.loadQueue();
      this.updateUnsyncedIndicator?.(this.localQueue.length);
  
      this.setupRealtimeSubscription();
    }
  
    // --- Queue Key per User ---
    getQueueKey() {
      return `taxonomy_queue_${this.userId}`;
    }
  
    saveQueue(queue) {
      try {
        localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
      } catch (e) {
        console.error('Failed to save queue:', e);
      }
    }
  
    loadQueue() {
      try {
        const raw = localStorage.getItem(this.getQueueKey());
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to load queue:', e);
        return [];
      }
    }
  
    async syncLocalChanges() {
      for (const item of this.localQueue) {
        try {
          const result = await this[item.method](...item.args);
          console.log('✅ Synced:', item.method, result);
        } catch (e) {
          console.warn('❌ Failed to sync item:', item, e);
        }
      }
      this.localQueue = [];
      this.saveQueue(this.localQueue); // 🔄 clear storage
      this.updateUnsyncedIndicator?.(0);
    }
    
  
    // --- Offline Wrapping Helper ---
    async safeExecute(method, ...args) {
      if (navigator.onLine) {
        const result = await this[method](...args);
        return result;
      } else {
        this.localQueue.push({ method, args });
        this.saveQueue(this.localQueue);
        this.updateUnsyncedIndicator?.(this.localQueue.length);
        this.emit(`${method}_offline`, args);
        return null;
      }
    }
  
    // --- Event System ---
    on(event, callback) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push(callback);
      return this;
    }
  
    emit(event, data) {
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(cb => cb(data));
      }
      return this;
    }
  
    // --- Toast UI ---
    showToast(message, type = 'info') {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;
  
      const toast = document.createElement('div');
      toast.className = `px-4 py-2 rounded shadow-md text-white ${type === 'error' ? 'bg-red-500' : 'bg-blue-500'} animate-slide-in`;
      toast.textContent = message;
      toastContainer.appendChild(toast);
  
      setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }
  
    // --- Real-time Subscriptions ---
    setupRealtimeSubscription() {
      try {
        this.categoryChannel = this.supabase.channel('taxonomy-changes');
  
        this.categoryChannel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'Category' },
            payload => this.emit('category_change', payload))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'Subcategory' },
            payload => this.emit('subcategory_change', payload))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'Tag' },
            payload => this.emit('tag_change', payload))
          .subscribe();
  
        console.log('Realtime subscription for taxonomy established');
      } catch (err) {
        console.error('Failed to setup realtime subscription:', err);
      }
    }
  
    // --- Storage helpers ---
    async saveToLocalStorage(key, data) {
      try {
        localStorage.setItem(`taxonomy_${key}`, JSON.stringify(data));
        return true;
      } catch (err) {
        console.error(`Failed to save to local storage: ${key}`, err);
        return false;
      }
    }
  
    async getFromLocalStorage(key) {
      try {
        const raw = localStorage.getItem(`taxonomy_${key}`);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.error(`Failed to get from local storage: ${key}`, err);
        return null;
      }
    }
  
    // --- Slug Helper ---
    slugify(text) {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }
  

    // Fetch all categories with subcategories
    async fetchCategories() {
        try {
          this.emit('loading', true);
          
          // Fetch categories with subcategories nested
          const { data, error } = await this.supabase
            .from('Category')
            .select(`
              id,
              name,
              slug,
              subcategories:Subcategory(*)
            `)
            .order('name');
          
          if (error) throw error;
          
          // Sort subcategories alphabetically for each category
          const processedData = data.map(category => ({
            ...category,
            subcategories: (category.subcategories || []).sort((a, b) => 
              a.name.localeCompare(b.name)
            )
          }));
          
          this.emit('loading', false);
          this.emit('categories_loaded', processedData);
          return processedData;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to fetch categories',
            details: error.message
          });
          console.error('Error fetching categories:', error);
          return [];
        }
      }
    
      // Fetch tags via central API
      async fetchTags() {
        try {
          this.emit('loading', true);
  
          const response = await fetch('/api/librarymgmt.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list-tags' })
          });
  
          const result = await response.json();
  
          if (!response.ok || !result.data) {
            throw new Error(result.error || 'Failed to fetch tags');
          }
  
          const sortedTags = result.data.sort((a, b) => a.name.localeCompare(b.name));
  
          await this.saveToLocalStorage('tags', sortedTags);
          this.emit('loading', false);
          this.emit('tags_loaded', sortedTags);
          return sortedTags;
  
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to fetch tags',
            details: error.message
          });
          console.error('Error fetching tags:', error);
  
          // Fallback to cached version
          const fallbackData = await this.getFromLocalStorage('tags');
          if (fallbackData) {
            this.emit('tags_loaded', fallbackData);
            return fallbackData;
          }
  
          return [];
        }
      }
  
    
      // Create a new category
      async createCategory(categoryData) {
        try {
          this.emit('loading', true);
          
          // Generate slug if not provided
          if (!categoryData.slug) {
            categoryData.slug = this.slugify(categoryData.name);
          }
          
          const { data, error } = await this.supabase
            .from('Category')
            .insert(categoryData)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('category_created', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to create category',
            details: error.message
          });
          console.error('Error creating category:', error);
          throw error;
        }
      }
    
      // Update an existing category
      async updateCategory(id, updates) {
        try {
          this.emit('loading', true);
          
          // Generate slug if name is being updated and slug isn't provided
          if (updates.name && !updates.slug) {
            updates.slug = this.slugify(updates.name);
          }
          
          const { data, error } = await this.supabase
            .from('Category')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('category_updated', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to update category',
            details: error.message
          });
          console.error('Error updating category:', error);
          throw error;
        }
      }
    
      // Delete a category
      async deleteCategory(id) {
        try {
          this.emit('loading', true);
          
          // First check if the category has subcategories
          const { data: subcategories, error: checkError } = await this.supabase
            .from('Subcategory')
            .select('id')
            .eq('category_id', id);
          
          if (checkError) throw checkError;
          
          if (subcategories && subcategories.length > 0) {
            throw new Error('Cannot delete a category that has subcategories. Delete the subcategories first.');
          }
          
          // Proceed with deletion
          const { error } = await this.supabase
            .from('Category')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('category_deleted', { id });
          return { success: true, id };
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to delete category',
            details: error.message
          });
          console.error('Error deleting category:', error);
          throw error;
        }
      }
    
      // Create a new subcategory
      async createSubcategory(subcategoryData) {
        try {
          this.emit('loading', true);
          
          // Generate slug if not provided
          if (!subcategoryData.slug) {
            subcategoryData.slug = this.slugify(subcategoryData.name);
          }
          
          const { data, error } = await this.supabase
            .from('Subcategory')
            .insert(subcategoryData)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('subcategory_created', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to create subcategory',
            details: error.message
          });
          console.error('Error creating subcategory:', error);
          throw error;
        }
      }
    
      // Update an existing subcategory
      async updateSubcategory(id, updates) {
        try {
          this.emit('loading', true);
          
          // Generate slug if name is being updated and slug isn't provided
          if (updates.name && !updates.slug) {
            updates.slug = this.slugify(updates.name);
          }
          
          const { data, error } = await this.supabase
            .from('Subcategory')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('subcategory_updated', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to update subcategory',
            details: error.message
          });
          console.error('Error updating subcategory:', error);
          throw error;
        }
      }
    
      // Delete a subcategory
      async deleteSubcategory(id) {
        try {
          this.emit('loading', true);
          
          // First check if the subcategory is used by any videos
          const { count, error: countError } = await this.supabase
            .from('Video')
            .select('id', { count: 'exact', head: true })
            .eq('subcategory_id', id);
          
          if (countError) throw countError;
          
          if (count > 0) {
            throw new Error(`Cannot delete a subcategory that is used by ${count} videos. Reassign those videos first.`);
          }
          
          // Proceed with deletion
          const { error } = await this.supabase
            .from('Subcategory')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('subcategory_deleted', { id });
          return { success: true, id };
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to delete subcategory',
            details: error.message
          });
          console.error('Error deleting subcategory:', error);
          throw error;
        }
      }
    
      // Create a new tag
      async createTag(tagData) {
        try {
          this.emit('loading', true);
          
          // Generate slug if not provided
          if (!tagData.slug) {
            tagData.slug = this.slugify(tagData.name);
          }
          
          const { data, error } = await this.supabase
            .from('Tag')
            .insert(tagData)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('tag_created', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to create tag',
            details: error.message
          });
          console.error('Error creating tag:', error);
          throw error;
        }
      }
    
      // Update an existing tag
      async updateTag(id, updates) {
        try {
          this.emit('loading', true);
          
          // Generate slug if name is being updated and slug isn't provided
          if (updates.name && !updates.slug) {
            updates.slug = this.slugify(updates.name);
          }
          
          const { data, error } = await this.supabase
            .from('Tag')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('tag_updated', data);
          return data;
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to update tag',
            details: error.message
          });
          console.error('Error updating tag:', error);
          throw error;
        }
      }
    
      // Delete a tag
      async deleteTag(id) {
        try {
          this.emit('loading', true);
          
          const { error } = await this.supabase
            .from('Tag')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          this.emit('loading', false);
          this.emit('tag_deleted', { id });
          return { success: true, id };
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to delete tag',
            details: error.message
          });
          console.error('Error deleting tag:', error);
          throw error;
        }
      }
    




    // Get video counts by category
    async getCategoryCounts() {
        try {
          this.emit('loading', true);
          
          const { data, error } = await this.supabase
            .from('Video')
            .select('category_id, subcategory_id');
          
          if (error) throw error;
          
          // Build count objects
          const categoryCounts = {};
          const subcategoryCounts = {};
          
          data.forEach(video => {
            if (video.category_id) {
              categoryCounts[video.category_id] = (categoryCounts[video.category_id] || 0) + 1;
            }
            
            if (video.subcategory_id) {
              subcategoryCounts[video.subcategory_id] = (subcategoryCounts[video.subcategory_id] || 0) + 1;
            }
          });
          
          this.emit('loading', false);
          this.emit('counts_loaded', { 
            categories: categoryCounts, 
            subcategories: subcategoryCounts 
          });
          
          return { categories: categoryCounts, subcategories: subcategoryCounts };
        } catch (error) {
          this.emit('loading', false);
          this.emit('error', {
            message: 'Failed to fetch category counts',
            details: error.message
          });
          console.error('Error fetching category counts:', error);
          return { categories: {}, subcategories: {} };
        }
      }



  }
  
  export default TaxonomyAPI;
  