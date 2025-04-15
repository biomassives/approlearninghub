// File: /public/js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/api/admin?type=welcome', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
  
      const result = await response.json();
  
      if (result.success) {
        const container = document.getElementById('welcome-content');
  
        result.welcomeContent.forEach(item => {
          const section = document.createElement('div');
          section.classList.add('welcome-section');
  
          const title = document.createElement('h2');
          title.textContent = item.title;
  
          const description = document.createElement('p');
          description.textContent = item.description;
  
          const link = document.createElement('a');
          link.href = item.link;
          link.textContent = 'Go to section';
  
          section.appendChild(title);
          section.appendChild(description);
          section.appendChild(link);
  
          container.appendChild(section);
        });
      } else {
        console.error('Failed to load welcome content:', result.error);
      }
    } catch (error) {
      console.error('Error fetching welcome content:', error);
    }
  });
  