// js/app.js
//
// GPL v3   GENERAL PUBLIC LICENSE
// G. WILLSON SCD HUB PO BOX 911 NEDERLAND CO 80466 USA
//
// --- Dexie Database Setup ---
const db = new Dexie("ApprovideoLearningHub");
db.version(1).stores({  //Initial setup
    authTokens: "id, token, key"
});
db.version(2).stores({
    authTokens: "id, token, key",
    userContent: "++id, title, content, createdBy, createdAt",
}).upgrade(tx => {
    // You could add code here to migrate data if needed,
    // but for a new table, it's often empty.
    console.log("Database upgraded to version 2. userContent table created.");
});


let supabase; // Declare supabase globally

function initSupabase() {
    if (supabase) return; // Important: Only initialize once

    const supabaseUrl = 'https://vlvbodwrtblttvwnxkjx.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdmJvZHdydGJsdHR2d254a2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODY3NDk2NzIsImV4cCI6MjAwMjMyNTY3Mn0.TRT1HeX85vP1zDxnU7qBz5GqNPgYZUj-BOdek4qmtEg';
    // Initialize Supabase client
    // IMPORTANT:  Only create the client once to avoid multiple listeners
    // and potential memory leaks.

    // This is a common pitfall when using Supabase with Dexie or other state management.
    // Create the Supabase client
    // and store it in a global variable to avoid re-initialization.
    // This ensures that the client is only created once, preventing multiple listeners
    // and potential memory leaks.

    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // --- onAuthStateChange Listener (INSIDE initSupabase) ---


    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (session && session.user) {
                // User is signed in
                isLoggedIn = true;

                // --- Fetch User Profile from Supabase ---
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error('Error fetching profile:', profileError);
                } else if (profile) {
                    // Profile found, update UI
                    userName = profile.full_name || profile.username || "User";
                    userRole = profile.role || "user";
                    updateAuthUI();

                     // Clean up local storage (Dexie) - No longer needed for auth
                    await db.authTokens.clear();  //IMPORTANT so old keys and tokens are gone.
                } else {
                    // --- Handle new user case ---
                    console.log("New user - creating profile");
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([
                            { id: session.user.id, username: session.user.email, role: 'user' }, // Set initial role
                        ]);

                    if (insertError) {
                        console.error('Error creating new user profile:', insertError);
                    } else {
                        userName = session.user.email; // Use email as default
                        userRole = 'user';
                        updateAuthUI();
                         // Clean up local storage (Dexie) - No longer needed for auth
                        await db.authTokens.clear();
                    }
                }
            }
        } else if (event === 'SIGNED_OUT') {
            // User is signed out
            isLoggedIn = false;
            userName = "User";
            userRole = "user";
            updateAuthUI();
        }
    });
}

function checkConsentAndInit() {
    const consent = localStorage.getItem('supabaseConsent');
    if (consent === 'true') {
        initSupabase();
    }
}

// Define checkScroll globally or move the window event listener inside DOMContentLoaded
function checkScroll() {
  if (filenameDisplay.offsetWidth > filenameContainer.offsetWidth) {
    filenameContainer.classList.add('scrolling');
  } else {
    filenameContainer.classList.remove('scrolling');
  }
}

