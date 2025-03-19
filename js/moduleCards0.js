document.addEventListener('DOMContentLoaded', function() {
  // Get all module buttons
  const moduleButtons = document.querySelectorAll('.module-button');
  
  // Keep track of the original state
  let originalState = {};
  let activeCard = null;
  
  // Store the original state of all cards
  const allCards = document.querySelectorAll('.module-card');
  allCards.forEach(card => {
    const cardId = card.getAttribute('data-module-id');
    originalState[cardId] = {
      title: card.querySelector('h3')?.textContent,
      description: card.querySelector('p:not(.module-name):not(.module-info)')?.textContent,
      background: card.style.background || '',
      classes: card.className
    };
  });
  
  moduleButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      // Prevent default button behavior
      event.preventDefault();
      
      // Find the parent module card for the clicked button
      const clickedCard = event.target.closest('.module-card');
      const clickedCardId = clickedCard.getAttribute('data-module-id');
      
      // Reset any previously active card
      if (activeCard && activeCard !== clickedCard) {
        resetSingleCard(activeCard);
      }
      
      // Set the current card as active
      activeCard = clickedCard;
      
      // Retrieve and parse the JSON data from the data-related-info attribute
      let relatedInfo;
      try {
        relatedInfo = JSON.parse(clickedCard.getAttribute('data-related-info'));
      } catch (error) {
        console.error("Error parsing related info JSON:", error);
        return;
      }
      
      // Add highlighting class to clicked card with transition
      clickedCard.classList.add('active-card');
      clickedCard.style.backgroundColor = '#e0f7fa'; // Light cyan color
      clickedCard.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.12)';
      clickedCard.style.transition = 'all 0.3s ease';
      
      // Create reset button if it doesn't exist
      if (!clickedCard.querySelector('.reset-button')) {
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 mt-2 w-full';
        resetButton.textContent = 'Return to Original View';
        resetButton.style.marginTop = '10px';
        resetButton.addEventListener('click', function(event) {
          event.stopPropagation(); // Prevent triggering parent click events
          resetAllCards();
          activeCard = null;
        });
        
        // Insert the reset button after the module button
        const moduleButton = clickedCard.querySelector('.module-button');
        if (moduleButton && moduleButton.parentNode) {
          moduleButton.parentNode.insertBefore(resetButton, moduleButton.nextSibling);
        } else {
          clickedCard.appendChild(resetButton);
        }
      }
      
      // Get all module cards and their positions for smarter content distribution
      const cardArray = Array.from(allCards);
      const clickedIndex = cardArray.indexOf(clickedCard);
      
      // For each other card, determine how to update its content based on proximity
      cardArray.forEach((card, currentIndex) => {
        if (card !== clickedCard && relatedInfo && relatedInfo.length > 0) {
          // Determine which related info to use based on distance from clicked card
          const distance = Math.abs(currentIndex - clickedIndex);
          
          // The closer the card is to the clicked card, the more "converged" the content should be
          let infoIndex = Math.min(distance - 1, relatedInfo.length - 1);
          if (infoIndex < 0) infoIndex = 0;
          
          // For adjacent cards, use a special highlighting to show stronger relationship
          if (distance === 1) {
            card.style.backgroundColor = '#e8f5e9'; // Light green for adjacent modules
            card.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          } else {
            // Further cards get progressively lighter backgrounds
            const lightness = 95 + distance * 1; // Increase lightness with distance
            card.style.backgroundColor = `hsl(0, 0%, ${lightness}%)`;
          }
          
          // Update content
          const titleElement = card.querySelector('h3');
          const descriptionElement = card.querySelector('p:not(.module-name):not(.module-info)');
          
          if (titleElement && relatedInfo[infoIndex]) 
            titleElement.textContent = relatedInfo[infoIndex].title;
          
          if (descriptionElement && relatedInfo[infoIndex]) 
            descriptionElement.textContent = relatedInfo[infoIndex].description;
          
          card.style.transition = 'all 0.3s ease';
        }
      });
    });
  });
  
  // Function to reset a single card
  function resetSingleCard(card) {
    const cardId = card.getAttribute('data-module-id');
    const original = originalState[cardId];
    
    if (original) {
      // Reset title and description
      if (card.querySelector('h3')) card.querySelector('h3').textContent = original.title;
      const descriptionElement = card.querySelector('p:not(.module-name):not(.module-info)');
      if (descriptionElement) descriptionElement.textContent = original.description;
      
      // Reset background color and remove highlighting
      card.style.backgroundColor = '';
      card.style.boxShadow = '';
      card.classList.remove('active-card');
    }
    
    // Remove the reset button if it exists
    const resetButton = card.querySelector('.reset-button');
    if (resetButton) {
      resetButton.remove();
    }
  }
  
  // Function to reset all cards to their original state
  function resetAllCards() {
    allCards.forEach(card => resetSingleCard(card));
  }
  
  // Add some basic styling for the active card
  const style = document.createElement('style');
  style.textContent = `
    .active-card {
      transform: translateY(-5px);
    }
    .module-card {
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(style);
});
