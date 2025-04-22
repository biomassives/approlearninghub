// /public/js/i18n.js
// Simple internationalization module

// Default language
let currentLanguage = 'en';

// Define translations
const translations = {
  en: {
    // Auth Pages
    page_title: "Sign Up / Login - ApproVideo Hub",
    brand_name: "ApproVideo Hub",
    secure_connection: "Secure Connection",
    signup_title: "Create Account",
    login_title: "Login",
    email_label: "Email Address",
    password_label: "Password",
    confirm_password_label: "Confirm Password",
    role_label: "Select Your Role",
    role_placeholder: "-- Select a Role --",
    role_expert: "Expert / Workshop Leader",
    role_learner: "Learner / Volunteer",
    role_researcher: "Research Contributor",
    role_resources: "Resource Finder",
    role_organizer: "Organizer / Coordinator",
    terms_label: "I agree to the Terms of Service and Privacy Policy",
    signup_button: "Create Account",
    login_button: "Log In",
    already_account_prefix: "Already have an account?",
    login_link: "Log in",
    need_account_prefix: "Need an account?",
    signup_link: "Sign up",
    privacy_policy: "Privacy Policy",
    terms_of_service: "Terms of Service",
    
    // Form validation messages
    email_invalid: "Please enter a valid email address",
    password_too_short: "Password must be at least 6 characters",
    confirm_password_mismatch: "Passwords do not match",
    role_required: "Please select a role",
    terms_required: "You must agree to the terms",
    
    // Auth status messages
    signup_success: "Account created successfully!",
    signup_failed: "Failed to create account. Please try again.",
    login_success: "Login successful!",
    login_failed: "Invalid email or password. Please try again.",
    network_error: "Network error. Please check your connection.",
    unexpected_error: "An unexpected error occurred. Please try again.",
    redirecting: "Redirecting to your dashboard...",
    
    // Dashboard
    dashboard_title: "ApproVideo Hub - Dashboard",
    dashboard_welcome: "Welcome to Your Dashboard",
    dashboard_loading: "Loading your personalized dashboard...",
    welcome_user: "Welcome, ${name}! Here's what's new today.",
    nav_dashboard: "Dashboard",
    nav_library: "Library",
    nav_community: "Community",
    logout_button: "Logout",
    no_featured_content: "No featured content available"
  },
  es: {
    // Auth Pages
    page_title: "Registrarse / Iniciar sesión - ApproVideo Hub",
    brand_name: "ApproVideo Hub",
    secure_connection: "Conexión Segura",
    signup_title: "Crear Cuenta",
    login_title: "Iniciar Sesión",
    email_label: "Correo Electrónico",
    password_label: "Contraseña",
    confirm_password_label: "Confirmar Contraseña",
    role_label: "Selecciona Tu Rol",
    role_placeholder: "-- Seleccionar un Rol --",
    role_expert: "Experto / Líder de Taller",
    role_learner: "Estudiante / Voluntario",
    role_researcher: "Colaborador de Investigación",
    role_resources: "Buscador de Recursos",
    role_organizer: "Organizador / Coordinador",
    terms_label: "Acepto los Términos de Servicio y la Política de Privacidad",
    signup_button: "Crear Cuenta",
    login_button: "Iniciar Sesión",
    already_account_prefix: "¿Ya tienes una cuenta?",
    login_link: "Iniciar sesión",
    need_account_prefix: "¿Necesitas una cuenta?",
    signup_link: "Regístrate",
    privacy_policy: "Política de Privacidad",
    terms_of_service: "Términos de Servicio",
    
    // Form validation messages
    email_invalid: "Por favor, introduce un correo electrónico válido",
    password_too_short: "La contraseña debe tener al menos 6 caracteres",
    confirm_password_mismatch: "Las contraseñas no coinciden",
    role_required: "Por favor, selecciona un rol",
    terms_required: "Debes aceptar los términos",
    
    // Auth status messages
    signup_success: "¡Cuenta creada exitosamente!",
    signup_failed: "Error al crear la cuenta. Por favor, inténtalo de nuevo.",
    login_success: "¡Inicio de sesión exitoso!",
    login_failed: "Correo electrónico o contraseña inválidos. Por favor, inténtalo de nuevo.",
    network_error: "Error de red. Por favor, comprueba tu conexión.",
    unexpected_error: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.",
    redirecting: "Redirigiendo a tu panel de control...",
    
    // Dashboard
    dashboard_title: "ApproVideo Hub - Panel de Control",
    dashboard_welcome: "Bienvenido a Tu Panel de Control",
    dashboard_loading: "Cargando tu panel personalizado...",
    welcome_user: "¡Bienvenido, ${name}! Esto es lo nuevo de hoy.",
    nav_dashboard: "Panel",
    nav_library: "Biblioteca",
    nav_community: "Comunidad",
    logout_button: "Cerrar Sesión",
    no_featured_content: "No hay contenido destacado disponible"
  }
};

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {Object} params - Parameters for templating
 * @returns {string} - Translated text
 */
function translate(key, params = {}) {
  // Get the translation object for the current language
  const translationSet = translations[currentLanguage] || translations.en;
  
  // Get the translation string
  let text = translationSet[key] || key;
  
  // Replace template variables
  if (params && typeof text === 'string') {
    Object.keys(params).forEach(param => {
      text = text.replace(`\${${param}}`, params[param]);
    });
  }
  
  return text;
}

/**
 * Set the current language
 * @param {string} lang - Language code
 */
function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    return true;
  }
  return false;
}

/**
 * Get available languages
 * @returns {Array} - Array of language codes
 */
function getLanguages() {
  return Object.keys(translations);
}

/**
 * Apply translations to DOM elements
 * @param {Object} selectors - Mapping of selectors to attribute/property getters
 * @returns {Promise} - Resolves when translations are applied
 */
async function applyTranslations(selectors = { '[data-i18n]': el => el.getAttribute('data-i18n') }) {
  // Add the T function to the window for easy access
  window.T = translate;
  
  // Process each selector
  for (const [selector, getKey] of Object.entries(selectors)) {
    document.querySelectorAll(selector).forEach(el => {
      const key = getKey(el);
      if (key) {
        el.textContent = translate(key);
      }
    });
  }
  
  return Promise.resolve();
}

/**
 * Initialize language switcher if present
 */
function initLanguageSwitcher() {
  // Load saved language preference
  const savedLang = localStorage.getItem('appLanguage');
  if (savedLang && translations[savedLang]) {
    currentLanguage = savedLang;
  }
  
  // Set up language switcher if it exists
  const switcher = document.getElementById('language-switcher');
  if (switcher) {
    // Clear existing options
    switcher.innerHTML = '';
    
    // Add options for each language
    getLanguages().forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang.toUpperCase();
      option.selected = lang === currentLanguage;
      switcher.appendChild(option);
    });
    
    // Handle language change
    switcher.addEventListener('change', async (e) => {
      if (setLanguage(e.target.value)) {
        await applyTranslations();
      }
    });
  }
}

// Export functions
export {
  translate,
  setLanguage,
  getLanguages,
  applyTranslations,
  initLanguageSwitcher
};