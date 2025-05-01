// public/login.js

// Assuming this function exists and handles storing session info securely
import { saveSecureSession } from './js/serverless-enhanced-auth.js';

// Get references to the form elements using the ACTUAL IDs from the HTML
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email'); // Matches HTML ID
const passwordInput = document.getElementById('password'); // Matches HTML ID
const statusMessage = document.getElementById('status-message'); // Matches HTML ID

if (form && emailInput && passwordInput && statusMessage) {
    console.log("Login form elements found, attaching submit handler");
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent default form submission
      console.log("Login form submitted");

      const email = emailInput.value.trim();
      const password = passwordInput.value; // No trim for password

      // Reset status message
      statusMessage.textContent = '';
      statusMessage.className = 'status-box'; // Reset classes to base

      // Basic client-side validation
      if (!email || !password) {
          showError('Please enter both email and password.');
          return;
      }

      try {
        console.log(`Attempting login for email: ${email}`);
        
        // Call the API endpoint
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
          body: JSON.stringify({
              grant_type: 'password',
              email,
              password
            })
        });

        const result = await res.json();
        console.log("Login response received", res.status);

        // Check if the response indicates success (status code 200-299) AND contains expected data
        if (res.ok && result.access_token && result.user) {
          console.log("Login successful, saving session");
          
          await saveSecureSession({
            token: result.access_token,
            refreshToken: result.refresh_token,
            role: result.user.role,
            email: result.user.email
          });

          // Update status message for success
          statusMessage.textContent = 'Login successful! Redirecting...';
          statusMessage.classList.add('text-green-600'); // Use green text color

          // Determine redirect URL based on user role
          const redirectTo = {
            admin: '/admin-dashboard.html',
            expert: '/expert-dashboard.html',
            student: '/dashboard.html'
          }[result.user.role] || '/dashboard.html'; // Default redirect

          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1000);
        } else {
          // Handle errors reported by the API
          console.error("Login failed", result);
          showError(result.message || 'Login failed. Please check your credentials.');
        }
      } catch (err) {
        // Handle network errors or issues parsing the response
        console.error('Login Fetch/Parse Error:', err);
        showError('An unexpected error occurred. Please try again later.');
      }
    });
} else {
    console.error("Login form elements not found. Check HTML IDs:", {
        form: !!form,
        email: !!emailInput,
        password: !!passwordInput,
        statusMessage: !!statusMessage
    });
}

// Function to display error messages in the status area
function showError(msg) {
  if (statusMessage) {
      statusMessage.textContent = msg;
      statusMessage.classList.add('text-red-600'); // Use red text color
  } else {
      console.error("Cannot show error, status message element not found.");
  }
}