// Then you can have
window.addEventListener('resize', checkScroll);

    document.addEventListener('DOMContentLoaded', function() {
      // Get elements
      const audioElement = document.getElementById('audioElement');
      const playPauseBtn = document.getElementById('playPauseBtn');
      const progressBar = document.getElementById('progressBar');
      const progressContainer = document.getElementById('progressContainer');
      const currentTimeElement = document.getElementById('currentTime');
      const durationElement = document.getElementById('duration');
      const filenameDisplay = document.getElementById('filenameDisplay');
      const filenameContainer = document.getElementById('filenameContainer');
      const downloadLink = document.getElementById('downloadLink');
      const thumbnailImg = document.getElementById('thumbnailImg');
     
      // Initialize
      let isPlaying = false;
      
      // Extract and display filename from the audio source
      function extractFilename(src) {
        // Get just the filename from the path
        const fullPath = src.split('/');
        const filename = fullPath[fullPath.length - 1];
        
        // Store original filename for download
        const originalFilename = filename;
        
        // Remove extension and replace hyphens with spaces
        const cleanName = filename.split('.')[0].replace(/-/g, ' ');
        
        // Capitalize words for nicer display
        return {
          display: cleanName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          original: originalFilename
        };
      }
      
      // Set up filename display and download link
      const fileInfo = extractFilename(audioElement.src);
      filenameDisplay.textContent = fileInfo.display;
      downloadLink.href = audioElement.src;
      downloadLink.download = fileInfo.original;
      downloadLink.setAttribute('title', 'Download ' + fileInfo.original);
      
      // Check if text needs scrolling
      function checkScroll() {
        if (filenameDisplay.offsetWidth > filenameContainer.offsetWidth) {
          filenameContainer.classList.add('scrolling');
        } else {
          filenameContainer.classList.remove('scrolling');
        }
      }
      
      // Call checkScroll after rendering
      setTimeout(checkScroll, 100);
      
      // Set thumbnail image based on audio type
      // In a real application, you would determine this based on audio metadata
      // For now, we'll use a basic approach
      if (fileInfo.original.includes('briquette')) {
        thumbnailImg.src = "/assets/mp3/briquette.webp";
        thumbnailImg.alt = "Briquette Audio";
      } else {
        thumbnailImg.src = "/assets/mp3/defult.webp"; 
        thumbnailImg.alt = "Audio Thumbnail";
      }
     
      // Format time in MM:SS
      function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
     
      // Set up duration display once metadata is loaded
      audioElement.addEventListener('loadedmetadata', function() {
        durationElement.textContent = formatTime(audioElement.duration);
      });
     
      // Toggle play/pause
      playPauseBtn.addEventListener('click', function() {
        if (isPlaying) {
          audioElement.pause();
          playPauseBtn.textContent = '▶';
        } else {
          audioElement.play()
            .catch(error => {
              console.error('Playback failed:', error);
              filenameDisplay.textContent = 'Error loading audio';
              // Provide fallback or error message if needed
            });
          playPauseBtn.textContent = '❚❚';
        }
        isPlaying = !isPlaying;
      });
     
      // Update progress bar and current time during playback
      audioElement.addEventListener('timeupdate', function() {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.style.width = `${progress}%`;
        currentTimeElement.textContent = formatTime(audioElement.currentTime);
      });
     
      // Allow seeking by clicking on progress bar
      progressContainer.addEventListener('click', function(e) {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = pos * audioElement.duration;
      });
     
      // Reset player when audio ends
      audioElement.addEventListener('ended', function() {
        progressBar.style.width = '0%';
        playPauseBtn.textContent = '▶';
        isPlaying = false;
        audioElement.currentTime = 0;
      });
     
      // Handle errors
      audioElement.addEventListener('error', function() {
        console.error('Audio error:', audioElement.error);
        filenameDisplay.textContent = 'Error: File not found';
        filenameDisplay.style.color = '#000000';
        downloadLink.style.display = 'none';
      });
      
      // Reset scrolling when audio ends
      audioElement.addEventListener('ended', function() {
        // Reset scrolling animation if needed
        filenameContainer.classList.remove('scrolling');
        setTimeout(checkScroll, 100);
      });
      
      // Start scrolling on mouseover and pause on mouseout for better user experience
      filenameContainer.addEventListener('mouseenter', function() {
        if (filenameDisplay.offsetWidth > filenameContainer.offsetWidth) {
          filenameContainer.classList.add('scrolling');
        }
      });
      
      filenameContainer.addEventListener('mouseleave', function() {
        filenameContainer.classList.remove('scrolling');
        setTimeout(() => {
          checkScroll();
        }, 2000);
      });
      
      // Responsive handling for window resize
    });

