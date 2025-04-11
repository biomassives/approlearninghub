
document.addEventListener('DOMContentLoaded', function() {
    const db = new Dexie('MilestonePlannerDB');
    db.version(1).stores({
        milestones: '++id, title, dueDate, status, description, metrics, celebration, overallGoal', 
    });

    const addMilestoneBtn = document.getElementById('add-milestone');
    const milestonesList = document.getElementById('milestones-list');
    const milestoneTemplate = document.getElementById('milestone-template');
    const overallGoalInput = document.getElementById('overall-goal');
    const sortSelect = document.getElementById('sort-milestones');

    addMilestoneBtn.addEventListener('click', addMilestone);
    
    // Add event listeners for sorting if the element exists
    if (sortSelect) {
        sortSelect.addEventListener('change', async () => {
            const milestones = await db.milestones.toArray();
            sortMilestones(milestones, sortSelect.value);
            renderMilestones(milestones);
        });
    }

    // --- Load Initial Data (Dexie) ---
    loadMilestones();

    async function loadMilestones() {
        try {
            const savedMilestones = await db.milestones.toArray();
            const savedGoal = localStorage.getItem('overallGoal'); // Load overall goal
            overallGoalInput.value = savedGoal || "Set your overall goal here!";

            if (savedMilestones.length > 0) {
                // Sort milestones by due date by default when loading
                sortMilestones(savedMilestones, 'dueDate');
                renderMilestones(savedMilestones);
            } else {
                // Initialize with default data ONLY if the database is empty
                const defaultMilestones = [
                    {
                        title: "Complete Arduino Basics Course",
                        dueDate: "2024-03-15",
                        status: "in-progress",
                        description: "Learn Arduino fundamentals.",
                        metrics: [{ name: "Hours Studied", value: "10", unit: "hours" }],
                        celebration: "Dinner!",
                        overallGoal: "Become a certified solar panel installer"
                    }
                ];
                overallGoalInput.value = "Become a certified solar panel installer";
                await db.milestones.bulkAdd(defaultMilestones);
                renderMilestones(defaultMilestones);
                localStorage.setItem('overallGoal', overallGoalInput.value);
            }
        } catch (error) {
            console.error("Error loading milestones:", error);
        }
    }

    function sortMilestones(milestones, criteria) {
        switch(criteria) {
            case 'dueDate':
                milestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                break;
            case 'status':
                const statusOrder = { 'not-started': 0, 'in-progress': 1, 'completed': 2 };
                milestones.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                break;
            case 'title':
                milestones.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }
        return milestones;
    }

    function renderMilestones(milestones) {
        milestonesList.innerHTML = ''; // Clear before rendering

        milestones.forEach(milestone => {
            const milestoneClone = milestoneTemplate.content.cloneNode(true);
            const milestoneItem = milestoneClone.querySelector('.milestone-item');

            // Add status-based styling to the milestone card
            if (milestone.status) {
                milestoneItem.classList.add(`status-${milestone.status}`);
            }

            // Set values from the data
            milestoneClone.querySelector('.milestone-title').value = milestone.title;
            milestoneClone.querySelector('.milestone-date').value = milestone.dueDate;
            milestoneClone.querySelector('.milestone-status').value = milestone.status;
            milestoneClone.querySelector('.milestone-description').value = milestone.description;
            milestoneClone.querySelector('.milestone-celebration').value = milestone.celebration;

            // Add status badge
            const statusBadge = milestoneClone.querySelector('.status-badge') || document.createElement('div');
            if (!milestoneClone.querySelector('.status-badge')) {
                statusBadge.className = `status-badge ${milestone.status}`;
                statusBadge.textContent = milestone.status.replace('-', ' ');
                const titleContainer = milestoneClone.querySelector('.milestone-header') || milestoneClone.querySelector('.milestone-item > div:first-child');
                if (titleContainer) {
                    titleContainer.appendChild(statusBadge);
                }
            } else {
                statusBadge.className = `status-badge ${milestone.status}`;
                statusBadge.textContent = milestone.status.replace('-', ' ');
            }

            // Add due date indicator
            const dueDateElement = milestoneClone.querySelector('.due-date-indicator') || document.createElement('div');
            if (!milestoneClone.querySelector('.due-date-indicator')) {
                dueDateElement.className = 'due-date-indicator';
                const dateContainer = milestoneClone.querySelector('.milestone-date').parentNode;
                dateContainer.appendChild(dueDateElement);
            }
            updateDueDateIndicator(dueDateElement, milestone.dueDate);

            // Add progress bar
            const progressBar = milestoneClone.querySelector('.progress-container') || document.createElement('div');
            if (!milestoneClone.querySelector('.progress-container')) {
                progressBar.className = 'progress-container';
                progressBar.innerHTML = `<div class="progress-bar ${milestone.status}"></div>`;
                const statusContainer = milestoneClone.querySelector('.milestone-status').parentNode;
                statusContainer.appendChild(progressBar);
            } else {
                const bar = progressBar.querySelector('.progress-bar');
                bar.className = `progress-bar ${milestone.status}`;
            }

            // Add metrics
            const metricsDisplay = milestoneClone.querySelector('.metrics-display');
            milestone.metrics.forEach(metric => {
                addMetricToDisplay(metricsDisplay, metric.name, metric.value, metric.unit);
            });

            milestonesList.appendChild(milestoneClone);

            // Add event listeners to the newly added milestone
            const newMilestoneItem = milestonesList.lastElementChild;
            
            // Event listener for remove button
            const removeButton = newMilestoneItem.querySelector('.remove-milestone');
            removeButton.addEventListener('click', function() {
                if (confirm('Are you sure you want to remove this milestone?')) {
                    this.closest('.milestone-item').remove();
                    saveMilestones();
                }
            });

            // Event listener for add metric button
            const addMetricButton = newMilestoneItem.querySelector('.add-metric');
            addMetricButton.addEventListener('click', function() {
                addMetric(this.closest('.milestone-item'));
            });

            // Event listeners for status change
            const statusSelect = newMilestoneItem.querySelector('.milestone-status');
            statusSelect.addEventListener('change', function() {
                const item = this.closest('.milestone-item');
                updateMilestoneStatus(item, this.value);
                saveMilestones();
            });

            // Event listeners for date change
            const dateInput = newMilestoneItem.querySelector('.milestone-date');
            dateInput.addEventListener('change', function() {
                const dueDateIndicator = this.parentNode.querySelector('.due-date-indicator');
                updateDueDateIndicator(dueDateIndicator, this.value);
                saveMilestones();
            });

            // Event listeners for all inputs
            newMilestoneItem.querySelectorAll('input, textarea, select').forEach(input => {
                input.addEventListener('change', saveMilestones);
            });

            // Initialize the status display
            updateMilestoneStatus(newMilestoneItem, milestone.status);
        });
    }

    function updateMilestoneStatus(milestoneItem, status) {
        // Remove all status classes
        milestoneItem.classList.remove('status-not-started', 'status-in-progress', 'status-completed');
        
        // Add appropriate status class
        milestoneItem.classList.add(`status-${status}`);
        
        // Update status badge
        const statusBadge = milestoneItem.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${status}`;
            statusBadge.textContent = status.replace('-', ' ');
        }
        
        // Update progress bar
        const progressBar = milestoneItem.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.className = `progress-bar ${status}`;
        }
    }

    function updateDueDateIndicator(element, dueDate) {
        if (!element || !dueDate) return;
        
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Clear existing classes
        element.className = 'due-date-indicator';
        
        // Add appropriate class based on due date
        if (diffTime < 0) {
            element.classList.add('overdue');
            element.textContent = `Overdue by ${Math.abs(diffDays)} days`;
        } else if (diffDays <= 7) {
            element.classList.add('due-soon');
            element.textContent = `Due in ${diffDays} days`;
        } else {
            element.classList.add('due-future');
            element.textContent = `Due in ${diffDays} days`;
        }
    }

    function addMilestone() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        const milestoneClone = milestoneTemplate.content.cloneNode(true);
        const milestoneItem = milestoneClone.querySelector('.milestone-item');
        
        // Set default values
        milestoneClone.querySelector('.milestone-date').value = formattedDate;
        milestoneClone.querySelector('.milestone-status').value = 'not-started';
        
        // Add status badge
        const statusBadge = document.createElement('div');
        statusBadge.className = 'status-badge not-started';
        statusBadge.textContent = 'not started';
        const titleContainer = milestoneClone.querySelector('.milestone-header') || milestoneClone.querySelector('.milestone-item > div:first-child');
        if (titleContainer) {
            titleContainer.appendChild(statusBadge);
        }
        
        // Add due date indicator
        const dueDateElement = document.createElement('div');
        dueDateElement.className = 'due-date-indicator';
        const dateContainer = milestoneClone.querySelector('.milestone-date').parentNode;
        dateContainer.appendChild(dueDateElement);
        updateDueDateIndicator(dueDateElement, formattedDate);
        
        // Add progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-container';
        progressBar.innerHTML = '<div class="progress-bar not-started"></div>';
        const statusContainer = milestoneClone.querySelector('.milestone-status').parentNode;
        statusContainer.appendChild(progressBar);
        
        milestonesList.appendChild(milestoneClone);
        
        // Add status class to the milestone item
        milestonesList.lastElementChild.classList.add('status-not-started');
        
        // Add event listeners
        const removeButton = milestonesList.lastElementChild.querySelector('.remove-milestone');
        removeButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this milestone?')) {
                this.closest('.milestone-item').remove();
                saveMilestones();
            }
        });
        
        const addMetricButton = milestonesList.lastElementChild.querySelector('.add-metric');
        addMetricButton.addEventListener('click', function() {
            addMetric(this.closest('.milestone-item'));
        });
        
        const statusSelect = milestonesList.lastElementChild.querySelector('.milestone-status');
        statusSelect.addEventListener('change', function() {
            const item = this.closest('.milestone-item');
            updateMilestoneStatus(item, this.value);
            saveMilestones();
        });
        
        const dateInput = milestonesList.lastElementChild.querySelector('.milestone-date');
        dateInput.addEventListener('change', function() {
            const dueDateIndicator = this.parentNode.querySelector('.due-date-indicator');
            updateDueDateIndicator(dueDateIndicator, this.value);
            saveMilestones();
        });
        
        const newMilestoneItem = milestonesList.lastElementChild;
        newMilestoneItem.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', saveMilestones);
        });
        
        // Focus the title field
        const titleInput = milestonesList.lastElementChild.querySelector('.milestone-title');
        titleInput.focus();
        
        saveMilestones();
    }

    function addMetric(milestoneItem) {
        const metricNameInput = milestoneItem.querySelector('.milestone-metric-name');
        const metricValueInput = milestoneItem.querySelector('.milestone-metric-value');
        const metricUnitSelect = milestoneItem.querySelector('.milestone-metric-unit');
        const metricsDisplay = milestoneItem.querySelector('.metrics-display');

        const metricName = metricNameInput.value.trim();
        const metricValue = metricValueInput.value.trim();
        const metricUnit = metricUnitSelect.value;

        if (metricName && metricValue) {
            addMetricToDisplay(metricsDisplay, metricName, metricValue, metricUnit);

            metricNameInput.value = '';
            metricValueInput.value = '';
            metricUnitSelect.selectedIndex = 0;
            saveMilestones();
        }
    }

    function addMetricToDisplay(metricsDisplay, name, value, unit) {
        const metricItem = document.createElement('div');
        metricItem.className = 'metric-item';
        
        // Create structured metric content
        const metricContent = document.createElement('div');
        metricContent.className = 'metric-content';
        
        const metricNameSpan = document.createElement('span');
        metricNameSpan.className = 'metric-name';
        metricNameSpan.textContent = name + ': ';
        
        const metricValueSpan = document.createElement('span');
        metricValueSpan.className = 'metric-value';
        metricValueSpan.textContent = value;
        
        const metricUnitSpan = document.createElement('span');
        metricUnitSpan.className = 'metric-unit';
        metricUnitSpan.textContent = ' ' + unit;
        
        metricContent.appendChild(metricNameSpan);
        metricContent.appendChild(metricValueSpan);
        metricContent.appendChild(metricUnitSpan);
        
        // Create remove button
        const removeMetricButton = document.createElement('button');
        removeMetricButton.className = 'remove-metric';
        removeMetricButton.innerHTML = '&times;';
        removeMetricButton.addEventListener('click', function() {
            metricItem.remove();
            saveMilestones();
        });
        
        // Assemble the metric item
        metricItem.appendChild(metricContent);
        metricItem.appendChild(removeMetricButton);
        
        // Add animation class
        metricItem.classList.add('metric-added');
        
        // Add to display
        metricsDisplay.appendChild(metricItem);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            metricItem.classList.remove('metric-added');
        }, 500);
    }

    // --- Save Data (Dexie) ---
    async function saveMilestones() {
        try {
            const overallGoal = overallGoalInput.value;
            const milestoneItems = document.querySelectorAll('.milestone-item');
            const milestonesToSave = [];

            milestoneItems.forEach(item => {
                const milestone = {
                    title: item.querySelector('.milestone-title').value,
                    dueDate: item.querySelector('.milestone-date').value,
                    status: item.querySelector('.milestone-status').value,
                    description: item.querySelector('.milestone-description').value,
                    metrics: [],
                    celebration: item.querySelector('.milestone-celebration').value,
                    overallGoal: overallGoal,
                };

                item.querySelectorAll('.metric-item').forEach(metricItem => {
                    const nameElement = metricItem.querySelector('.metric-name');
                    const valueElement = metricItem.querySelector('.metric-value');
                    const unitElement = metricItem.querySelector('.metric-unit');
                    
                    if (nameElement && valueElement && unitElement) {
                        // Using the structured elements
                        const name = nameElement.textContent.replace(':', '').trim();
                        const value = valueElement.textContent.trim();
                        const unit = unitElement.textContent.trim();
                        
                        milestone.metrics.push({ name, value, unit });
                    } else {
                        // Fallback to the old parsing method
                        const textContent = metricItem.textContent;
                        const colonIndex = textContent.indexOf(':');
                        const valueUnitIndex = textContent.lastIndexOf(' ', textContent.length - 2);

                        const name = textContent.substring(0, colonIndex).trim();
                        const value = textContent.substring(colonIndex + 1, valueUnitIndex).trim();
                        const unit = metricItem.textContent.split(" ").slice(-2)[0];

                        milestone.metrics.push({ name, value, unit });
                    }
                });

                milestonesToSave.push(milestone);
            });

            // Clear and repopulate the database
            await db.milestones.clear();
            await db.milestones.bulkAdd(milestonesToSave);
            localStorage.setItem('overallGoal', overallGoal);
            console.log("Milestones saved to Dexie:", milestonesToSave);

        } catch (error) {
            console.error("Error saving milestones:", error);
        }
    }
});