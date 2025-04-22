// translations.js - Handles internationalization for ApproVideo Hub
// This module loads and manages translations for the application

// Default language
const DEFAULT_LANG = 'en';

// Available languages
const AVAILABLE_LANGUAGES = ['en', 'fr', 'es', 'de', 'zh', 'ar'];

// Current active translations
let activeTranslations = {};

/**
 * Translation function - get translated text for a key
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for dynamic text
 * @returns {string} Translated text or key if not found
 */
export function T(key, params = {}) {
  // If no translation found, return the key
  if (!activeTranslations[key]) return key;
  
  let text = activeTranslations[key];
  
  // Replace parameters in format {{param}}
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{${param}}}`, 'g');
      text = text.replace(regex, params[param]);
    });
  }
  
  return text;
}

/**
 * Setup translations by loading the correct language file
 */
export async function setupTranslations() {
  try {
    // Determine which language to use
    const lang = determineLanguage();
    
    // Load translations for the language
    await loadTranslations(lang);
    
    // Make T function available globally
    window.T = T;
    
    // Update language switcher if it exists
    const langSwitcher = document.getElementById('lang-switch');
    if (langSwitcher) {
      langSwitcher.value = lang;
    }
    
    console.log(`Loaded translations for: ${lang}`);
    return lang;
  } catch (error) {
    console.error('Error loading translations:', error);
    
    // Fallback to loading English
    if (determineLanguage() !== DEFAULT_LANG) {
      console.log('Falling back to English translations');
      await loadTranslations(DEFAULT_LANG);
    }
  }
}

/**
 * Determine which language to use based on preferences
 * @returns {string} Language code
 */
function determineLanguage() {
  // Priority:
  // 1. URL parameter
  // 2. Saved preference
  // 3. Browser language
  // 4. Default (en)
  
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  
  if (urlLang && AVAILABLE_LANGUAGES.includes(urlLang)) {
    return urlLang;
  }
  
  // Check saved preference
  const savedLang = localStorage.getItem('preferredLang');
  
  if (savedLang && AVAILABLE_LANGUAGES.includes(savedLang)) {
    return savedLang;
  }
  
  // Check browser language
  const browserLang = navigator.language.slice(0, 2);
  
  if (browserLang && AVAILABLE_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }
  
  // Default to English
  return DEFAULT_LANG;
}

/**
 * Load translations for a specific language
 * @param {string} lang - Language code
 */
async function loadTranslations(lang) {
  try {
    // Fetch the translations file
    const response = await fetch(`/data/lang/${lang}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${lang}`);
    }
    
    const translations = await response.json();
    activeTranslations = translations;
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    throw error;
  }
}

/**
 * Get the current active language
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return determineLanguage();
}

/**
 * Check if text direction should be RTL for current language
 * @returns {boolean} True if language is RTL
 */
export function isRTL() {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(determineLanguage());
}

// Export for use in other modules
export default {
  T,
  setupTranslations,
  getCurrentLanguage,
  isRTL
};