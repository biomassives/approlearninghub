// /js/mocks/milestones.mjs

document.addEventListener('DOMContentLoaded', function() {
    const addMilestoneBtn = document.getElementById('add-milestone');
    const milestonesList = document.getElementById('milestones-list');
    const milestoneTemplate = document.getElementById('milestone-template');
    const overallGoalInput = document.getElementById('overall-goal'); // Get overall goal input

    let milestonesData = []; // Array to store milestone data IN MEMORY

    addMilestoneBtn.addEventListener('click', addMilestone);

    // --- Load Initial Data (In-Memory) ---
    loadMilestones(); // Load data when the page loads

    function loadMilestones() {
        // In a real app, you'd fetch this from a database.  Here, we use sample data.
        milestonesData = [
            {
                title: "Complete Arduino Basics Course",
                dueDate: "2024-03-15",
                status: "in-progress",
                description: "Learn the fundamentals of Arduino programming and build a simple sensor project.",
                metrics: [
                    { name: "Hours Studied", value: 10, unit: "hours" },
                    { name: "Projects Completed", value: 1, unit: "projects" }
                ],
                celebration: "Treat myself to a nice dinner!"
            },
            {
                title: "Design Solar Panel System",
                dueDate: "2024-04-01",
                status: "not-started",
                description: "Create a design for a small off-grid solar power system.",
                metrics: [],
                celebration: "Buy a new multimeter!"
            }
        ];
      overallGoalInput.value = "Become a certified solar panel installer"; // Example overall goal
        renderMilestones();
    }
    function renderMilestones(){
        milestonesList.innerHTML = ''; // Clear existing milestones

        milestonesData.forEach(milestone => {
            const milestoneClone = milestoneTemplate.content.cloneNode(true);
            // Set values from the data
            milestoneClone.querySelector('.milestone-title').value = milestone.title;
            milestoneClone.querySelector('.milestone-date').value = milestone.dueDate;
            milestoneClone.querySelector('.milestone-status').value = milestone.status;
            milestoneClone.querySelector('.milestone-description').value = milestone.description;
            milestoneClone.querySelector('.milestone-celebration').value = milestone.celebration;


            // Add metrics (important!)
            const metricsDisplay = milestoneClone.querySelector('.metrics-display');
            milestone.metrics.forEach(metric => {
                const metricItem = document.createElement('div');
                metricItem.classList.add('metric-item');
                metricItem.textContent = `${metric.name}: ${metric.value} ${metric.unit}`;
                const removeMetricButton = document.createElement('button');
                removeMetricButton.textContent = 'x';
                removeMetricButton.classList.add('remove-metric');
                removeMetricButton.addEventListener('click', function() {
                    metricItem.remove();
                    saveMilestones(); //save data
                });
                metricItem.appendChild(removeMetricButton);
                metricsDisplay.appendChild(metricItem);
            });

            milestonesList.appendChild(milestoneClone);
             // --- Event Listeners (Within addMilestone and renderMilestones) ---
            const removeButton = milestonesList.lastElementChild.querySelector('.remove-milestone');
            removeButton.addEventListener('click', function() {
                this.closest('.milestone-item').remove();
                saveMilestones()
            });

            const addMetricButton = milestonesList.lastElementChild.querySelector('.add-metric');
            addMetricButton.addEventListener('click', function() {
                addMetric(this.closest('.milestone-item'));
            });

             // Add event listener for input changes to save data
            const milestoneItem = milestonesList.lastElementChild; // Get the last added milestone
            milestoneItem.querySelectorAll('input, textarea, select').forEach(input => {
              input.addEventListener('change', saveMilestones);
            });
        });
    }
    function addMilestone() {
        const milestoneClone = milestoneTemplate.content.cloneNode(true);
        milestonesList.appendChild(milestoneClone);

         // Add event listener for the "Remove Milestone" button
        const removeButton = milestonesList.lastElementChild.querySelector('.remove-milestone');
        removeButton.addEventListener('click', function() {
            this.closest('.milestone-item').remove();
             saveMilestones(); // Save data after removing
        });

        // Add event listener for adding metrics within the milestone
        const addMetricButton = milestonesList.lastElementChild.querySelector('.add-metric');
        addMetricButton.addEventListener('click', function() {
            addMetric(this.closest('.milestone-item')); // Pass the milestone item
        });
      // Add event listener for input changes to save data
        const milestoneItem = milestonesList.lastElementChild; // Get the last added milestone
        milestoneItem.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', saveMilestones);
        });
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
            const metricItem = document.createElement('div');
            metricItem.classList.add('metric-item');
            metricItem.textContent = `${metricName}: ${metricValue} ${metricUnit}`;

            const removeMetricButton = document.createElement('button');
            removeMetricButton.textContent = 'x';
            removeMetricButton.classList.add('remove-metric');
            removeMetricButton.addEventListener('click', function() {
                metricItem.remove();
                 saveMilestones(); //save data
            });
            metricItem.appendChild(removeMetricButton);

            metricsDisplay.appendChild(metricItem);

            metricNameInput.value = '';
            metricValueInput.value = '';
            metricUnitSelect.value = '';
            saveMilestones(); //save data
        }
    }

  // --- Save Data (In-Memory) ---
    function saveMilestones() {
        milestonesData = []; // Clear the array
        const milestoneItems = document.querySelectorAll('.milestone-item');

        milestoneItems.forEach(item => {
            const milestone = {
                title: item.querySelector('.milestone-title').value,
                dueDate: item.querySelector('.milestone-date').value,
                status: item.querySelector('.milestone-status').value,
                description: item.querySelector('.milestone-description').value,
                metrics: [], // Collect metrics
                celebration: item.querySelector('.milestone-celebration').value
            };

            // Extract metrics
            item.querySelectorAll('.metric-item').forEach(metricItem => {
              const textContent = metricItem.textContent;
              const colonIndex = textContent.indexOf(':'); // Find the colon
              const valueUnitIndex = textContent.lastIndexOf(' ', textContent.length -2);

              const name = textContent.substring(0, colonIndex).trim();
              const value = textContent.substring(colonIndex + 1, valueUnitIndex).trim();
              const unit = metricItem.textContent.split(" ").slice(-2)[0]

                milestone.metrics.push({ name, value, unit });
            });

            milestonesData.push(milestone);
        });
       console.log("Saving Milestones (In-Memory):", milestonesData); // Debugging
       console.log("Saving Overall Goal (In-Memory):", overallGoalInput.value)
    }
});