// --- DOMContentLoaded Event ---
window.addEventListener('resize', checkScroll);
document.addEventListener('DOMContentLoaded', async () => {

    // --- DOM Element Selection (Consolidated) ---
    const authLoggedInTopRight = document.getElementById('auth-logged-in-top-right');
    const authLoggedOutTopRight = document.getElementById('auth-logged-out-top-right');
    const userProfileTopRight = document.getElementById('user-profile-top-right');
    const userDropdown = document.getElementById('user-dropdown');

    // set initial state
    userProfileTopRight.classList.toggle('hidden');

    // User Authentication Elements 
    const loginButton = document.getElementById('login-button');
    const timelineButton = document.getElementById('timeline-button');
    const registerButton = document.getElementById('user-profile-top-right'); // Reused below
    const logoutButton = document.getElementById('logout-button');
    const authModal = document.getElementById('auth-modal');
    const closeAuthModalButton = document.getElementById('close-auth-modal');
    const emailLoginForm = document.getElementById('email-login-form');
    const loginWithEmailButton = document.getElementById('login-with-email');
    const submitEmailLoginButton = document.getElementById('submit-email-login');
    const dashboardSection = document.getElementById('dashboard-section');
    const welcomeSection = document.getElementById('welcome-section');
    const dashboardLoggedInContent = document.getElementById('dashboard-logged-in');
    const dashboardLoggedOutContent = document.getElementById('dashboard-logged-out');
    const dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    const roleBasedDashboardContent = document.getElementById('role-based-dashboard-content');
    const getStartedButtonDashboard = document.getElementById('get-started-button-dashboard');
    const loginLinkDashboard = document.getElementById('login-link-dashboard');
    const startClinicButton = document.getElementById('start-a-clinic-public-header');

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
    const startClinicSection = document.getElementById('start-a-clinic-public');

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
    const teachingModulesSection = document.getElementById('teaching-modules-section');
    const sharefolderSection = document.getElementById('sharefolder-section');
    const smallgrantsSection = document.getElementById('smallgrants-section');
    const researchSection = document.getElementById('research-section');
    const practicalClinicsSection = document.getElementById('practical-clinics-section');
    //const milestonesSection = document.getElementById('milestones-section');
    const teachingSection = document.getElementById('teaching-section');


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
    const learningLinkHeader = document.getElementById('learning-header');
    const libraryLinkFooter = document.getElementById('library-footer');
    const libraryLinkHeader = document.getElementById('library-header');
    const librarycrLinkHeader = document.getElementById('librarycr-header');
    const eventsLinkHeader = document.getElementById('events-header');
    const practicalclinicsMoreButton = document.getElementById('more-practical-clinics-button');

    const skillTrainingButton = document.getElementById('library-header');
    const skillTraining2Button = document.getElementById('skilltraining-header');
    const skillTrainingMenu = document.getElementById('skill-training-menu');
    const crisisReliefButton = document.getElementById('librarycr-header');
    const moreButton = document.getElementById('more-button'); // You have this, but it's unused
    const modalModuleMenu = document.getElementById('modal-module-menu'); // You have this, but it's unused
    const modalModuleMenuButton = document.getElementById('modal-module-menu-button'); // You have this, but it's unused
    const moduleButtonBiodiversityAndEcosystemsButton = document.getElementById('module-biodiversity-and-ecosystems-button');
    const moduleButtonBiodiversityAndEcosystems = document.getElementById('module-biodiversity-and-ecosystems');

    // Menu Links
    const profileLinkMenu = document.getElementById('profile-menu');
    const teachingLinkMenu = document.getElementById('teaching-menu');
    const settingsLinkMenu = document.getElementById('settings-menu');
    const shareLinkMenu = document.getElementById('share-menu');

    // Modal  & Megamenu
    const privacyLinkModal = document.getElementById('privacy-link-modal');
    const termsLinkModal = document.getElementById('terms-link-modal');
    const megaMenuButton = document.getElementById('mega-menu-button');
    const megaMenu = document.getElementById('mega-menu');
    const megaMenuButtonCLOSE = document.getElementById('mega-menu-button-close');

    const authMenu = document.getElementById('auth-modal');
    const authMenuButtonCLOSE = document.getElementById('auth-modal-button-close');
    const emailInput = document.getElementById('email-input');

   // consent checkbox in login form
   const supabaseConsentCheckbox = document.getElementById('supabase-consent'); //  Add this to your HTML!



    // --- State Variables ---
    let isLoggedIn = false;
    let userName = "User";
    let userRole = "user";  // Default role
    let registerButtonListenerAdded = false;

    // --- Role-Based Content ---
    const roleContent = {
        'user': '<p>Welcome to your user dashboard. Explore learning modules and health clinics.</p>',
        'project leader': '<p>Project Leader Dashboard: Manage projects and team members.</p>',
        'expert mentor': '<p>Expert Mentor Dashboard: Guide and mentor learners.</p>',
        'research assistance': '<p>Research Assistant Dashboard: Contribute to research projects.</p>',
        'member of effected community': '<p>Community Member Dashboard: Access resources and community forums.</p>',
        'software admin': '<p>Software Admin Dashboard: System administration and user management.</p>',
        'default': '<p>Generic dashboard content for logged-in users.</p>'
    };

    // --- Profile Data (Example) ---
    // *This is important for simulating different user profiles.*
    const profiles = {
        'user1': { name: 'Mia Fahroe', role: 'project leader' },
        'user2': { name: 'John Doe', role: 'user' },
        'user3': { name: 'Admin User', role: 'software admin' }
    };


    // --- Event Listeners ---



    megaMenuButton.addEventListener('click', () => {
        megaMenu.classList.toggle('hidden');
        megaMenuButtonCLOSE.classList.toggle('block');
    });

    megaMenuButtonCLOSE.addEventListener('click', () => {
        megaMenu.classList.toggle('hidden');
        megaMenuButtonCLOSE.classList.toggle('hidden');
    });



    authMenuButtonCLOSE.addEventListener('click', () => {
        authMenu.classList.toggle('hidden');
        profileLinkMenu.classList.toggle('hidden');
    });

    // accordion headers
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('accordion-header')) {
            const item = event.target.closest('.accordion-item');
            if (item) {
                item.classList.toggle('active');
            }
        }
    });

    // Click listeners for other menu toggles
    skillTraining2Button.addEventListener('click', () => {
        skillTrainingMenu.classList.toggle('hidden');
    });



    moduleButtonBiodiversityAndEcosystemsButton.addEventListener('click', () => {
        moduleButtonBiodiversityAndEcosystems.classList.toggle('hidden');
    });

    // Click listener to close menus when clicking outside
    document.addEventListener('click', (event) => {
        if (!userDropdown.classList.contains('hidden')) {
            if (!userDropdown.contains(event.target) && !userProfileTopRight.contains(event.target)) {
                userDropdown.classList.add('hidden');
            }
        }

        if (!skillTrainingButton.contains(event.target) && !skillTrainingMenu.contains(event.target)) {
            skillTrainingMenu.classList.add('hidden');
        }
     
    });

    // Close dropdown on nav link clicks
    document.querySelectorAll('a, button:not(#user-profile-top-right):not(#logout-button)').forEach(link => {
        link.addEventListener('click', () => {
            if (!userDropdown.classList.contains('hidden')) {
                userDropdown.classList.add('hidden');
            }
        });
    });

     //Icon Nav Text
    document.querySelectorAll('.icon-nav-item').forEach(item => {
                const text = item.textContent; // Store original text
                item.innerHTML = ''; // Clear original text
                item.appendChild(document.createElement('span')).textContent = text; // Add text as span
    });

    // --- Authentication Functions ---

    async function checkAuthStatus() {
        try {
            const authData = await db.authTokens.get(1);
            if (!authData) {
                console.log("No auth data found.");
                return "noauth";
            }

            console.log("Stored token (hex):", authData.token); // Debugging
            console.log("Stored key (JWK):", authData.key);   // Debugging

            const importedKey = await importKey(authData.key);
            const decryptedToken = await decryptToken(authData.token, importedKey);

            if (decryptedToken) {
                // *** IMPORTANT:  Simulate Login with Decrypted Token ***
                // In a real application, you'd decode a JWT here and extract user info.
                // For this example, we'll just use a simple check.
                if (decryptedToken.startsWith("user")) { // Example:  "user1", "user2", etc.
                    simulateLogin(decryptedToken); // Pass the user ID/token
                }

                console.log("Authentication data found and decrypted.");
                return "authenticated";
            } else {
                console.log("Decryption failed or token is invalid.");
                return "invalid";
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            return "error";
        }
    }

    async function decryptToken(hexEncodedCombined, key) {
        try {
            const combined = new Uint8Array(hexEncodedCombined.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);

            const decryptedData = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );

            const decryptedToken = new TextDecoder().decode(decryptedData);
            return decryptedToken;
        } catch (error) {
            console.error("Decryption error:", error);
            return null; // Important: Return null on failure
        }
    }

    async function exportKey(key) {
        return window.crypto.subtle.exportKey("jwk", key);
    }

    async function importKey(jwk) {
        return window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "AES-GCM" },  // Corrected: No length
            true,
            ["encrypt", "decrypt"]
        );
    }

    // --- Modified simulateLogin to accept a profile ID ---
    function simulateLogin(profileId = 'user1') {  // Default to user1
        const profile = profiles[profileId] || profiles['user1']; // Fallback to user1

        isLoggedIn = true;
        userName = profile.name;
        userRole = profile.role;
        updateAuthUI();
        authModal.classList.add('hidden');
    }

    // --- Token Generation and Encryption (Unchanged, but included for completeness) ---

    async function generateAndEncryptToken() {
        const token = generateRandomValue(); // You have this function, good!
        const key = await generateEncryptionKey();
        const encryptedToken = await encryptToken(token, key);
        return { encryptedToken: encryptedToken, key: key };
    }

    async function generateEncryptionKey() {
        return window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    function generateRandomValue(length = 32) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    async function encryptToken(token, key) {
        const encodedToken = new TextEncoder().encode(token);
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Generate a fresh IV *per encryption*
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv, }, // Use the generated IV
            key,
            encodedToken
        );

        // Combine IV and ciphertext (critical for AES-GCM)
        const ivArray = new Uint8Array(iv);
        const ciphertextArray = new Uint8Array(encryptedData);
        const combined = new Uint8Array(ivArray.length + ciphertextArray.length);
        combined.set(ivArray);
        combined.set(ciphertextArray, ivArray.length);

        // Convert to hex for storage
        return Array.from(combined)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    async function storeEncryptedToken(encryptedToken, key) {
        try {
            const jwkKey = await exportKey(key); // Export to JWK *before* storing
            await db.authTokens.put({ id: 1, token: encryptedToken, key: jwkKey }); // Store the JWK
            console.log("Encrypted token and key stored successfully.");
        } catch (error) {
            console.error("Error storing encrypted token and key:", error);
        }
    }


    async function handleMagicLinkLogin() {
        const email = emailInput.value.trim();

        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        // Check for consent BEFORE sending the magic link
        if (!supabaseConsentCheckbox.checked) {
            alert('You must agree to the terms to use Supabase authentication.');
            return;
        }

         // Store consent in localStorage
        localStorage.setItem('supabaseConsent', 'true');

        // Initialize Supabase *after* consent is given
        initSupabase();


        const { data, error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            console.error('Error sending magic link:', error);
            alert(`Error sending magic link: ${error.message}`);
        } else {
            console.log('Magic link sent to:', email);
            alert(`Check your email (${email}) for the magic link to sign in.`);
            emailLoginForm.classList.add('hidden');  // Hide the login form
        }
    }

    // --- Modified simulateLogin to accept a profile ID ---
    function simulateLogin(profileId = 'user1') {  // Default to user1
        const profile = profiles[profileId] || profiles['user1']; // Fallback to user1

        isLoggedIn = true;
        userName = profile.name;
        userRole = profile.role;
        updateAuthUI();
        authModal.classList.add('hidden');
    }




    // Function to hide all main sections except one (you have this, it's good)
 else {
                  section.classList.add('hidden');
              }
            }
        });
    }


    // --- Data Export Function ---
    async function exportData() {
        try {
            const allData = {};

            // Iterate over all defined stores in your Dexie database.
            for (const table of db.tables) {
                allData[table.name] = await table.toArray();
            }

            // Convert the data to a JSON string.
            const json = JSON.stringify(allData, null, 2); // Use 2 spaces for indentation

            // Create a Blob from the JSON string.
            const blob = new Blob([json], { type: 'application/json' });

            // Create a download link.
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'approvideo_data_export.json'; // Set the filename
            document.body.appendChild(a); // Append to the document.
            a.click(); // Trigger the download.
            document.body.removeChild(a); // Clean up.

        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Error exporting data: " + error.message);
        }
    }
    
    // --- Initial Setup ---
    // Check authentication status *before* setting up other event listeners.
    try {
        const status = await checkAuthStatus(); // This is now async
         console.log("Auth status:", status);

        // Event Listeners that depend on auth status (moved inside the try block)
        if (status === "authenticated") {
             // Add event listener only when authenticated
             //This prevents adding duplicate listeners
                registerButton.addEventListener('click', () => {
                    authModal.classList.add('hidden');
                 });
        } else {
            //If not authenticated, show the auth modal on register button click
            // This also only adds the listener *once*.
            if (!registerButtonListenerAdded) {
                registerButton.addEventListener('click', () => {
                        authModal.classList.remove('hidden');
                });
                registerButtonListenerAdded = true; // Set the flag
            }
        }

    } catch (error) {
        console.error("Error during initial setup:", error);
    }




    // --- Event Listeners (that don't depend on auth status) ---

    checkConsentAndInit(); // Check for consent and initialize Supabase if allowed
    
    // Add the event listener for email login *after* defining handleMagicLinkLogin
    if (submitEmailLoginButton) { //best practice
        submitEmailLoginButton.addEventListener('click', handleMagicLinkLogin);
    }

    loginButton.addEventListener('click', () => {
        authModal.classList.remove('hidden');
    });

    closeAuthModalButton.addEventListener('click', () => {
        authModal.classList.add('hidden');
    });

    logoutButton.addEventListener('click', async () => {
        try {
            // Check if Supabase is initialized and consent is given
            if (supabase && localStorage.getItem('supabaseConsent') === 'true') {
                const { error } = await supabase.auth.signOut();
    
                if (error) {
                    console.error('Error signing out:', error);
                    alert('Error signing out: ' + error.message);
                    return; // Exit the function if there's an error
                } else {
                    console.log('Signed out successfully (Supabase)');
                }
            } else {
                console.log('User not using Supabase or consent not given.');
                // Handle local logout if needed (e.g., clearing local tokens)
                //  await db.authTokens.clear(); // Clear Dexie tokens if you still use them
                //  isLoggedIn = false; //  These may not be needed if Supabase listener is working
                //  userName = "User";
                //  userRole = 'user';
                //  updateAuthUI();
            }
    
            // UI updates should largely be handled by the Supabase auth state listener
            // But you might want to add a final catch-all here
            isLoggedIn = false;
            userName = "User";
            userRole = 'user';
            updateAuthUI();
        } catch (error) {
            console.error('Error during logout:', error);
            alert('An error occurred during logout.');
        }
    });

    userProfileTopRight.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
    });

    loginWithEmailButton.addEventListener('click', () => {
        emailLoginForm.classList.toggle('hidden');
    });

    // --- SIMULATE LOGIN FROM EMAIL FORM ---
    submitEmailLoginButton.addEventListener('click', () => {
       //simulateLogin(); // OLD - Don't use the default simulateLogin

       //  Get user input (replace with actual form value)
        const email = document.getElementById('email-input').value; //  Get email
        let   userId  = 'user1'; // Default

        // Basic email-to-user mapping (replace with a real lookup)
        if (email.includes("projectleader")) {
            userId = 'user1';
        } else if (email.includes("user")) {
            userId = 'user2';
        } else if (email.includes("admin")) {
            userId = 'user3';
        }

        // --- Simulate Login with a Specific Profile ---
        simulateLogin(userId);

        // --- Generate, encrypt, and store a token (for persistence) ---
          generateAndEncryptToken().then((result) => {
            const encryptedToken = result.encryptedToken;
            const key = result.key;
            storeEncryptedToken(encryptedToken, key);
            userProfileTopRight.classList.toggle('hidden');
          });
    });

    getStartedButtonDashboard.addEventListener('click', () => {
        e.preventDefault();
        authModal.classList.remove('hidden');
    });

    loginLinkDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.classList.remove('hidden');
    });

    // --- Section Navigation (Using hideAllSectionsExcept) ---
    // These event listeners are simplified.

