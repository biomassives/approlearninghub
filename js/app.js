// // Description: Main application logic for the Approvideo website
// / js/app.js

// GPL v3   GENERAL PUBLIC LICENSE
// G. WILLSON SCD HUB PO BOX 911 NEDERLAND CO 80466 USA

// Dexie Database Setup (Create a single instance)
const db = new Dexie("MyDatabase");
db.version(1).stores({
    authTokens: "id, token, key" // Store both token and key
});

document.addEventListener('DOMContentLoaded', async () => {
    const authLoggedInTopRight = document.getElementById('auth-logged-in-top-right');
    const authLoggedOutTopRight = document.getElementById('auth-logged-out-top-right');
    const userProfileTopRight = document.getElementById('user-profile-top-right');
    const userDropdown = document.getElementById('user-dropdown');
    const loginButton = document.getElementById('login-button');


    const registerButton = document.getElementById('user-profile-top-right');
    const logoutButton = document.getElementById('logout-button');
    const authModal = document.getElementById('auth-modal');
    const closeAuthModalButton = document.getElementById('close-auth-modal');
    const emailLoginForm = document.getElementById('email-login-form');
    const loginWithEmailButton = document.getElementById('login-with-email');
    const dashboardSection = document.getElementById('dashboard-section');
    const welcomeSection = document.getElementById('welcome-section');
    const dashboardLoggedInContent = document.getElementById('dashboard-logged-in');
    const dashboardLoggedOutContent = document.getElementById('dashboard-logged-out');
    const dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    const roleBasedDashboardContent = document.getElementById('role-based-dashboard-content');
    const getStartedButtonDashboard = document.getElementById('get-started-button-dashboard');
    const loginLinkDashboard = document.getElementById('login-link-dashboard');

    // Chat Elements
    const chatContainer = document.getElementById('chat-container');
    const chatHeader = document.getElementById('chat-header');
    const chatBody = document.getElementById('chat-body');
    const closeChatButton = document.getElementById('close-chat-button');
    const chatNotificationBadge = document.getElementById('chat-notification-badge');

    // New Page Sections
    const termsSection = document.getElementById('terms-section');
    const privacySection = document.getElementById('privacy-section');

    const aboutSection = document.getElementById('about-section');
    const clinicsSection = document.getElementById('clinics-section');
    const teamSection = document.getElementById('team-section');
    const learningmodulesSection = document.getElementById('learning-modules-section');
    const blogSection = document.getElementById('blog-section');
    const librarySection = document.getElementById('library-section');
    const faqSection = document.getElementById('faq-section');
    const certificatesSection = document.getElementById('certs-section');
    const profileSection = document.getElementById('profile-section');
    const mydataSection = document.getElementById('mydata-section');
    const settingsSection = document.getElementById('settings-section');
    const eventsSection = document.getElementById('events-section');

    // Footer & other links
    const privacyLinkFooter = document.getElementById('privacy-link-footer');
    const termsLinkFooter = document.getElementById('terms-link-footer');
    const aboutLinkFooter = document.getElementById('about-footer');
    const teamLinkFooter = document.getElementById('team-footer');
    const blogLinkFooter = document.getElementById('approvideo-blog');
    const faqLinkFooter = document.getElementById('faq-footer');

    const smallgrantsLinkFooter = document.getElementById('small-grants-footer');
    const smallgrantsLinkHeader = document.getElementById('small-grants-header');
    const smallgrantsLinkMore = document.getElementById('more-smallgrants');
    const learningLinkFooter = document.getElementById('learning-footer');
    const learningLinkHeader = document.getElementById('learning-header');
    const libraryLinkFooter = document.getElementById('diy-solutions-library');
    const libraryLinkHeader = document.getElementById('library-header');
    const librarycrLinkHeader = document.getElementById('librarycr-header');
    const eventsLinkHeader = document.getElementById('events-header');

    const practicalclinicsMoreButton = document.getElementById('more-practical-clinics-button');
    const researchMoreButton = document.getElementById('more-research');
    const eventsMoreButton = document.getElementById('more-events');
    const aboutMenu = document.getElementById('more-about');
  
    const skillTrainingButton = document.getElementById('library-header');
    const skillTraining2Button = document.getElementById('skilltraining-header');
    const skillTrainingMenu = document.getElementById('skill-training-menu');
    const crisisReliefButton = document.getElementById('librarycr-header');
    const crisisReliefMenu = document.getElementById('crisis-relief-menu');
    const moreButton = document.getElementById('more-button');
    //const moreMenu = document.getElementById('more-menu');
    const modalModuleMenu  = document.getElementById('modal-module-menu');
    const modalModuleMenuButton = document.getElementById('modal-module-menu-button');
    const moduleButtonBiodiversityAndEcosystemsButton = document.getElementById('module-biodiversity-and-ecosystems-button');
    const moduleButtonBiodiversityAndEcosystems = document.getElementById('module-biodiversity-and-ecosystems');
    

/*
    const moduleButtonCommunityWasteManagementButton = document.getElementById('module-community-waste-management-button');
    const moduleButtonCommunityWasteManagementButtonCLOSE = document.getElementById('module-community-waste-management-button-close');
    const moduleButtonCommunityWasteManagement = document.getElementById('modules-community-waste-management');
    
    if (moduleButtonCommunityWasteManagementButton) { // add a check that the button exists.
      moduleButtonCommunityWasteManagementButton.addEventListener('click', function() {
        if (moduleButtonCommunityWasteManagement) { // add a check that the module exists.
          moduleButtonCommunityWasteManagement.classList.toggle('hidden');
        }
      });
    }

    const moduleButtonRenewableEnergySolutionsButton = document.getElementById('module-renewable-energy-solutions-button');
    const moduleButtonRenewableEnergySolutionsButtonCLOSE = document.getElementById('module-renewable-energy-solutions-button-close');
    const moduleButtonRenewableEnergySolutions = document.getElementById('modules-renewable-energy-solutions');
    
    if (moduleButtonRenewableEnergySolutionsButton) { // add a check that the button exists.
      moduleButtonRenewableEnergySolutionsButton.addEventListener('click', function() {
        if (moduleButtonRenewableEnergySolutions) { // add a check that the module exists.
          moduleButtonRenewableEnergySolutions.classList.toggle('hidden');
        }
      });
    }

    const moduleButtonSustainableAgriculturePracticesButton = document.getElementById('module-sustainable-agriculture-practices-button');
    const moduleButtonSustainableAgriculturePracticesButtonCLOSE = document.getElementById('module-sustainable-agriculture-practices-button-close');
    const moduleButtonSustainableAgriculturePractices = document.getElementById('modules-sustainable-agriculture-practices');
    
    if (moduleButtonSustainableAgriculturePracticesButton) { // add a check that the button exists.
      moduleButtonRenewableEnergySolutionsButton.addEventListener('click', function() {
        if (moduleButtonSustainableAgriculturePractices) { // add a check that the module exists.
          moduleButtonSustainableAgriculturePractices.classList.toggle('hidden');
        }
      });
    }

    const moduleButtonWaterFiltrationPurificationButton = document.getElementById('module-water-filtration-purification-button');
    const moduleButtonWaterFiltrationPurificationButtonCLOSE = document.getElementById('module-water-filtration-purification-button-close');
    const moduleButtonWaterFiltrationPurification = document.getElementById('module-water-filtration-purification');
    
    if (moduleButtonSustainableAgriculturePracticesButton) { // add a check that the button exists.
      moduleButtonRenewableEnergySolutionsButton.addEventListener('click', function() {
        if (moduleButtonSustainableAgriculturePractices) { // add a check that the module exists.
          moduleButtonSustainableAgriculturePractices.classList.toggle('hidden');
        }
      });
    }
  
    const moduleButtonCommunityHealthSanitationButton = document.getElementById('modules-community-health-sanitation-button');
    const moduleButtonCommunityHealthSanitationButtonCLOSE = document.getElementById('modules-community-health-sanitation-button-close');
    const moduleButtonCommunityHealthSanitation = document.getElementById('modules-community-health-sanitation');
    
    if (moduleButtonCommunityHealthSanitationButton) { // add a check that the button exists.
      moduleButtonCommunityHealthSanitationButton.addEventListener('click', function() {
        if (moduleButtonCommunityHealthSanitation) { // add a check that the module exists.
          moduleButtonCommunityHealthSanitation.classList.toggle('hidden');
        }
      });
    }

*/








    // Menu Links
    const profileLinkMenu = document.getElementById('profile-menu');
    const milestonesLinkMenu = document.getElementById('milestones-menu');
    const settingsLinkMenu = document.getElementById('settings-menu');
    const shareLinkMenu = document.getElementById('share-menu');

    // Modal  & Megamenu
    const privacyLinkModal = document.getElementById('privacy-link-modal');
    const termsLinkModal = document.getElementById('terms-link-modal');
    const megaMenuButton = document.getElementById('mega-menu-button');
    const megaMenu = document.getElementById('mega-menu');
    const megaMenuButtonCLOSE = document.getElementById('mega-menu-button-close');

    megaMenuButton.addEventListener('click', () => {
        megaMenu.classList.toggle('hidden');
        megaMenuButtonCLOSE.classList.toggle('block');
    });

    megaMenuButtonCLOSE.addEventListener('click', () => {
        megaMenu.classList.toggle('hidden');
        megaMenuButtonCLOSE.classList.toggle('hidden');
        //megaMenuButton.classList.toggle('block');
    });

    const authMenu = document.getElementById('auth-modal');
    const authMenuButtonCLOSE = document.getElementById('auth-modal-button-close');

    authMenuButtonCLOSE.addEventListener('click', () => {
            authMenu.classList.toggle('hidden');
    });

    let isLoggedIn = false;
    let userName = "User";
    let userRole = "user";

    const roleContent = {
        'user': '<p>Welcome to your user dashboard. Explore learning modules and health clinics.</p>',
        'project leader': '<p>Project Leader Dashboard: Manage projects and team members.</p>',
        'expert mentor': '<p>Expert Mentor Dashboard: Guide and mentor learners.</p>',
        'research assistance': '<p>Research Assistant Dashboard: Contribute to research projects.</p>',
        'member of effected community': '<p>Community Member Dashboard: Access resources and community forums.</p>',
        'software admin': '<p>Software Admin Dashboard: System administration and user management.</p>',
        'default': '<p>Generic dashboard content for logged-in users.</p>'
    };

    document.addEventListener('DOMContentLoaded', function() {
        const iconNavItems = document.querySelectorAll('.icon-nav-item');
        iconNavItems.forEach(item => {
            const text = item.textContent; // Store original text
            item.innerHTML = ''; // Clear original text
            item.appendChild(document.createElement('span')).textContent = text; // Add text as span
    });

        
    document.addEventListener('click', (event) => {
            if (event.target.classList.contains('accordion-header')) {
                const item = event.target.closest('.accordion-item');
                if (item) {
                    item.classList.toggle('active');
                }
            }
     });




    });


function updateAuthUI() {
    if (isLoggedIn) {
        authLoggedOutTopRight.classList.add('hidden');
        authLoggedInTopRight.classList.remove('hidden');
        dashboardLoggedOutContent.classList.add('hidden');
        dashboardLoggedInContent.classList.remove('hidden');
        welcomeSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardWelcomeMessage.textContent = `Welcome, ${userName}! (${userRole})`;
        renderRoleBasedContent();
        chatContainer.classList.remove('hidden');
        chatNotificationBadge.classList.remove('hidden');

    } else {
        authLoggedInTopRight.classList.add('hidden');
        authLoggedOutTopRight.classList.remove('hidden');
        dashboardLoggedInContent.classList.add('hidden');
        dashboardLoggedOutContent.classList.remove('hidden');
        welcomeSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        chatNotificationBadge.classList.add('hidden');
    }
    hideAllSectionsExcept('dashboard-section'); // Ensure dashboard is visible after auth changes
}

function renderRoleBasedContent() {
    let content = roleContent[userRole] || roleContent['default'];
    roleBasedDashboardContent.innerHTML = content;
}

function decryptToken(encryptedToken, key){
    // your decryption logic
    return "decryptedToken";
  }

async function checkAuthStatus() {
    try {
        const authData = await db.authTokens.get(1); // Correct table name
        if (!authData) {
            console.log("No auth data found.");
            return "noauth"; // Signal no authentication data
        }
        const decryptedToken = decryptToken(authData.token, authData.key); //pass the key to the decryption function.
        if (decryptedToken) {
            registerButton.addEventListener('click', () => {
                authModal.classList.remove('hidden');
            });
            console.log("Authentication data found and decrypted.");
            return "authenticated";
        } else {
            console.log("Decryption failed or token is invalid.");
            return "invalid"; // Signal invalid token
        }

    } catch (error) {
        console.error("Error checking auth status:", error);
        return "error"; // Handle unexpected errors
    }
}
    
function simulateLogin() {
  isLoggedIn = true;
  userName = "Mia Fahroe";
  userRole = Object.keys(roleContent)[Math.floor(Math.random() * Object.keys(roleContent).length)];
  updateAuthUI();
  authModal.classList.add('hidden');

  function generateRandomValue(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function generateAndEncryptToken() {
    const token = generateRandomValue();
    const key = await generateEncryptionKey();
    const encryptedToken = await encryptToken(token, key);
    console.log("Original token:", token);
    console.log("Encrypted token:", encryptedToken);
    return { encryptedToken: encryptedToken, key: key };
  }

  async function storeEncryptedToken(encryptedToken, key) {
    try {
        await db.authTokens.put({ id: 1, token: encryptedToken, key: key });
        console.log("Encrypted token and key stored successfully.");
    } catch (error) {
        console.error("Error storing encrypted token and key:", error);
    }
}


  generateAndEncryptToken().then((result) => {
    const encryptedToken = result.encryptedToken;
    const key = result.key;
    storeEncryptedToken(encryptedToken, key);
  });

  async function encryptToken(token, key) {
    const encodedToken = new TextEncoder().encode(token);
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: window.crypto.getRandomValues(new Uint8Array(12)),
      },
      key,
      encodedToken
    );
    const iv = new Uint8Array(encryptedData, 0, 12);
    const ciphertext = new Uint8Array(encryptedData, 12);
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv);
    combined.set(ciphertext, iv.length);
    return Array.from(combined)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function generateEncryptionKey() {
    return window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
}

function simulateLogout() {
  isLoggedIn = false;
  userName = "User";
  userRole = 'user';
  updateAuthUI();

  // Clear the stored token and key on logout
  db.authTokens.delete(1).then(() => {
    console.log("Token and key cleared on logout.");
  }).catch((error) => {
    console.error("Error clearing token and key:", error);
  });
}

// Function to hide all main sections except one
function hideAllSectionsExcept(sectionId) {
    const sections = ['dashboard-section', 'welcome-section', 'skill-training-menu', 'research-section', 'practical-clinics-section', 'learning-modules-section', 'clinics-section', 'smallgrants-section', 'library-section', 'terms-section', 'privacy-section','about-section','team-section','milestones-section', 'sharefolder-section', 'profile-section','settings-section','faq-section','events-section','blog-section','welcome-section','certs-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (id === sectionId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}

document.addEventListener('click', function(event) {
    // Check if the user dropdown is visible
    if (!userDropdown.classList.contains('hidden')) {
        // Check if the click was outside the dropdown and outside the user profile button
        if (!userDropdown.contains(event.target) && !userProfileTopRight.contains(event.target)) {
            // Hide the dropdown
            userDropdown.classList.add('hidden');
        }
    }
});
    
// Also make sure each navigation link closes the dropdown when clicked
const navLinks = document.querySelectorAll('a, button:not(#user-profile-top-right):not(#logout-button)');
navLinks.forEach(link => {
    link.addEventListener('click', function() {
        // Close the dropdown when any navigation link is clicked
        if (!userDropdown.classList.contains('hidden')) {
            userDropdown.classList.add('hidden');
        }
    });
});
 
// Skill Training Menu Toggle
    skillTraining2Button.addEventListener('click', function() {
    skillTrainingMenu.classList.toggle('hidden');
});

// Crisis Relief Menu Toggle
    crisisReliefButton.addEventListener('click', function() {
    crisisReliefMenu.classList.toggle('hidden');
});

/* More Menu Toggle
    moreButton.addEventListener('click', function() {
    moreMenu.classList.toggle('hidden');
});
*/

// Crisis Relief Educational Module Menu Toggle
    moduleButtonBiodiversityAndEcosystemsButton.addEventListener('click', function() {
    moduleButtonBiodiversityAndEcosystems.classList.toggle('hidden');
});
     
// Close menus when clicking outside
      document.addEventListener('click', function(event) {
        if (!skillTrainingButton.contains(event.target) && !skillTrainingMenu.contains(event.target)) {
          skillTrainingMenu.classList.add('hidden');
        }
        if (!crisisReliefButton.contains(event.target) && !crisisReliefMenu.contains(event.target)) {
          crisisReliefMenu.classList.add('hidden');
        }

});



    try {
            checkAuthStatus().then(status => {
                // Handle the status (e.g., "authenticated", "noauth", "invalid", "error")
                console.log("Auth status:", status);
    
                if (status == "authenticated" ) {
                    registerButton.addEventListener('click', () => {
                        authModal.classList.add('hidden');
                    });
                }
            });
    } catch (error) {
        console.error("Error checking auth status:", error);
        return "error"; // Handle unexpected errors
    }
    
    // Event Listeners
    loginButton.addEventListener('click', () => {
        authModal.classList.remove('hidden');
    });

    closeAuthModalButton.addEventListener('click', () => {
        authModal.classList.add('hidden');
    });
    logoutButton.addEventListener('click', () => {
        simulateLogout();
    });
    userProfileTopRight.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
    });
    loginWithEmailButton.addEventListener('click', () => {
        emailLoginForm.classList.toggle('hidden');
    });
    document.getElementById('submit-email-login').addEventListener('click', () => {
        simulateLogin();
    });
    getStartedButtonDashboard.addEventListener('click', () => {
        authModal.classList.remove('hidden');
    });
    loginLinkDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.remove('hidden');
    });
    aboutLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('about-section');
    });     
    shareLinkMenu.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('sharefolder-section');
    });   
    teamLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('team-section');
    });
     learningLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('learning-modules-section');
    });       
    learningLinkHeader.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('learning-modules-section');
    });       
    libraryLinkHeader.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('library-section');
    });          
    libraryLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('library-section');
    });       
    aboutMenu.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('about-section');
    });       
    eventsMoreButton.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('events-section');
    });       
    practicalclinicsMoreButton.addEventListener('click', (e) => {   
        e.preventDefault();
        hideAllSectionsExcept('clinics-section');
     }); 
    researchMoreButton.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('research-section');
     }); 
    smallgrantsLinkMore.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('smallgrants-section');
    });       
    smallgrantsLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('smallgrants-section');
    });
    smallgrantsLinkHeader.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('smallgrants-section');
    });
    eventsLinkHeader.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('practical-clinics-section');
    });
    settingsLinkMenu.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('settings-section');
    });
    milestonesLinkMenu.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('milestones-section');
    });
    profileLinkMenu.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('profile-section');
    });




    // Footer and Modal Links for Terms/Privacy Pages
    privacyLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('privacy-section');
    });

    termsLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('terms-section');
    });

    aboutLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('about-section');
    });

    teamLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('team-section');
    });

    blogLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('blog-section');
    });

    faqLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSectionsExcept('faq-section');
    });

    privacyLinkModal.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.add('hidden'); // Close modal when navigating to policy
        hideAllSectionsExcept('privacy-section');
    });

    termsLinkModal.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.add('hidden'); // Close modal when navigating to terms
        hideAllSectionsExcept('terms-section');
    });

    // Supa Chat Panel Events
    chatHeader.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
        chatBody.classList.toggle('hidden');
        closeChatButton.querySelector('i').classList.toggle('fa-chevron-down');
        closeChatButton.querySelector('i').classList.toggle('fa-chevron-up');

    });
    closeChatButton.addEventListener('click', (event) => {
        event.stopPropagation();
        chatContainer.classList.remove('open');
        chatBody.classList.add('hidden');
        chatHeader.querySelector('i').classList.remove('fa-chevron-up');
        chatHeader.querySelector('i').classList.add('fa-chevron-down');

    });

    
    // Initial UI setup
    updateAuthUI();
    hideAllSectionsExcept('dashboard-section'); // Start on dashboard by default
});

