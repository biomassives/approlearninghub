document.addEventListener('DOMContentLoaded', function() {
    // Get all module buttons
    const moduleButtons = document.querySelectorAll('.module-button');
  
    moduleButtons.forEach(button => {
      button.addEventListener('click', function(event) {
        // Find the parent module card for the clicked button
        const clickedCard = event.target.closest('.module-card');
        
        // Retrieve and parse the JSON data from the data-related-info attribute
        let relatedInfo;
        try {
          relatedInfo = JSON.parse(clickedCard.getAttribute('data-related-info'));
        } catch (error) {
          console.error("Error parsing related info JSON:", error);
          return;
        }
        
        // Get all module cards and filter out the clicked one
        const allCards = document.querySelectorAll('.module-card');
        const otherCards = Array.from(allCards).filter(card => card !== clickedCard);
  
        // Loop over each of the other cards and update their title and description
        otherCards.forEach((card, index) => {
          if (relatedInfo[index]) {
            // Assume the card has an <h3> for the title and a <p> for the description.
            const titleElement = card.querySelector('h3');
            const descriptionElement = card.querySelector('p');
  
            // Update the card with the new info
            if (titleElement) titleElement.textContent = relatedInfo[index].title;
            if (descriptionElement) descriptionElement.textContent = relatedInfo[index].description;
          }
        });
      });
    });
  });   
// Compare this snippet from js/moduleCards.js:
// document.addEventListener('DOMContentLoaded', function() {
//    // Get all module buttons
//    const moduleButtons = document.querySelectorAll('.module-button');
//    
