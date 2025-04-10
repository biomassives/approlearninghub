// user-involvement-dashboard.js
// Dashboard component for displaying user involvement in clinics, modules, and library entries

import { getGanttData, getUserInvolvement, handleApiError } from './content-api-client.js';

// Main dashboard class
class UserInvolvementDashboard {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${containerId}" not found.`);
    }
    
    this.options = {
      userId: null, // If null, uses current user
      startDate: null,
      endDate: null,
      includeCompleted: true,
      view: 'all', // 'all', 'clinics', 'modules', 'library', 'videos'
      ...options
    };
    
    this.data = {
      clinics: [],
      modules: [],
      library: [],
      videos: []
    };
    
    this.error = null;
    this.isLoading = false;
    
    // Create dashboard structure
    this.createStructure();
  }
  
  // Create initial dashboard structure
  createStructure() {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h2>Involvement Dashboard</h2>
        <div class="dashboard-controls">
          <select id="view-selector">
            <option value="all">All Activities</option>
            <option value="clinics">Clinics</option>
            <option value="modules">Training Modules</option>
            <option value="library">Library Entries</option>
            <option value="videos">Videos</option>
          </select>
          <label class="checkbox-label">
            <input type="checkbox" id="include-completed" checked>
            Include Completed
          </label>
        </div>
      </div>
      
      <div class="dashboard-date-range">
        <label>
          Start Date:
          <input type="date" id="start-date">
        </label>
        <label>
          End Date:
          <input type="date" id="end-date">
        </label>
        <button id="apply-filters">Apply Filters</button>
        <button id="clear-filters">Clear Filters</button>
      </div>
      
      <div id="dashboard-error" class="error-message hidden"></div>
      
      <div id="dashboard-loading" class="loading-indicator hidden">
        <div class="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
      
      <div id="dashboard-content" class="dashboard-content">
        <div id="gantt-chart" class="gantt-chart"></div>
        
        <div id="involvement-stats" class="involvement-stats"></div>
        
        <div class="involvement-panels">
          <div id="clinics-panel" class="involvement-panel">
            <h3>Clinics</h3>
            <div id="clinics-list" class="content-list"></div>
          </div>
          
          <div id="modules-panel" class="involvement-panel">
            <h3>Training Modules</h3>
            <div id="modules-list" class="content-list"></div>
          </div>
          
          <div id="library-panel" class="involvement-panel">
            <h3>Library Contributions</h3>
            <div id="library-list" class="content-list"></div>
          </div>
          
          <div id="videos-panel" class="involvement-panel">
            <h3>Video Interactions</h3>
            <div id="videos-list" class="content-list"></div>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('view-selector').addEventListener('change', this.handleViewChange.bind(this));
    document.getElementById('include-completed').addEventListener('change', this.handleCompletedChange.bind(this));
    document.getElementById('apply-filters').addEventListener('click', this.applyFilters.bind(this));
    document.getElementById('clear-filters').addEventListener('click', this.clearFilters.bind(this));
    
    // Set initial values from options
    if (this.options.startDate) {
      document.getElementById('start-date').value = this.formatDateForInput(this.options.startDate);
    }
    if (this.options.endDate) {
      document.getElementById('end-date').value = this.formatDateForInput(this.options.endDate);
    }
    document.getElementById('view-selector').value = this.options.view;
    document.getElementById('include-completed').checked = this.options.includeCompleted;
  }
  
  // Format date for input elements
  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle view change
  handleViewChange(event) {
    this.options.view = event.target.value;
    this.loadData();
  }
  
  // Handle completed checkbox change
  handleCompletedChange(event) {
    this.options.includeCompleted = event.target.checked;
    this.loadData();
  }
  
  // Apply date filters
  applyFilters() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    this.options.startDate = startDateInput.value || null;
    this.options.endDate = endDateInput.value || null;
    
    this.loadData();
  }
  
  // Clear all filters
  clearFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('view-selector').value = 'all';
    document.getElementById('include-completed').checked = true;
    
    this.options = {
      ...this.options,
      startDate: null,
      endDate: null,
      view: 'all',
      includeCompleted: true
    };
    
    this.loadData();
  }
  
  // Show loading state
  setLoading(isLoading) {
    this.isLoading = isLoading;
    const loadingElement = document.getElementById('dashboard-loading');
    loadingElement.classList.toggle('hidden', !isLoading);
  }
  
  // Show error message
  setError(message) {
    this.error = message;
    const errorElement = document.getElementById('dashboard-error');
    
    if (message) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    } else {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
  }
  
  // Load dashboard data
  async loadData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      // Fetch gantt chart data
      const ganttResult = await getGanttData({
        view: this.options.view,
        userId: this.options.userId,
        startDate: this.options.startDate,
        endDate: this.options.endDate,
        includeCompleted: this.options.includeCompleted
      });
      
      // Store the fetched data
      this.data = ganttResult.data;
      
      // Render the dashboard components
      this.renderGanttChart();
      this.renderStats();
      this.renderLists();
      
    } catch (error) {
      handleApiError(error, this.setError.bind(this), 'Failed to load dashboard data');
    } finally {
      this.setLoading(false);
    }
  }
  
  // Render Gantt chart
  renderGanttChart() {
    const ganttElement = document.getElementById('gantt-chart');
    
    // Combine all data for the Gantt chart
    const allItems = [
      ...this.data.clinics,
      ...this.data.modules,
      ...this.data.library,
      ...this.data.videos
    ].filter(item => item.start); // Only include items with start dates
    
    if (allItems.length === 0) {
      ganttElement.innerHTML = '<div class="empty-state">No timeline data available for the selected filters.</div>';
      return;
    }
    
    // Sort items by start date
    allItems.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    // Calculate date range for the Gantt chart
    const minDate = new Date(Math.min(...allItems.map(item => new Date(item.start).getTime())));
    const maxDate = new Date(Math.max(...allItems.map(item => new Date(item.end || item.start).getTime())));
    
    // Add 10% padding to the date range
    const rangeDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    const paddingDays = Math.max(7, Math.ceil(rangeDays * 0.1));
    
    minDate.setDate(minDate.getDate() - paddingDays);
    maxDate.setDate(maxDate.getDate() + paddingDays);
    
    // Calculate total time range in days
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    
    // Generate month headers
    const months = [];
    const currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
      months.push({
        month: currentDate.toLocaleString('default', { month: 'short' }),
        year: currentDate.getFullYear(),
        start: new Date(currentDate)
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Calculate position and width for each month header
    months.forEach((month, index) => {
      // Calculate position as percentage from start date
      const startPosition = ((month.start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      
      // Calculate end of month
      const endOfMonth = new Date(month.start);
      if (index < months.length - 1) {
        endOfMonth.setTime(months[index + 1].start.getTime());
      } else {
        endOfMonth.setTime(maxDate.getTime());
      }
      
      // Calculate width as percentage of total range
      const width = ((endOfMonth - month.start) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      
      month.position = startPosition;
      month.width = width;
    });
    
    // Build Gantt chart HTML
    let ganttHtml = `
      <div class="gantt-timeline">
        <div class="gantt-months">
          ${months.map(month => `
            <div class="gantt-month" style="left: ${month.position}%; width: ${month.width}%">
              ${month.month} ${month.year}
            </div>
          `).join('')}
        </div>
        
        <div class="gantt-items">
          ${allItems.map((item, index) => {
            // Calculate position and width for each item
            const startDate = new Date(item.start);
            const endDate = new Date(item.end || item.start);
            
            // Add one day to end date if it's the same as start date
            if (startDate.getTime() === endDate.getTime()) {
              endDate.setDate(endDate.getDate() + 1);
            }
            
            const startPosition = ((startDate - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
            const width = ((endDate - startDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
            
            // Determine color based on type and status
            let itemClass = `gantt-item gantt-item-${item.type}`;
            if (item.status === 'completed' || item.status === 'published') {
              itemClass += ' gantt-item-completed';
            } else if (item.status === 'draft' || item.status === 'enrolled') {
              itemClass += ' gantt-item-in-progress';
            }
            
            return `
              <div class="${itemClass}" 
                   style="left: ${startPosition}%; width: ${width}%"
                   data-id="${item.id}"
                   data-type="${item.type}">
                <div class="gantt-item-label">${item.title}</div>
                ${item.userInvolvement ? `
                  <div class="gantt-item-progress" style="width: ${item.userInvolvement.progress || 0}%"></div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    ganttElement.innerHTML = ganttHtml;
    
    // Add event listeners to Gantt items
    const ganttItems = ganttElement.querySelectorAll('.gantt-item');
    ganttItems.forEach(item => {
      item.addEventListener('click', this.handleItemClick.bind(this));
    });
  }
  
  // Handle click on Gantt item
  handleItemClick(event) {
    const itemElement = event.currentTarget;
    const itemId = itemElement.dataset.id;
    const itemType = itemElement.dataset.type;
    
    // Find the corresponding item in the data
    let clickedItem;
    switch (itemType) {
      case 'clinic':
        clickedItem = this.data.clinics.find(clinic => clinic.id === itemId);
        break;
      case 'module':
        clickedItem = this.data.modules.find(module => module.id === itemId);
        break;
      case 'library':
        clickedItem = this.data.library.find(entry => entry.id === itemId);
        break;
      case 'video':
        clickedItem = this.data.videos.find(video => video.id === itemId);
        break;
    }
    
    if (clickedItem) {
      this.showItemDetails(clickedItem);
    }
  }
  
  // Show details for clicked item
  showItemDetails(item) {
    // Create modal popup with item details
    const modal = document.createElement('div');
    modal.className = 'item-details-modal';
    
    // Format dates for display
    const startDate = item.start ? new Date(item.start).toLocaleDateString() : 'N/A';
    const endDate = item.end ? new Date(item.end).toLocaleDateString() : 'N/A';
    
    // Status badge
    let statusBadge = '';
    if (item.status) {
      const statusClass = 
        item.status === 'completed' || item.status === 'published' ? 'status-completed' :
        item.status === 'in-progress' || item.status === 'enrolled' ? 'status-in-progress' : 'status-default';
      
      statusBadge = `<span class="status-badge ${statusClass}">${item.status}</span>`;
    }
    
    // Build modal content based on item type
    let modalContent = '';
    
    switch (item.type) {
      case 'clinic':
        modalContent = `
          <h3>${item.title} ${statusBadge}</h3>
          <div class="item-details">
            <p>${item.description || 'No description available.'}</p>
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Clinic</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">${endDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${item.location || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Participants:</span>
                <span class="detail-value">${item.participants || 0}</span>
              </div>
              ${item.userInvolvement ? `
                <div class="detail-row">
                  <span class="detail-label">Your Role:</span>
                  <span class="detail-value">${item.userInvolvement.role || 'Participant'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">${item.userInvolvement.status || 'N/A'}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;
        
      case 'module':
        modalContent = `
          <h3>${item.title} ${statusBadge}</h3>
          <div class="item-details">
            <p>${item.description || 'No description available.'}</p>
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Training Module</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Enrollment Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Completion Date:</span>
                <span class="detail-value">${endDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Difficulty:</span>
                <span class="detail-value">${item.difficulty || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Points:</span>
                <span class="detail-value">${item.points || 'N/A'}</span>
              </div>
              ${item.userInvolvement ? `
                <div class="detail-row">
                  <span class="detail-label">Progress:</span>
                  <span class="detail-value">${item.userInvolvement.progress || 0}%</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">${item.userInvolvement.status || 'N/A'}</span>
                </div>
              ` : ''}
            </div>
            ${item.userInvolvement ? `
              <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${item.userInvolvement.progress || 0}%"></div>
              </div>
            ` : ''}
          </div>
        `;
        break;
        
      case 'library':
        modalContent = `
          <h3>${item.title} ${statusBadge}</h3>
          <div class="item-details">
            <p>${item.description || 'No description available.'}</p>
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Library Entry${item.subtype ? ` (${item.subtype})` : ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Publication Date:</span>
                <span class="detail-value">${endDate}</span>
              </div>
              ${item.userInvolvement ? `
                <div class="detail-row">
                  <span class="detail-label">Your Contribution:</span>
                  <span class="detail-value">${item.userInvolvement.role || 'Contributor'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contribution Date:</span>
                  <span class="detail-value">${new Date(item.userInvolvement.date).toLocaleDateString() || 'N/A'}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;
        
      case 'video':
        modalContent = `
          <h3>${item.title} ${statusBadge}</h3>
          <div class="item-details">
            <p>${item.description || 'No description available.'}</p>
            ${item.youtubeId ? `
              <div class="video-thumbnail">
                <img src="https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg" alt="Video thumbnail">
                <div class="play-button"></div>
              </div>
            ` : ''}
            <div class="details-grid">
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Video</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Published Date:</span>
                <span class="detail-value">${endDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Creator:</span>
                <span class="detail-value">${item.creator || 'N/A'}</span>
              </div>
              ${item.youtubeId ? `
                <div class="detail-row">
                  <span class="detail-label">YouTube ID:</span>
                  <span class="detail-value">${item.youtubeId}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;
    }
    
    // Add close button and actions
    modalContent += `
      <div class="modal-actions">
        ${item.type === 'video' && item.youtubeId ? `
          <a href="https://www.youtube.com/watch?v=${item.youtubeId}" target="_blank" class="action-button">
            Watch Video
          </a>
        ` : ''}
        ${item.type === 'module' && item.userInvolvement ? `
          <a href="modules.html?id=${item.id}" class="action-button">
            Continue Module
          </a>
        ` : ''}
        <button class="close-button">Close</button>
      </div>
    `;
    
    // Set modal content and show it
    modal.innerHTML = `
      <div class="modal-content">
        ${modalContent}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close button
    modal.querySelector('.close-button').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Add event listener to close on outside click
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // If it's a video with thumbnail, add click handler to play
    if (item.type === 'video' && item.youtubeId) {
      const thumbnail = modal.querySelector('.video-thumbnail');
      if (thumbnail) {
        thumbnail.addEventListener('click', () => {
          // Create embedded player
          const videoContainer = document.createElement('div');
          videoContainer.className = 'video-embed';
          videoContainer.innerHTML = `
            <iframe 
              width="560" 
              height="315" 
              src="https://www.youtube.com/embed/${item.youtubeId}?autoplay=1" 
              title="YouTube video player" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          `;
          
          // Replace thumbnail with player
          thumbnail.parentNode.replaceChild(videoContainer, thumbnail);
        });
      }
    }
  }
  
  // Render statistics
  renderStats() {
    const statsElement = document.getElementById('involvement-stats');
    
    // Calculate statistics
    const totalClinics = this.data.clinics.length;
    const upcomingClinics = this.data.clinics.filter(c => 
      c.end && new Date(c.end) > new Date()
    ).length;
    
    const totalModules = this.data.modules.length;
    const completedModules = this.data.modules.filter(m => 
      m.userInvolvement && m.userInvolvement.status === 'completed'
    ).length;
    const inProgressModules = this.data.modules.filter(m => 
      m.userInvolvement && m.userInvolvement.status !== 'completed'
    ).length;
    
    const totalLibrary = this.data.library.length;
    
    const totalVideos = this.data.videos.length;
    
    // Build stats HTML
    const statsHtml = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Clinics</div>
          <div class="stat-value">${totalClinics}</div>
          <div class="stat-detail">
            <span>${upcomingClinics} upcoming</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">Training Modules</div>
          <div class="stat-value">${totalModules}</div>
          <div class="stat-detail">
            <span>${completedModules} completed</span>
            <span>${inProgressModules} in progress</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">Library Contributions</div>
          <div class="stat-value">${totalLibrary}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">Videos</div>
          <div class="stat-value">${totalVideos}</div>
        </div>
      </div>
    `;
    
    statsElement.innerHTML = statsHtml;
  }
  
  // Render content lists
  renderLists() {
    // Render clinics list
    this.renderClinicsList();
    
    // Render modules list
    this.renderModulesList();
    
    // Render library list
    this.renderLibraryList();
    
    // Render videos list
    this.renderVideosList();
  }
  
  // Render clinics list
  renderClinicsList() {
    const clinicsListElement = document.getElementById('clinics-list');
    const clinicsData = this.data.clinics;
    
    if (clinicsData.length === 0) {
      clinicsListElement.innerHTML = '<div class="empty-state">No clinics found.</div>';
      return;
    }
    
    // Sort clinics by start date, newest first
    clinicsData.sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Build HTML for clinics list
    const clinicsHtml = clinicsData.map(clinic => {
      const startDate = new Date(clinic.start).toLocaleDateString();
      const endDate = clinic.end ? new Date(clinic.end).toLocaleDateString() : 'N/A';
      
      // Determine if clinic is upcoming, ongoing, or past
      const now = new Date();
      const clinicStart = new Date(clinic.start);
      const clinicEnd = clinic.end ? new Date(clinic.end) : null;
      
      let timeStatus = '';
      if (clinicStart > now) {
        timeStatus = 'upcoming';
      } else if (clinicEnd && clinicEnd < now) {
        timeStatus = 'past';
      } else {
        timeStatus = 'ongoing';
      }
      
      // Status badge
      const statusBadge = clinic.status 
        ? `<span class="status-badge">${clinic.status}</span>`
        : '';
      
      // User involvement details
      const userRoleBadge = clinic.userInvolvement
        ? `<span class="role-badge">${clinic.userInvolvement.role || 'participant'}</span>`
        : '';
      
      return `
        <div class="list-item list-item-clinic ${timeStatus}" data-id="${clinic.id}">
          <div class="item-header">
            <h4>${clinic.title}</h4>
            <div class="item-badges">
              ${statusBadge}
              ${userRoleBadge}
            </div>
          </div>
          <div class="item-date">
            <span class="date-range">${startDate} - ${endDate}</span>
            <span class="time-status ${timeStatus}">${timeStatus}</span>
          </div>
          <p class="item-description">${
            clinic.description 
              ? (clinic.description.length > 100 
                 ? clinic.description.substring(0, 100) + '...' 
                 : clinic.description)
              : 'No description available.'
          }</p>
          ${clinic.location ? `<div class="item-location">📍 ${clinic.location}</div>` : ''}
        </div>
      `;
    }).join('');
    
    clinicsListElement.innerHTML = clinicsHtml;
    
    // Add event listeners to clinic items
    const clinicItems = clinicsListElement.querySelectorAll('.list-item-clinic');
    clinicItems.forEach(item => {
      item.addEventListener('click', (event) => {
        const clinicId = item.dataset.id;
        const clinic = clinicsData.find(c => c.id === clinicId);
        if (clinic) {
          this.showItemDetails(clinic);
        }
      });
    });
  }
  
  // Render modules list
  renderModulesList() {
    const modulesListElement = document.getElementById('modules-list');
    const modulesData = this.data.modules;
    
    if (modulesData.length === 0) {
      modulesListElement.innerHTML = '<div class="empty-state">No modules found.</div>';
      return;
    }
    
    // Sort modules - in progress first, then by progress percentage, then by start date
    modulesData.sort((a, b) => {
      // First sort by completion status (in-progress first)
      const aCompleted = a.userInvolvement?.status === 'completed';
      const bCompleted = b.userInvolvement?.status === 'completed';
      
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      
      // Then sort by progress percentage (higher first)
      const aProgress = a.userInvolvement?.progress || 0;
      const bProgress = b.userInvolvement?.progress || 0;
      
      if (aProgress !== bProgress) {
        return bProgress - aProgress;
      }
      
      // Finally sort by start date (newest first)
      return new Date(b.start) - new Date(a.start);
    });
    
    // Build HTML for modules list
    const modulesHtml = modulesData.map(module => {
      const enrollmentDate = module.start ? new Date(module.start).toLocaleDateString() : 'N/A';
      
      // Progress information
      const progress = module.userInvolvement?.progress || 0;
      
      // Status badge
      let statusClass = 'status-default';
      if (module.userInvolvement?.status === 'completed') {
        statusClass = 'status-completed';
      } else if (module.userInvolvement?.status === 'enrolled' || module.userInvolvement?.status === 'in-progress') {
        statusClass = 'status-in-progress';
      }
      
      const statusBadge = module.userInvolvement?.status 
        ? `<span class="status-badge ${statusClass}">${module.userInvolvement.status}</span>`
        : '';
      
      // Difficulty badge
      const difficultyBadge = module.difficulty 
        ? `<span class="difficulty-badge">${module.difficulty}</span>`
        : '';
      
      return `
        <div class="list-item list-item-module" data-id="${module.id}">
          <div class="item-header">
            <h4>${module.title}</h4>
            <div class="item-badges">
              ${statusBadge}
              ${difficultyBadge}
            </div>
          </div>
          <div class="item-progress">
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${progress}% complete</span>
          </div>
          <p class="item-description">${
            module.description 
              ? (module.description.length > 100 
                 ? module.description.substring(0, 100) + '...' 
                 : module.description)
              : 'No description available.'
          }</p>
          ${module.enrollmentId ? `
            <div class="item-continue">
              <a href="modules.html?id=${module.id}&enrollment=${module.enrollmentId}" class="continue-button">
                Continue Module
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    modulesListElement.innerHTML = modulesHtml;
    
    // Add event listeners to module items
    const moduleItems = modulesListElement.querySelectorAll('.list-item-module');
    moduleItems.forEach(item => {
      item.addEventListener('click', (event) => {
        // Don't trigger if clicked on the continue button
        if (event.target.classList.contains('continue-button')) {
          return;
        }
        
        const moduleId = item.dataset.id;
        const module = modulesData.find(m => m.id === moduleId);
        if (module) {
          this.showItemDetails(module);
        }
      });
    });
  }
  
  // Render library list
  renderLibraryList() {
    const libraryListElement = document.getElementById('library-list');
    const libraryData = this.data.library;
    
    if (libraryData.length === 0) {
      libraryListElement.innerHTML = '<div class="empty-state">No library contributions found.</div>';
      return;
    }
    
    // Sort library entries by contribution date, newest first
    libraryData.sort((a, b) => {
      // If userInvolvement exists with a date, use that
      const aDate = a.userInvolvement?.date ? new Date(a.userInvolvement.date) : new Date(a.start);
      const bDate = b.userInvolvement?.date ? new Date(b.userInvolvement.date) : new Date(b.start);
      
      return bDate - aDate;
    });
    
    // Build HTML for library list
    const libraryHtml = libraryData.map(entry => {
      const contributionDate = entry.userInvolvement?.date 
        ? new Date(entry.userInvolvement.date).toLocaleDateString() 
        : (entry.start ? new Date(entry.start).toLocaleDateString() : 'N/A');
      
      const publicationDate = entry.end ? new Date(entry.end).toLocaleDateString() : 'Not published';
      
      // Status badge
      let statusClass = 'status-default';
      if (entry.status === 'published') {
        statusClass = 'status-completed';
      } else if (entry.status === 'draft') {
        statusClass = 'status-in-progress';
      }
      
      const statusBadge = entry.status 
        ? `<span class="status-badge ${statusClass}">${entry.status}</span>`
        : '';
      
      // Contribution type badge
      const contributionBadge = entry.userInvolvement?.role || entry.contributionType
        ? `<span class="contribution-badge">${entry.userInvolvement?.role || entry.contributionType}</span>`
        : '';
      
      // Type badge
      const typeBadge = entry.subtype 
        ? `<span class="type-badge">${entry.subtype}</span>`
        : '';
      
      return `
        <div class="list-item list-item-library" data-id="${entry.id}">
          <div class="item-header">
            <h4>${entry.title}</h4>
            <div class="item-badges">
              ${statusBadge}
              ${contributionBadge}
              ${typeBadge}
            </div>
          </div>
          <div class="item-date">
            <div class="date-info">
              <span class="date-label">Contributed:</span>
              <span class="date-value">${contributionDate}</span>
            </div>
            <div class="date-info">
              <span class="date-label">Published:</span>
              <span class="date-value">${publicationDate}</span>
            </div>
          </div>
          <p class="item-description">${
            entry.description 
              ? (entry.description.length > 100 
                 ? entry.description.substring(0, 100) + '...' 
                 : entry.description)
              : 'No description available.'
          }</p>
        </div>
      `;
    }).join('');
    
    libraryListElement.innerHTML = libraryHtml;
    
    // Add event listeners to library items
    const libraryItems = libraryListElement.querySelectorAll('.list-item-library');
    libraryItems.forEach(item => {
      item.addEventListener('click', (event) => {
        const entryId = item.dataset.id;
        const entry = libraryData.find(e => e.id === entryId);
        if (entry) {
          this.showItemDetails(entry);
        }
      });
    });
  }
  
  // Render videos list
  renderVideosList() {
    const videosListElement = document.getElementById('videos-list');
    const videosData = this.data.videos || [];
    
    if (videosData.length === 0) {
      videosListElement.innerHTML = '<div class="empty-state">No video interactions found.</div>';
      return;
    }
    
    // Sort videos by interaction date, newest first
    videosData.sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Build HTML for videos list
    const videosHtml = videosData.map(video => {
      const interactionDate = video.start ? new Date(video.start).toLocaleDateString() : 'N/A';
      
      // Status badge
      let statusClass = 'status-default';
      if (video.status === 'published') {
        statusClass = 'status-completed';
      } else if (video.status === 'draft' || video.status === 'review') {
        statusClass = 'status-in-progress';
      }
      
      const statusBadge = video.status 
        ? `<span class="status-badge ${statusClass}">${video.status}</span>`
        : '';
      
      // Thumbnail from YouTube if available
      const thumbnail = video.youtubeId 
        ? `<img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg" alt="${video.title}" class="video-thumbnail">`
        : '';
      
      return `
        <div class="list-item list-item-video" data-id="${video.id}">
          ${thumbnail ? `
            <div class="video-thumbnail-container">
              ${thumbnail}
              <div class="play-overlay"></div>
            </div>
          ` : ''}
          <div class="item-content">
            <div class="item-header">
              <h4>${video.title}</h4>
              <div class="item-badges">
                ${statusBadge}
              </div>
            </div>
            <div class="item-meta">
              <span class="creator">${video.creator || 'Unknown creator'}</span>
              <span class="date">${interactionDate}</span>
            </div>
            <p class="item-description">${
              video.description 
                ? (video.description.length > 100 
                   ? video.description.substring(0, 100) + '...' 
                   : video.description)
                : 'No description available.'
            }</p>
            ${video.youtubeId ? `
              <div class="item-watch">
                <a href="https://www.youtube.com/watch?v=${video.youtubeId}" target="_blank" class="watch-button">
                  Watch Video
                </a>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    videosListElement.innerHTML = videosHtml;
    
    // Add event listeners to video items
    const videoItems = videosListElement.querySelectorAll('.list-item-video');
    videoItems.forEach(item => {
      item.addEventListener('click', (event) => {
        // Don't trigger if clicked on the watch button or play overlay
        if (event.target.classList.contains('watch-button') || 
            event.target.classList.contains('play-overlay')) {
          return;
        }
        
        const videoId = item.dataset.id;
        const video = videosData.find(v => v.id === videoId);
        if (video) {
          this.showItemDetails(video);
        }
      });
    });
  }
  
  // Initialize the dashboard
  init() {
    this.loadData();
  }
}

// Export the class
export default UserInvolvementDashboard;
// user-involvement-dashboard.js
// Dashboard component for displaying user involvement in clinics, modules, and library entries

import { getGanttData, getUserInvolvement, handleApiError } from './content-api-client.js';

// Main dashboard class
class UserInvolvementDashboard {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with ID "${containerId}" not found.`);
    }
    
    this.options = {
      userId: null, // If null, uses current user
      startDate: null,
      endDate: null,
      includeCompleted: true,
      view: 'all', // 'all', 'clinics', 'modules', 'library', 'videos'
      ...options
    };
    
    this.data = {
      clinics: [],
      modules: [],
      library: [],
      videos: []
    };
    
    this.error = null;
    this.isLoading = false;
    
    // Create dashboard structure
    this.createStructure();
  }
  
  // Create initial dashboard structure
  createStructure() {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h2>Involvement Dashboard</h2>
        <div class="dashboard-controls">
          <select id="view-selector">
            <option value="all">All Activities</option>
            <option value="clinics">Clinics</option>
            <option value="modules">Training Modules</option>
            <option value="library">Library Entries</option>
            <option value="videos">Videos</option>
          </select>
          <label class="checkbox-label">
            <input type="checkbox" id="include-completed" checked>
            Include Completed
          </label>
        </div>
      </div>
      
      <div class="dashboard-date-range">
        <label>
          Start Date:
          <input type="date" id="start-date">
        </label>
        <label>
          End Date:
          <input type="date" id="end-date">
        </label>
        <button id="apply-filters">Apply Filters</button>
        <button id="clear-filters">Clear Filters</button>
      </div>
      
      <div id="dashboard-error" class="error-message hidden"></div>
      
      <div id="dashboard-loading" class="loading-indicator hidden">
        <div class="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
      
      <div id="dashboard-content" class="dashboard-content">
        <div id="gantt-chart" class="gantt-chart"></div>
        
        <div id="involvement-stats" class="involvement-stats"></div>
        
        <div class="involvement-panels">
          <div id="clinics-panel" class="involvement-panel">
            <h3>Clinics</h3>
            <div id="clinics-list" class="content-list"></div>
          </div>
          
          <div id="modules-panel" class="involvement-panel">
            <h3>Training Modules</h3>
            <div id="modules-list" class="content-list"></div>
          </div>
          
          <div id="library-panel" class="involvement-panel">
            <h3>Library Contributions</h3>
            <div id="library-list" class="content-list"></div>
          </div>
          
          <div id="videos-panel" class="involvement-panel">
            <h3>Video Interactions</h3>
            <div id="videos-list" class="content-list"></div>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('view-selector').addEventListener('change', this.handleViewChange.bind(this));
    document.getElementById('include-completed').addEventListener('change', this.handleCompletedChange.bind(this));
    document.getElementById('apply-filters').addEventListener('click', this.applyFilters.bind(this));
    document.getElementById('clear-filters').addEventListener('click', this.clearFilters.bind(this));
    
    // Set initial values from options
    if (this.options.startDate) {
      document.getElementById('start-date').value = this.formatDateForInput(this.options.startDate);
    }
    if (this.options.endDate) {
      document.getElementById('end-date').value = this.formatDateForInput(this.options.endDate);
    }
    document.getElementById('view-selector').value = this.options.view;
    document.getElementById('include-completed').checked = this.options.includeCompleted;
  }
  
  // Format date for input elements
  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle view change
  handleViewChange(event) {
    this.options.view = event.target.value;
    this.loadData();
  }
  
  // Handle completed checkbox change
  handleCompletedChange(event) {
    this.options.includeCompleted = event.target.checked;
    this.loadData();
  }
  
  // Apply date filters
  applyFilters() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    this.options.startDate = startDateInput.value || null;
    this.options.endDate = endDateInput.value || null;
    
    this.loadData();
  }
  
  // Clear all filters
  clearFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('view-selector').value = 'all';
    document.getElementById('include-completed').checked = true;
    
    this.options = {
      ...this.options,
      startDate: null,
      endDate: null,
      view: 'all',
      includeCompleted: true
    };
    
    this.loadData();
  }
  
  // Show loading state
  setLoading(isLoading) {
    this.isLoading = isLoading;
    const loadingElement = document.getElementById('dashboard-loading');
    loadingElement.classList.toggle('hidden', !isLoading);
  }
  
  // Show error message
  setError(message) {
    this.error = message;
    const errorElement = document.getElementById('dashboard-error');
    
    if (message) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    } else {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
  }
  
  // Load dashboard data
  async loadData() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      // Fetch gantt chart data
      const ganttResult = await getGanttData({
        view: this.options.view,
        userId: this.options.userId,
        startDate: this.options.startDate,
        endDate: this.options.endDate,
        includeCompleted: this.options.includeCompleted
      });
      
      // Store the fetched data
      this.data = ganttResult.data;
      
      // Render the dashboard components
      this.renderGanttChart();
      this.renderStats();
      this.renderLists();
      
    } catch (error) {
      handleApiError(error, this.setError.bind(this), 'Failed to load dashboard data');
    } finally {
      this.setLoading(false);
    }
  }
  
  // Render Gantt chart
  renderGanttChart() {
    const ganttElement = document.getElementById('gantt-chart');
    
    // Combine all data for the Gantt chart
    const allItems = [
      ...this.data.clinics,
      ...this.data.modules,
      ...this.data.library,
      ...this.data.videos
    ].filter(item => item.start); // Only include items with start dates
    
    if (allItems.length === 0) {
      ganttElement.innerHTML = '<div class="empty-state">No timeline data available for the selected filters.</div>';
      return;
    }
    
    // Sort items by start date
    allItems.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    // Calculate date range for the Gantt chart
    const minDate = new Date(Math.min(...allItems.map(item => new Date(item.start).getTime())));
    const maxDate = new Date(Math.max(...allItems.map(item => new Date(item.end || item.start).getTime())));
    
    // Add 10% padding to the date range
    const rangeDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    const paddingDays = Math.max(7, Math.ceil(rangeDays * 0.1));
    
    minDate.setDate(minDate.getDate() - paddingDays);
    maxDate.setDate(maxDate.getDate() + paddingDays);
    
    // Calculate total time range in days
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    
    // Generate month headers
    const months = [];
    const currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
      months.push({
        month: currentDate.toLocaleString('default', { month: 'short' }),
        year: currentDate.getFullYear(),
        start: new Date(currentDate)
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Calculate position and width for each month header
    months.forEach((month, index) => {
      // Calculate position as percentage from start date
      const startPosition = ((month.start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      
      // Calculate end of month
      const endOfMonth = new Date(month.start);
      if (index < months.length - 1) {
        endOfMonth.setTime(months[index + 1].start.getTime());
      } else {
        endOfMonth.setTime(maxDate.getTime());
      }
      
      // Calculate width as percentage of total range
      const width = ((endOfMonth - month.start) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      
      month.position = startPosition;
      month.width = width;
    });
    
    // Build Gantt chart HTML
    let ganttHtml = `
      <div class="gantt-timeline">
        <div class="gantt-months">
          ${months.map(month => `
            <div class="gantt-month" style="left: ${month.position}%; width: ${month.width}%">
              ${month.month} ${month.year}
            </div>
          `).join('')}
        </div>
        
        <div class="gantt-items">
          ${allItems.map((item, index) => {
            // Calculate position and width for each item
            const startDate = new Date(item.start);
            const endDate = new Date(item.end || item.start);
            
            // Add one day to end date if it's the same as start date
            if (startDate.getTime() === endDate.getTime()) {
              endDate.setDate(endDate.getDate() + 1);
            }
            
            const startPosition = ((startDate - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
            const width = ((endDate - startDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
            
            // Determine color based on type and status
            let itemClass = `gantt-item gantt-item-${item.type}`;
            if (item.status === 'completed' || item.status === 'published') {
              itemClass += ' gantt-item-completed';
            } else if (item.status === 'draft' || item.status === 'enrolled') {
              itemClass += ' gantt-item-in-progress';
            }
            
            return `
              <div class="${itemClass}" 
                   style="left: ${startPosition}%; width: ${width}%"