# --- Old sectionLinks object commented out ---
#     const sectionLinks = {
        'about-footer': 'about-section',
        'share-menu': 'sharefolder-section',
        'team-footer': 'team-section',
        'start-a-clinic-header': 'start-a-clinic-section',
        'learning-header': 'learning-modules-section',
        'library-header': 'library-section',
        'about-menu': 'about-section',
        'small-grants-footer': 'smallgrants-section',
        'approvideo-blog' : 'blog-section',
        'more-smallgrants': 'smallgrants-section',
        'more-events': 'events-section',
        'more-practical-clinics-button': 'clinics-section',
        'more-research': 'research-section',
        'small-grants-header': 'smallgrants-section',
        'events-header': 'practical-clinics-section',
        'settings-menu': 'settings-section',
        'timeline-button': 'timeline-section',

        'teaching-menu': 'teaching-section',
        'profile-menu': 'profile-section',
        'dashboard-menu': 'dashboard-section',
        'privacy-link-footer': 'privacy-section',
        'terms-link-footer': 'terms-section',
        'blog-footer': 'blog-section',
        'faq-footer': 'faq-section',
        'faq-welcome': 'faq-section',
    };

# --- End of commented out sectionLinks object ---
              
//         'milestones-menu': 'milestones-section',

# --- Old sectionLinks loop commented out ---
# 
    for (const [elementId, sectionId] of Object.entries(sectionLinks)) {
        const element = document.getElementById(elementId);
        if (element) { //  Check if the element exists
            element.addEventListener('click', (e) => {
                e.preventDefault();
                hideAllSectionsExcept(sectionId);
            });
        }
# --- End of commented out sectionLinks loop ---
              
    }
