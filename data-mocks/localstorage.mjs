document.addEventListener('DOMContentLoaded', function() {
    // ... (rest of the code from above) ...

    // --- Load Initial Data (Local Storage) ---
    loadMilestones();

    function loadMilestones() {
        const savedMilestones = localStorage.getItem('milestones');
        const savedGoal = localStorage.getItem('overallGoal'); // Load overall goal

        if (savedMilestones) {
            milestonesData = JSON.parse(savedMilestones);
              overallGoalInput.value = savedGoal || "";  // Set overall goal input
            renderMilestones();
        } else {
          // If no saved data, initialize with default data, then save to Local Storage
            milestonesData = [ /* ...your default milestone data... */ ];
            overallGoalInput.value = "Your Default Overall Goal"; // Default goal
             saveMilestones(); // Save the default data to local storage
        }
    }

    // --- Save Data (Local Storage) ---
    function saveMilestones() {
          // ... (rest of saveMilestones from In-Memory example) ...

        // Save to Local Storage
        localStorage.setItem('milestones', JSON.stringify(milestonesData));
          localStorage.setItem('overallGoal', overallGoalInput.value); // Save overall goal
        console.log("Saving Milestones (Local Storage):", milestonesData);
    }

    // ... (rest of your functions: addMilestone, addMetric, etc.) ...
});
