/**
 * ApproVideo Hub Translations Module
 * 
 * This module handles multilingual support for the ApproVideo Hub platform.
 * It manages loading and applying translations for different languages.
 */

// Available languages
const AVAILABLE_LANGUAGES = ['en', 'fr', 'es', 'de'];

// Default language
const DEFAULT_LANGUAGE = 'en';

// Translations data store
let translations = {};
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Initialize translations and set the current language
 * @returns {Promise<void>}
 */
export async function setupTranslations() {
  try {
    // Try to get language preference from URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    
    // Then check localStorage
    const storedLang = localStorage.getItem('preferredLang');
    
    // Then check browser language
    const browserLang = navigator.language.split('-')[0];
    
    // Determine which language to use
    let preferredLang = langParam || storedLang || browserLang || DEFAULT_LANGUAGE;
    
    // Validate that it's a supported language
    if (!AVAILABLE_LANGUAGES.includes(preferredLang)) {
      preferredLang = DEFAULT_LANGUAGE;
    }
    
    // Set language and load translations
    currentLanguage = preferredLang;
    localStorage.setItem('preferredLang', preferredLang);
    
    // Load translations
    await loadTranslations(preferredLang);
  } catch (error) {
    console.error('Error setting up translations:', error);
    // Fallback to English
    currentLanguage = DEFAULT_LANGUAGE;
    await loadTranslations(DEFAULT_LANGUAGE);
  }
}

/**
 * Load translations for a specific language
 * @param {string} lang - Language code
 * @returns {Promise<void>}
 */
async function loadTranslations(lang) {
  try {
    // In a production environment, we would fetch from a server
    // For now, we'll use hardcoded translations for demo
    translations = getTranslationsForLanguage(lang);
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    // Fallback to English
    translations = getTranslationsForLanguage(DEFAULT_LANGUAGE);
  }
}

/**
 * Get translated text for a key
 * @param {string} key - Translation key
 * @param {string} defaultText - Default text if translation not found
 * @returns {string} - Translated text
 */
export function T(key, defaultText = '') {
  return translations[key] || defaultText;
}

/**
 * Get current language
 * @returns {string} - Current language code
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Change current language
 * @param {string} lang - New language code
 * @returns {Promise<boolean>} - Success status
 */
export async function changeLanguage(lang) {
  try {
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      return false;
    }
    
    currentLanguage = lang;
    localStorage.setItem('preferredLang', lang);
    await loadTranslations(lang);
    return true;
  } catch (error) {
    console.error(`Error changing language to ${lang}:`, error);
    return false;
  }
}

/**
 * Get list of available languages
 * @returns {Array<string>} - Array of language codes
 */
export function getAvailableLanguages() {
  return AVAILABLE_LANGUAGES;
}

/**
 * Get hardcoded translations for each supported language
 * @param {string} lang - Language code
 * @returns {Object} - Translations object
 */
function getTranslationsForLanguage(lang) {
  const translationSets = {
    'en': {
      // Header
      'approvideo_hub': 'ApproVideo Hub',
      'secure_connection': 'Secure Connection',
      'insecure_connection': 'Insecure Connection',
      
      // Form labels
      'signup_title': 'Create Account',
      'email_label': 'Email Address',
      'password_label': 'Password',
      'confirm_password_label': 'Confirm Password',
      'role_label': 'Select Your Role',
      
      // Role options
      'select_role': '-- Select a Role --',
      'role_expert': 'Expert / Workshop Leader',
      'role_learner': 'Learner / Volunteer',
      'role_researcher': 'Research Contributor',
      'role_resources': 'Resource Finder',
      'role_organizer': 'Organizer / Coordinator',
      
      // Terms
      'terms_agreement': 'I agree to the Terms of Service and Privacy Policy',
      
      // Buttons
      'signup_button': 'Create Account',
      'processing': 'Processing...',
      
      // Login link
      'already_have_account': 'Already have an account? Log in',
      
      // Validation messages
      'email_required': 'Email is required',
      'email_invalid': 'Please enter a valid email address',
      'password_required': 'Password is required',
      'password_too_short': 'Password must be at least 8 characters',
      'confirm_password_required': 'Please confirm your password',
      'passwords_dont_match': 'Passwords do not match',
      'role_required': 'Please select a role',
      'terms_required': 'You must accept the Terms of Service and Privacy Policy',
      
      // Password strength
      'password_weak': 'Weak',
      'password_fair': 'Fair',
      'password_good': 'Good',
      'password_strong': 'Strong',
      'password_req_length': 'At least 8 characters',
      'password_req_uppercase': 'At least one uppercase letter',
      'password_req_lowercase': 'At least one lowercase letter',
      'password_req_number': 'At least one number',
      
      // Status messages
      'registration_success': 'Account created successfully!',
      'signup_failed': 'Registration failed',
      'unexpected_error': 'An unexpected error occurred. Please try again later.',
      
      // Footer
      'protected_by': 'Protected by ApproVideo Hub\'s Lattice Security System',
      'privacy_policy': 'Privacy Policy',
      'terms_of_service': 'Terms of Service'
    },
    // Additional language translations follow...
  };
  
  return translationSets[lang] || translationSets[DEFAULT_LANGUAGE];
}

// Export module
export default {
  setupTranslations,
  T,
  getCurrentLanguage,
  changeLanguage,
  getAvailableLanguages
};