/**
   * ApproVideo Learning Hub - Library Module
   * 
   * Core functionality for the learning library including:
   * - Category and subcategory navigation
   * - Module viewing and interaction
   * - Progress tracking
   * - Content submission
   * - Expert feedback
   * - Admin module creation
   */
  
  import authService from '../js/auth-service.js';
  
  // DOM refs
  const userNameEl = document.getElementById('user-name');
  const logoutBtn  = document.getElementById('logout-button');
  const adminCtrls = document.getElementById('admin-controls');
  const addCatBtn  = document.getElementById('add-category-btn');
  
  const categoryIcons     = document.getElementById('category-icons');
  const subcategorySec    = document.getElementById('subcategory-section');
  const subcategoriesDiv  = document.getElementById('subcategories');
  const contentSec        = document.getElementById('content-section');
  const contentDetailsDiv = document.getElementById('content-details');
  
  let currentUser;
  let currentCategory;
  let currentSubcategory;
  let localJsonData = {}; // For data caching
  
  // 1️⃣ Authenticate & init UI
  async function initAuth() {
    const res = await authService.checkAccess();
    if (!res.success) {
      window.location.href = '/index.html';
      return false;
    }
    currentUser = res.user;
    userNameEl.textContent = currentUser.email;
    // If admin, show add-category button
    if (currentUser.role === 'admin') {
      adminCtrls.classList.remove('hidden');
    }
    return true;
  }
  
  // Handle logout
  logoutBtn.addEventListener('click', async () => {
    await authService.logout();
    window.location.href = '/index.html';
  });
  
  // 2️⃣ Fetch & render categories
  async function loadCategories() {
    try {
      const resp = await fetch('/api/library/categories');
      const { success, data } = await resp.json();
      if (!success) throw new Error('Failed to load');
      
      // Cache the data
      localJsonData.categories = data;
      
      data.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `
          category-btn p-6 bg-white shadow rounded-lg
          hover:scale-105 transition
        `;
        btn.innerHTML = `
          <i class="fa fa-folder-open fa-2x mb-2"></i><br>
          <span class="font-semibold">${cat.name}</span>
        `;
        btn.onclick = () => showSubcategories(cat);
        categoryIcons.appendChild(btn);
      });
    } catch (err) {
      categoryIcons.innerHTML = '<p class="col-span-full text-center text-red-500">Error loading categories.</p>';
    }
  }
  
  // 3️⃣ Show subcategories for a given category
  async function showSubcategories(cat) {
    currentCategory = cat;
    subcategoriesDiv.innerHTML = '';
    subcategorySec.classList.remove('hidden');
    contentSec.classList.add('hidden');
  
    // If admin, show add-subcategory control
    if (currentUser.role === 'admin') {
      const addBtn = document.createElement('button');
      addBtn.textContent = `+ Add Subcategory`;
      addBtn.className = 'bg-blue-500 text-white p-4 rounded flex items-center justify-center hover:bg-blue-600 transition mb-4';
      addBtn.onclick = () => showAddSubcategoryForm();
      subcategoriesDiv.appendChild(addBtn);
    }
  
    cat.subcategories.forEach(sub => {
      const subBtn = document.createElement('div');
      subBtn.className = 'bg-white p-4 rounded shadow-md hover:shadow-lg transition cursor-pointer';
      subBtn.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <strong class="text-lg">${sub.title}</strong>
            <p class="mt-2 text-sm text-gray-600">${sub.description}</p>
          </div>
          <span class="bg-gray-200 text-xs px-2 py-1 rounded-full">${sub.moduleCount || 0} modules</span>
        </div>
      `;
      subBtn.onclick = () => showContentDetail(sub);
      subcategoriesDiv.appendChild(subBtn);
    });
  }
  
  // 4️⃣ Show detail for a subcategory
  async function showContentDetail(sub) {
    currentSubcategory = sub;
    contentSec.classList.remove('hidden');
    
    // Show loading state
    contentDetailsDiv.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading modules...</p>';
    
    try {
      // Fetch modules for this subcategory
      const resp = await fetch(`/api/library/modules?subcategoryId=${sub.id}`);
      const { success, data: modules } = await resp.json();
      
      if (!success || !modules.length) {
        contentDetailsDiv.innerHTML = `
          <h3 class="text-xl font-semibold">${sub.title}</h3>
          <p class="mt-2">${sub.description}</p>
          <p class="mt-4"><strong>Tags:</strong> ${sub.tags.join(', ')}</p>
          <p class="mt-4 text-gray-600">No learning modules available yet.</p>
          ${currentUser.role === 'admin' || currentUser.role === 'expert' ? 
            `<button id="create-module-btn" class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Create Learning Module
            </button>` : ''}
        `;
        
        // Set up event listener for create module button if it exists
        const createModuleBtn = document.getElementById('create-module-btn');
        if (createModuleBtn) {
          createModuleBtn.addEventListener('click', showCreateModuleForm);
        }
        
        return;
      }
      
      // Display modules
      let modulesHTML = '';
      modules.forEach(module => {
        modulesHTML += `
          <div class="module-card bg-white p-4 rounded shadow-md hover:shadow-lg transition mb-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h4 class="text-lg font-semibold">${module.title}</h4>
                <p class="text-sm text-gray-600 mt-1">${module.description}</p>
                <div class="flex flex-wrap mt-2">
                  <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                    ${module.difficulty}
                  </span>
                  <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                    ${module.duration}
                  </span>
                  ${module.certification && module.certification.available ? 
                    `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                      Certification
                    </span>` : ''}
                </div>
              </div>
              <button 
                class="view-module-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-3 md:mt-0"
                data-module-id="${module.id}"
              >
                View Module
              </button>
            </div>
          </div>
        `;
      });
      
      contentDetailsDiv.innerHTML = `
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl font-semibold">${sub.title}</h3>
            <p class="text-gray-600">${sub.description}</p>
            <p class="mt-2"><strong>Tags:</strong> ${sub.tags.join(', ')}</p>
          </div>
          ${currentUser.role === 'admin' || currentUser.role === 'expert' ? 
            `<button id="create-module-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Create Learning Module
            </button>` : ''}
        </div>
        
        <div class="modules-list">
          <h4 class="text-lg font-semibold mb-3">Available Learning Modules</h4>
          ${modulesHTML}
        </div>
      `;
      
      // Set up event listeners for view module buttons
      document.querySelectorAll('.view-module-btn').forEach(btn => {
        btn.addEventListener('click', () => viewModule(btn.dataset.moduleId));
      });
      
      // Set up event listener for create module button if it exists
      const createModuleBtn = document.getElementById('create-module-btn');
      if (createModuleBtn) {
        createModuleBtn.addEventListener('click', showCreateModuleForm);
      }
      
    } catch (err) {
      console.error('Error loading modules:', err);
      contentDetailsDiv.innerHTML = `
        <h3 class="text-xl font-semibold">${sub.title}</h3>
        <p class="mt-2">${sub.description}</p>
        <p class="mt-4 text-red-500">Error loading modules. Please try again later.</p>
      `;
    }
  }
  
  // 5️⃣ Admin: Add category form
  function showAddCategoryForm() {
    const form = document.createElement('div');
    form.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    form.id = 'add-category-modal';
    
    form.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Add New Category</h3>
        <form id="category-form">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="category-name">Category Name</label>
            <input 
              type="text" 
              id="category-name" 
              class="w-full p-2 border rounded" 
              required
            >
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="category-icon">Icon (FontAwesome class)</label>
            <input 
              type="text" 
              id="category-icon" 
              class="w-full p-2 border rounded" 
              placeholder="fa-folder-open"
              value="fa-folder-open"
            >
          </div>
          <div class="flex justify-end">
            <button 
              type="button" 
              id="cancel-category" 
              class="bg-gray-500 text-white px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(form);
    
    // Set up event listeners
    document.getElementById('cancel-category').addEventListener('click', () => {
      document.body.removeChild(form);
    });
    
    document.getElementById('category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('category-name').value;
      const icon = document.getElementById('category-icon').value;
      
      try {
        const response = await fetch('/api/library/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, icon })
        });
        
        const { success } = await response.json();
        
        if (success) {
          // Remove form
          document.body.removeChild(form);
          
          // Refresh categories
          categoryIcons.innerHTML = '';
          await loadCategories();
        } else {
          alert('Failed to create category. Please try again.');
        }
      } catch (err) {
        console.error('Error creating category:', err);
        alert('An error occurred. Please try again.');
      }
    });
  }
  
  // 6️⃣ Admin: Add subcategory form
  function showAddSubcategoryForm() {
    const form = document.createElement('div');
    form.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    form.id = 'add-subcategory-modal';
    
    form.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Add New Subcategory to ${currentCategory.name}</h3>
        <form id="subcategory-form">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="subcategory-title">Title</label>
            <input 
              type="text" 
              id="subcategory-title" 
              class="w-full p-2 border rounded" 
              required
            >
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="subcategory-description">Description</label>
            <textarea 
              id="subcategory-description" 
              class="w-full p-2 border rounded" 
              rows="3"
              required
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="subcategory-tags">Tags (comma separated)</label>
            <input 
              type="text" 
              id="subcategory-tags" 
              class="w-full p-2 border rounded" 
              placeholder="editing, beginner, skills"
            >
          </div>
          <div class="flex justify-end">
            <button 
              type="button" 
              id="cancel-subcategory" 
              class="bg-gray-500 text-white px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Add Subcategory
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(form);
    
    // Set up event listeners
    document.getElementById('cancel-subcategory').addEventListener('click', () => {
      document.body.removeChild(form);
    });
    
    document.getElementById('subcategory-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('subcategory-title').value;
      const description = document.getElementById('subcategory-description').value;
      const tags = document.getElementById('subcategory-tags').value.split(',').map(tag => tag.trim());
      
      try {
        const response = await fetch('/api/library/subcategories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            categoryId: currentCategory.id,
            title,
            description,
            tags
          })
        });
        
        const { success } = await response.json();
        
        if (success) {
          // Remove form
          document.body.removeChild(form);
          
          // Refresh subcategories
          await showSubcategories(currentCategory);
        } else {
          alert('Failed to create subcategory. Please try again.');
        }
      } catch (err) {
        console.error('Error creating subcategory:', err);
        alert('An error occurred. Please try again.');
      }
    });
  }
  
  // 7️⃣ View a learning module
  async function viewModule(moduleId) {
    // Create a modal to display module contents
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto';
    modal.id = 'module-view-modal';
    
    // Show loading state
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl my-8 mx-4 relative max-h-screen overflow-y-auto">
        <button id="close-module-btn" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <i class="fas fa-times fa-lg"></i>
        </button>
        <p class="text-center py-8"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading module...</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up close button event
    document.getElementById('close-module-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    try {
      // Fetch module data
      const resp = await fetch(`/api/library/modules/${moduleId}`);
      const { success, data: module } = await resp.json();
      
      if (!success || !module) {
        throw new Error('Failed to load module');
      }
      
      // Generate module content HTML
      let contentHTML = '';
      
      if (module.content && module.content.length) {
        module.content.forEach((item, index) => {
          switch (item.type) {
            case 'video':
              contentHTML += `
                <div class="module-item p-4 border-b">
                  <div class="flex flex-col md:flex-row">
                    <div class="md:w-1/3 mb-3 md:mb-0 md:mr-4">
                      <div class="bg-gray-200 rounded h-40 relative" style="background-image: url('${item.thumbnail}'); background-size: cover; background-position: center;">
                        <div class="absolute inset-0 flex items-center justify-center">
                          <button class="play-video-btn bg-white bg-opacity-80 rounded-full p-3 hover:bg-opacity-100" data-video-url="${item.url}">
                            <i class="fas fa-play text-blue-600"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="md:w-2/3">
                      <h4 class="font-semibold">${index + 1}. ${item.title}</h4>
                      <p class="text-sm text-gray-600">Video • ${item.duration}</p>
                      <p class="mt-2">${item.description || ''}</p>
                    </div>
                  </div>
                </div>
              `;
              break;
              
            case 'practice':
              contentHTML += `
                <div class="module-item p-4 border-b">
                  <h4 class="font-semibold">${index + 1}. ${item.title}</h4>
                  <p class="text-sm text-gray-600">Practice Exercise</p>
                  <p class="mt-2">${item.instructions}</p>
                  <div class="mt-3">
                    <p class="font-medium">Resources:</p>
                    <ul class="list-disc pl-5">
                      ${item.resources.map(resource => `
                        <li><a href="${resource}" class="text-blue-600 hover:underline">Download resource</a></li>
                      `).join('')}
                    </ul>
                  </div>
                  <div class="mt-4">
                    <button class="submit-practice-btn bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                      Submit Your Work
                    </button>
                  </div>
                </div>
              `;
              break;
              
            case 'quiz':
              contentHTML += `
                <div class="module-item p-4 border-b">
                  <h4 class="font-semibold">${index + 1}. ${item.title}</h4>
                  <p class="text-sm text-gray-600">Knowledge Check</p>
                  <div class="mt-3 bg-gray-50 p-3 rounded">
                    <p>This quiz contains ${item.questions.length} question${item.questions.length !== 1 ? 's' : ''}.</p>
                    <button class="start-quiz-btn mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" data-quiz-index="${index}">
                      Start Quiz
                    </button>
                  </div>
                </div>
              `;
              break;
              
            default:
              contentHTML += `
                <div class="module-item p-4 border-b">
                  <h4 class="font-semibold">${index + 1}. ${item.title}</h4>
                  <p class="text-sm text-gray-600">${item.type}</p>
                  <p class="mt-2">${item.description || ''}</p>
                </div>
              `;
          }
        });
      } else {
        contentHTML = '<p class="text-center text-gray-600 py-4">No content available for this module yet.</p>';
      }
      
      // Module progress
      const userProgress = await checkModuleProgress(moduleId);
      const progressPercentage = userProgress ? userProgress.percentComplete : 0;
      
      // Update modal content
      const moduleModalContent = document.querySelector('#module-view-modal > div');
      moduleModalContent.innerHTML = `
        <button id="close-module-btn" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <i class="fas fa-times fa-lg"></i>
        </button>
        
        <div class="module-header mb-6">
          <h3 class="text-2xl font-semibold">${module.title}</h3>
          <p class="text-gray-600">${module.description}</p>
          
          <div class="flex flex-wrap items-center mt-3">
            <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
              ${module.difficulty}
            </span>
            <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
              ${module.duration}
            </span>
            ${module.certification && module.certification.available ? 
              `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                Certification
              </span>` : ''}
          </div>
          
          <div class="mt-4">
            <p class="text-sm font-medium mb-1">Your progress: ${progressPercentage}%</p>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progressPercentage}%"></div>
            </div>
          </div>
        </div>
        
        <div class="module-skills mb-6">
          <h4 class="font-semibold mb-2">Skills You'll Learn:</h4>
          <div class="flex flex-wrap">
            ${module.skills.map(skill => `
              <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                ${skill}
              </span>
            `).join('')}
          </div>
        </div>
        
        ${module.prerequisites && module.prerequisites.length ? `
          <div class="module-prerequisites mb-6">
            <h4 class="font-semibold mb-2">Prerequisites:</h4>
            <ul class="list-disc pl-5">
              ${module.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="module-content border rounded mb-6">
          <h4 class="font-semibold p-4 bg-gray-50 border-b">Module Content</h4>
          ${contentHTML}
        </div>
        
        ${module.assessmentCriteria && module.assessmentCriteria.length ? `
          <div class="module-assessment mb-6">
            <h4 class="font-semibold mb-2">Assessment Criteria:</h4>
            <ul class="list-disc pl-5">
              ${module.assessmentCriteria.map(criterion => `<li>${criterion}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${module.expertFeedback && module.expertFeedback.available ? `
          <div class="module-feedback mb-6">
            <h4 class="font-semibold mb-2">Expert Feedback:</h4>
            <p>Submit your work to receive personalized feedback from our experts.</p>
            <button id="request-feedback-btn" class="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              Request Expert Feedback
            </button>
          </div>
        ` : ''}
        
        ${module.certification && module.certification.available ? `
          <div class="module-certification mb-6">
            <h4 class="font-semibold mb-2">Certification:</h4>
            <p>Complete this module to earn a certificate.</p>
            <p class="text-sm text-gray-600 mt-1">Requirements:</p>
            <ul class="list-disc pl-5 text-sm text-gray-600">
              ${module.certification.requirements.map(req => `<li>${req}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
      
      // Re-attach close button event
      document.getElementById('close-module-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Set up video play buttons
      document.querySelectorAll('.play-video-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const videoUrl = btn.dataset.videoUrl;
          playVideo(videoUrl, moduleId);
        });
      });
      
      // Set up practice submission buttons
      document.querySelectorAll('.submit-practice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showPracticeSubmissionForm(moduleId);
        });
      });
      
      // Set up quiz buttons
      document.querySelectorAll('.start-quiz-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const quizIndex = parseInt(btn.dataset.quizIndex);
          startQuiz(module.content[quizIndex], moduleId);
        });
      });
      
      // Set up expert feedback button
      const feedbackBtn = document.getElementById('request-feedback-btn');
      if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
          requestExpertFeedback(moduleId);
        });
      }
      
    } catch (err) {
      console.error('Error loading module:', err);
      
      // Update modal with error message
      const moduleModalContent = document.querySelector('#module-view-modal > div');
      moduleModalContent.innerHTML = `
        <button id="close-module-btn" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <i class="fas fa-times fa-lg"></i>
        </button>
        <div class="py-8 text-center">
          <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
          <p class="text-lg">Error loading module. Please try again later.</p>
        </div>
      `;
      
      // Re-attach close button event
      document.getElementById('close-module-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }
  
  // 8️⃣ Check module progress for current user
  async function checkModuleProgress(moduleId) {
    try {
      const response = await fetch(`/api/library/progress?moduleId=${moduleId}&userId=${currentUser.id}`);
      const { success, data } = await response.json();
      
      if (success) {
        return data;
      }
      
      return null;
    } catch (err) {
      console.error('Error checking module progress:', err);
      return null;
    }
  }
  
  // 9️⃣ Play video from a module
  function playVideo(videoUrl, moduleId) {
    // Create video player modal
    const videoModal = document.createElement('div');
    videoModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    videoModal.id = 'video-player-modal';
    
    videoModal.innerHTML = `
      <div class="relative w-full max-w-4xl mx-4">
        <button id="close-video-btn" class="absolute -top-10 right-0 text-white hover:text-gray-300">
          <i class="fas fa-times fa-lg"></i>
        </button>
        <div class="aspect-w-16 aspect-h-9 bg-black rounded overflow-hidden">
          <video id="module-video" controls class="w-full h-full">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    `;
    
    document.body.appendChild(videoModal);
    
    // Set up close button
    document.getElementById('close-video-btn').addEventListener('click', () => {
      document.body.removeChild(videoModal);
    });
    
    // Get video element
    const videoElement = document.getElementById('module-video');
    
    // Track video progress
    videoElement.addEventListener('ended', () => {
      updateModuleProgress(moduleId, 'video', videoUrl);
    });
    
    // Auto-play video
    videoElement.play();
  }
  
  // 🔟 Update user's progress for a module
  async function updateModuleProgress(moduleId, itemType, itemId) {
    try {
      await fetch('/api/library/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          moduleId,
          itemType,
          itemId,
          completed: true
        })
      });
      
      console.log(`Updated progress for ${itemType} in module ${moduleId}`);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
}



// 1️⃣3️⃣ Request expert feedback
function requestExpertFeedback(moduleId) {
    const feedbackModal = document.createElement('div');
    feedbackModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    feedbackModal.id = 'feedback-request-modal';
    
    feedbackModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Request Expert Feedback</h3>
        <form id="feedback-request-form">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="feedback-type">Select Feedback Type</label>
            <select 
              id="feedback-type" 
              class="w-full p-2 border rounded" 
              required
            >
              <option value="">-- Select an option --</option>
              <option value="review">Review my work</option>
              <option value="guidance">Get guidance on a specific topic</option>
              <option value="critique">Detailed critique of my technique</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="feedback-details">Details</label>
            <textarea 
              id="feedback-details" 
              class="w-full p-2 border rounded" 
              rows="4"
              placeholder="Describe what you need help with or what specific feedback you're looking for..."
              required
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="feedback-file">Upload Reference (optional)</label>
            <input 
              type="file" 
              id="feedback-file" 
              class="w-full p-2 border rounded"
            >
            <p class="text-xs text-gray-500 mt-1">Share your work or a reference file</p>
          </div>
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" id="schedule-call" class="mr-2">
              <span>Schedule a video call with an expert</span>
            </label>
          </div>
          <div id="zoom-options" class="mb-4 hidden">
            <label class="block text-gray-700 mb-2" for="preferred-time">Preferred Time</label>
            <input 
              type="datetime-local" 
              id="preferred-time" 
              class="w-full p-2 border rounded"
              min="${new Date().toISOString().slice(0, 16)}"
            >
          </div>
          <div class="flex justify-end">
            <button 
              type="button" 
              id="cancel-feedback" 
              class="bg-gray-500 text-white px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-purple-600 text-white px-4 py-2 rounded"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(feedbackModal);
    
    // Toggle zoom options when checkbox is clicked
    const scheduleCallCheckbox = document.getElementById('schedule-call');
    scheduleCallCheckbox.addEventListener('change', () => {
      const zoomOptions = document.getElementById('zoom-options');
      if (scheduleCallCheckbox.checked) {
        zoomOptions.classList.remove('hidden');
      } else {
        zoomOptions.classList.add('hidden');
      }
    });
    
    // Set up event listeners
    document.getElementById('cancel-feedback').addEventListener('click', () => {
      document.body.removeChild(feedbackModal);
    });
    
    document.getElementById('feedback-request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const feedbackType = document.getElementById('feedback-type').value;
      const details = document.getElementById('feedback-details').value;
      const scheduleCall = document.getElementById('schedule-call').checked;
      const preferredTime = scheduleCall ? document.getElementById('preferred-time').value : null;
      
      // Get file if one was selected
      const fileInput = document.getElementById('feedback-file');
      const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      
      // Create form data
      const formData = new FormData();
      formData.append('moduleId', moduleId);
      formData.append('userId', currentUser.id);
      formData.append('feedbackType', feedbackType);
      formData.append('details', details);
      formData.append('scheduleCall', scheduleCall);
      
      if (scheduleCall && preferredTime) {
        formData.append('preferredTime', preferredTime);
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      try {
        // Show loading state
        const submitBtn = document.querySelector('#feedback-request-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
        submitBtn.disabled = true;
        
        // Submit request
        const response = await fetch('/api/library/feedback-requests', {
          method: 'POST',
          body: formData
        });
        
        const { success, sessionId } = await response.json();
        
        if (success) {
          // Remove modal
          document.body.removeChild(feedbackModal);
          
          if (scheduleCall && sessionId) {
            alert(`Your feedback request has been submitted! A Zoom session has been scheduled. You'll receive an email with the details.`);
          } else {
            alert('Your feedback request has been submitted! An expert will respond shortly.');
          }
        } else {
          alert('Failed to submit your request. Please try again.');
          submitBtn.innerHTML = 'Submit Request';
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error('Error requesting expert feedback:', err);
        alert('An error occurred. Please try again.');
        
        const submitBtn = document.querySelector('#feedback-request-form button[type="submit"]');
        submitBtn.innerHTML = 'Submit Request';
        submitBtn.disabled = false;
      }
    });
  }
  
  // 1️⃣4️⃣ Show form to create a new learning module (for admins and experts)
  function showCreateModuleForm() {
    const createModuleModal = document.createElement('div');
    createModuleModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto';
    createModuleModal.id = 'create-module-modal';
    
    createModuleModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl my-8 mx-4 relative max-h-screen overflow-y-auto">
        <button id="close-create-module" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <i class="fas fa-times fa-lg"></i>
        </button>
        
        <h3 class="text-xl font-semibold mb-6">Create New Learning Module</h3>
        
        <form id="create-module-form">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-gray-700 mb-2" for="module-title">Module Title</label>
              <input 
                type="text" 
                id="module-title" 
                class="w-full p-2 border rounded" 
                required
              >
            </div>
            <div>
              <label class="block text-gray-700 mb-2" for="module-difficulty">Difficulty Level</label>
              <select 
                id="module-difficulty" 
                class="w-full p-2 border rounded" 
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="module-description">Description</label>
            <textarea 
              id="module-description" 
              class="w-full p-2 border rounded" 
              rows="3"
              required
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-gray-700 mb-2" for="module-duration">Estimated Duration</label>
              <input 
                type="text" 
                id="module-duration" 
                class="w-full p-2 border rounded" 
                placeholder="e.g. 2 hours"
                required
              >
            </div>
            <div>
              <label class="block text-gray-700 mb-2" for="module-skills">Skills (comma separated)</label>
              <input 
                type="text" 
                id="module-skills" 
                class="w-full p-2 border rounded" 
                placeholder="e.g. Editing, Color grading, Transitions"
                required
              >
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="module-prerequisites">Prerequisites (comma separated)</label>
            <input 
              type="text" 
              id="module-prerequisites" 
              class="w-full p-2 border rounded" 
              placeholder="e.g. Basic software knowledge, Camera operation"
            >
          </div>
          
          <div class="mb-6">
            <h4 class="font-semibold mb-3">Module Content</h4>
            <p class="text-sm text-gray-600 mb-3">You'll be able to add content items after creating the module.</p>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="module-assessment">Assessment Criteria (comma separated)</label>
            <input 
              type="text" 
              id="module-assessment" 
              class="w-full p-2 border rounded" 
              placeholder="e.g. Technical proficiency, Creative application, Workflow efficiency"
            >
          </div>
          
          <div class="flex flex-col md:flex-row mb-6">
            <div class="md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <label class="flex items-center">
                <input type="checkbox" id="module-expert-feedback" class="mr-2" checked>
                <span>Enable expert feedback</span>
              </label>
            </div>
            <div class="md:w-1/2">
              <label class="flex items-center">
                <input type="checkbox" id="module-certification" class="mr-2">
                <span>Offer certification for completion</span>
              </label>
            </div>
          </div>
          
          <div id="certification-options" class="mb-6 hidden">
            <label class="block text-gray-700 mb-2" for="certification-requirements">Certification Requirements</label>
            <textarea 
              id="certification-requirements" 
              class="w-full p-2 border rounded" 
              rows="2"
              placeholder="e.g. Complete all lessons, Score 80% or higher on assessment"
            ></textarea>
          </div>
          
          <div class="flex justify-end">
            <button 
              type="button" 
              id="cancel-create-module" 
              class="bg-gray-500 text-white px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-green-600 text-white px-4 py-2 rounded"
            >
              Create Module
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(createModuleModal);
    
    // Toggle certification options
    const certCheckbox = document.getElementById('module-certification');
    certCheckbox.addEventListener('change', () => {
      const certOptions = document.getElementById('certification-options');
      if (certCheckbox.checked) {
        certOptions.classList.remove('hidden');
      } else {
        certOptions.classList.add('hidden');
      }
    });
    
    // Set up event listeners
    document.getElementById('close-create-module').addEventListener('click', () => {
      document.body.removeChild(createModuleModal);
    });
    
    document.getElementById('cancel-create-module').addEventListener('click', () => {
      document.body.removeChild(createModuleModal);
    });
    
    document.getElementById('create-module-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('module-title').value;
      const difficulty = document.getElementById('module-difficulty').value;
      const description = document.getElementById('module-description').value;
      const duration = document.getElementById('module-duration').value;
      const skills = document.getElementById('module-skills').value.split(',').map(skill => skill.trim());
      const prerequisites = document.getElementById('module-prerequisites').value
        ? document.getElementById('module-prerequisites').value.split(',').map(prereq => prereq.trim())
        : [];
      const assessmentCriteria = document.getElementById('module-assessment').value
        ? document.getElementById('module-assessment').value.split(',').map(criterion => criterion.trim())
        : [];
      const expertFeedback = document.getElementById('module-expert-feedback').checked;
      const certification = document.getElementById('module-certification').checked;
      const certificationRequirements = certification && document.getElementById('certification-requirements').value
        ? document.getElementById('certification-requirements').value.split(',').map(req => req.trim())
        : [];
      
      // Create module object
      const moduleData = {
        subcategoryId: currentSubcategory.id,
        title,
        description,
        difficulty,
        duration,
        skills,
        prerequisites,
        assessmentCriteria,
        expertFeedback: {
          available: expertFeedback,
          experts: [] // Will be assigned by the system
        },
        certification: certification ? {
          available: true,
          requirements: certificationRequirements
        } : {
          available: false
        },
        createdBy: currentUser.id,
        content: [] // Will be added later
      };
      
      try {
        // Show loading state
        const submitBtn = document.querySelector('#create-module-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating...';
        submitBtn.disabled = true;
        
        // Create module
        const response = await fetch('/api/library/modules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(moduleData)
        });
        
        const { success, data } = await response.json();
        
        if (success && data) {
          // Remove modal
          document.body.removeChild(createModuleModal);
          
          // Show success message
          alert('Module created successfully! You can now add content to it.');
          
          // Redirect to module content editor
          window.location.href = `/library/module-editor.html?id=${data.id}`;
        } else {
          alert('Failed to create module. Please try again.');
          submitBtn.innerHTML = 'Create Module';
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error('Error creating module:', err);
        alert('An error occurred. Please try again.');
        
        const submitBtn = document.querySelector('#create-module-form button[type="submit"]');
        submitBtn.innerHTML = 'Create Module';
        submitBtn.disabled = false;
      }
    });
  }
  
  // 1️⃣5️⃣ Add admin button event listener
  if (addCatBtn) {
    addCatBtn.addEventListener('click', showAddCategoryForm);
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async () => {
    const authSuccess = await initAuth();
    if (authSuccess) {
      await loadCategories();
    }
  });// 1️⃣1️⃣ Show practice submission form
  function showPracticeSubmissionForm(moduleId) {
    const submissionModal = document.createElement('div');
    submissionModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    submissionModal.id = 'practice-submission-modal';
    
    submissionModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Submit Your Practice Work</h3>
        <form id="practice-submission-form">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="submission-notes">Notes (optional)</label>
            <textarea 
              id="submission-notes" 
              class="w-full p-2 border rounded" 
              rows="3"
              placeholder="Any comments or questions about your submission..."
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="submission-file">Upload Your Work</label>
            <input 
              type="file" 
              id="submission-file" 
              class="w-full p-2 border rounded" 
              required
            >
            <p class="text-xs text-gray-500 mt-1">Supported formats: .mp4, .mov, .zip, .pdf, .jpg, .png</p>
          </div>
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" id="request-expert-review" class="mr-2">
              <span>Request expert review for this submission</span>
            </label>
          </div>
          <div class="flex justify-end">
            <button 
              type="button" 
              id="cancel-submission" 
              class="bg-gray-500 text-white px-4 py-2 rounded mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="bg-green-600 text-white px-4 py-2 rounded"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(submissionModal);
    
    // Set up event listeners
    document.getElementById('cancel-submission').addEventListener('click', () => {
      document.body.removeChild(submissionModal);
    });
    
    document.getElementById('practice-submission-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const notes = document.getElementById('submission-notes').value;
      const fileInput = document.getElementById('submission-file');
      const requestExpertReview = document.getElementById('request-expert-review').checked;
      
      if (!fileInput.files || !fileInput.files[0]) {
        alert('Please select a file to upload.');
        return;
      }
      
      const file = fileInput.files[0];
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', notes);
      formData.append('moduleId', moduleId);
      formData.append('userId', currentUser.id);
      formData.append('requestExpertReview', requestExpertReview);
      
      try {
        // Show loading state
        const submitBtn = document.querySelector('#practice-submission-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading...';
        submitBtn.disabled = true;
        
        // Upload file
        const response = await fetch('/api/library/submissions', {
          method: 'POST',
          body: formData
        });
        
        const { success } = await response.json();
        
        if (success) {
          // Remove modal
          document.body.removeChild(submissionModal);
          
          // Show success message
          alert('Your work has been submitted successfully!');
          
          // Update progress
          updateModuleProgress(moduleId, 'practice', 'submission');
          
          // If expert review requested, show confirmation
          if (requestExpertReview) {
            alert('An expert will review your submission and provide feedback soon.');
          }
        } else {
          alert('Failed to submit your work. Please try again.');
          submitBtn.innerHTML = 'Submit';
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error('Error submitting practice work:', err);
        alert('An error occurred. Please try again.');
        
        const submitBtn = document.querySelector('#practice-submission-form button[type="submit"]');
        submitBtn.innerHTML = 'Submit';
        submitBtn.disabled = false;
      }
    });
  }
  
  // 1️⃣2️⃣ Start a quiz
  function startQuiz(quizContent, moduleId) {
    if (!quizContent || !quizContent.questions || !quizContent.questions.length) {
      alert('Quiz content not available.');
      return;
    }
    
    const quizModal = document.createElement('div');
    quizModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    quizModal.id = 'quiz-modal';
    
    // Start with first question
    const firstQuestion = quizContent.questions[0];
    const totalQuestions = quizContent.questions.length;
    
    quizModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">${quizContent.title}</h3>
          <div class="text-sm text-gray-600">Question 1 of ${totalQuestions}</div>
        </div>
        
        <div id="quiz-container" data-current-question="0" data-total-questions="${totalQuestions}" data-score="0">
          <div class="mb-6">
            <h4 class="font-medium mb-3">${firstQuestion.question}</h4>
            <div class="space-y-2">
              ${firstQuestion.options.map((option, idx) => `
                <label class="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="radio" 
                    name="q0" 
                    value="${idx}" 
                    class="mt-1 mr-3"
                  >
                  <span>${option}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="flex justify-between">
            <button 
              type="button" 
              id="close-quiz" 
              class="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button 
              type="button" 
              id="next-question" 
              class="bg-blue-600 text-white px-4 py-2 rounded"
              disabled
            >
              Next Question
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(quizModal);
    
    // Set up event listeners
    document.getElementById('close-quiz').addEventListener('click', () => {
      const confirmClose = confirm('Are you sure you want to exit the quiz? Your progress will be lost.');
      if (confirmClose) {
        document.body.removeChild(quizModal);
      }
    });
    
    // Enable "Next" button when an option is selected
    const radioButtons = document.querySelectorAll(`input[name="q0"]`);
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        document.getElementById('next-question').disabled = false;
      });
    });
    
    // Handle next question button
    document.getElementById('next-question').addEventListener('click', () => {
      const quizContainer = document.getElementById('quiz-container');
      const currentQuestionIdx = parseInt(quizContainer.dataset.currentQuestion);
      const totalQuestions = parseInt(quizContainer.dataset.totalQuestions);
      let currentScore = parseInt(quizContainer.dataset.score);
      
      // Check if answer is correct
      const selectedOption = document.querySelector(`input[name="q${currentQuestionIdx}"]:checked`);
      if (selectedOption) {
        const selectedAnswerIdx = parseInt(selectedOption.value);
        const correctAnswerIdx = quizContent.questions[currentQuestionIdx].correctAnswer;
        
        if (selectedAnswerIdx === correctAnswerIdx) {
          currentScore++;
          quizContainer.dataset.score = currentScore;
        }
      }
      
      // Move to next question or finish quiz
      if (currentQuestionIdx < totalQuestions - 1) {
        // Next question
        const nextQuestionIdx = currentQuestionIdx + 1;
        const nextQuestion = quizContent.questions[nextQuestionIdx];
        
        quizContainer.dataset.currentQuestion = nextQuestionIdx;
        
        quizContainer.innerHTML = `
          <div class="mb-6">
            <h4 class="font-medium mb-3">${nextQuestion.question}</h4>
            <div class="space-y-2">
              ${nextQuestion.options.map((option, idx) => `
                <label class="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="radio" 
                    name="q${nextQuestionIdx}" 
                    value="${idx}" 
                    class="mt-1 mr-3"
                  >
                  <span>${option}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="flex justify-between">
            <button 
              type="button" 
              id="close-quiz" 
              class="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button 
              type="button" 
              id="next-question" 
              class="bg-blue-600 text-white px-4 py-2 rounded"
              disabled
            >
              ${nextQuestionIdx === totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'}
            </button>
          </div>
        `;
        
        // Update question counter
        document.querySelector('#quiz-modal .text-sm').textContent = `Question ${nextQuestionIdx + 1} of ${totalQuestions}`;
        
        // Re-attach event listeners
        document.getElementById('close-quiz').addEventListener('click', () => {
          const confirmClose = confirm('Are you sure you want to exit the quiz? Your progress will be lost.');
          if (confirmClose) {
            document.body.removeChild(quizModal);
          }
        });
        
        // Enable "Next" button when an option is selected
        const radioButtons = document.querySelectorAll(`input[name="q${nextQuestionIdx}"]`);
        radioButtons.forEach(radio => {
          radio.addEventListener('change', () => {
            document.getElementById('next-question').disabled = false;
          });
        });
        
        // Re-attach next question handler
        document.getElementById('next-question').addEventListener('click', arguments.callee);
        
      } else {
        // Quiz completed
        const scorePercentage = Math.round((currentScore / totalQuestions) * 100);
        const passed = scorePercentage >= 70; // Assuming 70% is passing
        
        quizContainer.innerHTML = `
          <div class="text-center py-6">
            <div class="mb-4">
              <i class="fas ${passed ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'} fa-3x"></i>
            </div>
            <h4 class="text-xl font-semibold mb-2">Quiz Completed</h4>
            <p class="text-lg mb-1">Your Score: ${scorePercentage}%</p>
            <p class="mb-4 ${passed ? 'text-green-600' : 'text-red-600'}">
              ${passed ? 'Congratulations! You passed the quiz.' : 'You did not pass the quiz. Try again later.'}
            </p>
            <div class="text-sm text-gray-600 mb-6">
              You answered ${currentScore} out of ${totalQuestions} questions correctly.
            </div>
            
            <div class="flex justify-center space-x-4">
              <button 
                type="button" 
                id="close-quiz-results" 
                class="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
              ${!passed ? `
                <button 
                  type="button" 
                  id="retry-quiz" 
                  class="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Try Again
                </button>
              ` : ''}
            </div>
          </div>
        `;
        
        // Update module progress if passed
        if (passed) {
          updateModuleProgress(moduleId, 'quiz', quizContent.id || 'quiz');
        }
        
        // Re-attach close button event
        document.getElementById('close-quiz-results').addEventListener('click', () => {
          document.body.removeChild(quizModal);
        });
        
        // Re-attach retry button if it exists
        const retryBtn = document.getElementById('retry-quiz');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            document.body.removeChild(quizModal);
            startQuiz(quizContent, moduleId);
          });
        }
      }
    });
  }