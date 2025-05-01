// simple-toggle.js - Minimal script to toggle between login and signup forms
// This script has no dependencies and can be used as a fallback

// Function to toggle between the login and signup forms
function setupFormToggle() {
    console.log("Setting up form toggle (simple version)");
    
    // Get the form sections
    const signupSection = document.getElementById('signup-section');
    const loginSection = document.getElementById('login-section');
    
    // Get the toggle links
    const showLoginLink = document.getElementById('show-login-link');
    const showSignupLink = document.getElementById('show-signup-link');
    
    // Log what we found for debugging
    console.log("Elements found:", {
      signupSection: Boolean(signupSection),
      loginSection: Boolean(loginSection),
      showLoginLink: Boolean(showLoginLink),
      showSignupLink: Boolean(showSignupLink)
    });
    
    // Set up toggle from signup to login
    if (showLoginLink && signupSection && loginSection) {
      showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Toggling to login form");
        signupSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
      });
    }
    
    // Set up toggle from login to signup
    if (showSignupLink && signupSection && loginSection) {
      showSignupLink.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Toggling to signup form");
        loginSection.classList.add('hidden');
        signupSection.classList.remove('hidden');
      });
    }
    
    // Check if we should show the signup form based on URL
    if (window.location.hash === '#signup' || window.location.search.includes('signup=true')) {
      if (signupSection && loginSection) {
        loginSection.classList.add('hidden');
        signupSection.classList.remove('hidden');
        console.log("Starting with signup form based on URL");
      }
    }
  }
  
  // Run the setup when the DOM is loaded
  document.addEventListener('DOMContentLoaded', setupFormToggle);