// --- Event Listeners for Navigation (New Approach using Event Delegation) ---

document.addEventListener('click', (event) => {
    // Find the closest ancestor anchor or button with a data-section attribute
    const navElement = event.target.closest('a[data-section], button[data-section]');

    if (navElement && navElement.dataset.section) {
        event.preventDefault(); // Prevent default anchor link behavior or button form submission
        const targetSectionId = navElement.dataset.section;

        // Basic check if the section exists before attempting to show it
        if (document.getElementById(targetSectionId)) {
             showSection(targetSectionId); // Let showSection handle hash update
        } else {
             console.warn(`Navigation target section "${targetSectionId}" not found in HTML.`);
             // Optionally show a default section or error message
             // showSection('user-dashboard-section'); // Example fallback
             return; // Don't proceed if target doesn't exist
        }


        // Optional: Close dropdown if the clicked item is inside one
        const dropdown = navElement.closest('#user-dropdown'); // Example dropdown ID
        if (dropdown && !dropdown.classList.contains('hidden')) {
             // Assuming toggleUserDropdown exists or similar logic
             // toggleUserDropdown(); // Replace with your actual dropdown closing logic
             dropdown.classList.add('hidden');
             console.log("Closing dropdown after nav click.");
        }
        // Add similar logic for other menus like mega-menu if needed
        const megaMenu = navElement.closest('#mega-menu');
        if (megaMenu && !megaMenu.classList.contains('hidden')) {
            megaMenu.classList.add('hidden');
             // Maybe also hide the close button
             const megaMenuButtonCLOSE = document.getElementById('mega-menu-button-close');
             if(megaMenuButtonCLOSE) megaMenuButtonCLOSE.classList.add('hidden'); // Check if exists
        }
         // Add logic for skill training menu
         const skillMenu = navElement.closest('#skill-training-menu'); // Assuming this is the ID
         if (skillMenu && !skillMenu.classList.contains('hidden')) {
             skillMenu.classList.add('hidden');
         }

    }
});






    // --- UI Update Functions ---

    function updateAuthUI() {
        if (isLoggedIn) {
            loginButton.classList.toggle('hidden');
            timelineButton.classList.toggle('hidden');
            authLoggedOutTopRight.classList.add('hidden');
            authLoggedInTopRight.classList.remove('hidden');
            dashboardLoggedOutContent.classList.add('hidden');
            dashboardLoggedInContent.classList.remove('hidden');
            welcomeSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            dashboardWelcomeMessage.innerHTML = `Welcome, <span class="math-inline">${userName}! (${userRole})</span>`;
            renderRoleBasedContent();

            if (chatContainer && chatNotificationBadge) {
                chatContainer.classList.remove('hidden');
                chatNotificationBadge.classList.remove('hidden');        
            }


        } else {
            loginButton.classList.toggle('block');
            timelineButton.classList.toggle('block');
            authLoggedInTopRight.classList.add('hidden');
            authLoggedOutTopRight.classList.remove('hidden');
            dashboardLoggedInContent.classList.add('hidden');
            dashboardLoggedOutContent.classList.remove('hidden');
            welcomeSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            chatContainer.classList.add('hidden');
            chatNotificationBadge.classList.add('hidden');
        }
        //hideAllSectionsExcept('dashboard-section'); // Ensure dashboard is visible
    }

    function renderRoleBasedContent() {
        let content = roleContent[userRole] || roleContent['default'];
        roleBasedDashboardContent.innerHTML = content;
    }





    // Modal Links for Terms/Privacy (Simplified)
    if(privacyLinkModal){
      privacyLinkModal.addEventListener('click', (e) => {
          e.preventDefault();
          authModal.classList.add('hidden'); // Close modal
          hideAllSectionsExcept('privacy-section');
      });
    }
    if (termsLinkModal){
      termsLinkModal.addEventListener('click', (e) => {
          e.preventDefault();
          authModal.classList.add('hidden'); // Close modal
          hideAllSectionsExcept('terms-section');
      });
    }
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

      // Add event listener for the export data button
      const exportDataButton = document.getElementById('export-data-button'); // Make sure this ID exists in your HTML
      if (exportDataButton) {
          exportDataButton.addEventListener('click', exportData);
      }    // --- Handle Initial Page Load Section ---
    const initialHash = window.location.hash.substring(1);
    let sectionToLoadInitially = '';

    // Determine initial section based on hash and auth state (logic inside DOMContentLoaded)
    const currentAuthStatus = await checkAuthStatus(); // Re-check or use stored status

    if (initialHash) {
        const potentialSectionId = `${initialHash}-section`;
        // Basic validation: Does an element with this ID exist?
        if (document.getElementById(potentialSectionId)) {
            // More robust check: Is this section appropriate for the current auth state?
             const isPublicSection = ['welcome-section', 'dashboard-section', 'about-section', 'privacy-section', 'terms-section', 'faq-section', 'blog-section', 'library-section' /* add other public IDs */ ].includes(potentialSectionId);
             const isLoggedInOnlySection = !isPublicSection; // Assume others are logged-in only for simplicity

            if (currentAuthStatus === "authenticated" && isLoggedInOnlySection) {
                 sectionToLoadInitially = potentialSectionId;
            } else if (currentAuthStatus !== "authenticated" && isPublicSection) {
                 sectionToLoadInitially = potentialSectionId;
            } else if (currentAuthStatus !== "authenticated" && isLoggedInOnlySection) {
                 console.log(`Attempted to access logged-in section (${potentialSectionId}) while logged out. Redirecting to default.`);
                 // Fall through to default logic below
            } else if (currentAuthStatus === "authenticated" && isPublicSection) {
                 // Allow logged-in users to view public sections via hash
                 sectionToLoadInitially = potentialSectionId;
            }
        } else {
             console.warn(`Initial hash target section "${potentialSectionId}" not found.`);
             // Fall through to default logic
        }
    }

    // If no valid hash section determined, use default based on auth
    if (!sectionToLoadInitially) {
        sectionToLoadInitially = (currentAuthStatus === "authenticated") ? 'user-dashboard-section' : 'dashboard-section'; // Or 'welcome-section'
    }

    console.log("Initial section to load:", sectionToLoadInitially);
    // Make sure the section exists before showing
    if (document.getElementById(sectionToLoadInitially)) {
        showSection(sectionToLoadInitially, false); // Show initial section without updating hash again
    } else {
        console.error(`Cannot show initial section "${sectionToLoadInitially}" as it does not exist in the DOM.`);
        // Attempt to show an absolute fallback like the body or show an error message
        const fallbackSection = (currentAuthStatus === "authenticated") ? 'user-dashboard-section' : 'dashboard-section';
        if (document.getElementById(fallbackSection)) {
             showSection(fallbackSection, false);
        } else {
             document.body.innerHTML = "<h1>Error: Critical application sections missing.</h1>";
        }
    }


    // --- Add listener for hash changes (for back/forward buttons) ---
    window.addEventListener('hashchange', async () => {
        console.log("Hash changed detected");
        const newHash = window.location.hash.substring(1);
        const targetSectionId = newHash ? `${newHash}-section` : '';

        // Re-check auth status in case it changed since page load (e.g., token expired)
         const authStatus = await checkAuthStatus(); // Or get from Supabase state listener
         let defaultSectionId = (authStatus === "authenticated") ? 'user-dashboard-section' : 'dashboard-section';

        let sectionIdToShow = targetSectionId || defaultSectionId;

         // Optional: Add validation here - check if targetSectionId is valid for current auth state
         if (targetSectionId && document.getElementById(targetSectionId)) {
             const isPublic = ['welcome-section', 'dashboard-section', 'about-section', 'privacy-section', 'terms-section', 'faq-section', 'blog-section', 'library-section'].includes(targetSectionId);
             const isLoggedInOnly = !isPublic;

             if (authStatus !== "authenticated" && isLoggedInOnly) {
                  console.log(`Hash change to logged-in section (${targetSectionId}) while logged out. Showing default.`);
                  sectionIdToShow = defaultSectionId;
             }
             // Allow logged-in users to see public sections via hash
         } else if (targetSectionId && !document.getElementById(targetSectionId)) {
             console.warn(`Hash change target section "${targetSectionId}" not found. Showing default.`);
             sectionIdToShow = defaultSectionId;
         }


        console.log(`Hash changed to: #${newHash}, attempting to show: ${sectionIdToShow}`);
         // Ensure the final section to show exists
         if (document.getElementById(sectionIdToShow)) {
            showSection(sectionIdToShow, false); // Show section based on hash, don't update hash again
         } else {
             console.error(`Cannot show section "${sectionIdToShow}" from hashchange as it does not exist. Showing absolute fallback.`);
              const absoluteFallback = (authStatus === "authenticated") ? 'user-dashboard-section' : 'dashboard-section';
              if (document.getElementById(absoluteFallback)) {
                  showSection(absoluteFallback, false);
              }
         }
    });



      updateAuthUI();  // Sets initial state based on isLoggedIn
  
}); // End of DOMContentLoaded
