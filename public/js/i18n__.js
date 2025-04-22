// js/i18n.js
// Common Internationalization (i18n) helper for ApproVideo Hub

// Supported languages fallback order
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de', 'zh', 'ar'];

/**
 * Get the user's preferred language: URL param, localStorage, or browser.
 */
export function getPreferredLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get('lang');
  const storedLang = localStorage.getItem('preferredLang');
  const browserLang = navigator.language.slice(0, 2);
  if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang)) return queryLang;
  if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) return storedLang;
  if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;
  return 'en';
}

/**
 * Load translations JSON for a given language via fetch, with fallback to English
 * @param {string} lang
 * @returns {Promise<object>} translations map
 */
export async function loadTranslations(lang) {
  const primary = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
  try {
    const res = await fetch(`/data/lang/${primary}.json`);
    if (!res.ok) throw new Error(`Failed to fetch /data/lang/${primary}.json`);
    const json = await res.json();
    return json.translations || {};
  } catch (e) {
    console.warn(`Missing translation for ${primary}, falling back to English`, e);
    if (primary !== 'en') {
      try {
        const res = await fetch('/data/lang/en.json');
        if (!res.ok) throw new Error('Failed to fetch /data/lang/en.json');
        const json = await res.json();
        return json.translations || {};
      } catch (err) {
        console.error('Error loading English translations', err);
      }
    }
    return {};
  }
}

/**
 * Apply translations to the page elements based on a mapping of selectors to translation keys
 * @param {Object<string, string>} mapping
 */
export async function applyTranslations(mapping) {
  const lang = getPreferredLanguage();
  const translations = await loadTranslations(lang);
  for (const [selector, keyOrFn] of Object.entries(mapping)) {
    document.querySelectorAll(selector).forEach(el => {
      const key = typeof keyOrFn === 'function' ? keyOrFn(el) : keyOrFn;
      const text = translations[key] || key;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
  }
}

/**
 * Initialize language switcher dropdown to persist and reload with chosen language
 * @param {string} selectId
 */
export function initLanguageSwitcher(selectId = 'lang-switch') {
  const switcher = document.getElementById(selectId);
  if (!switcher) return;
  const lang = getPreferredLanguage();
  switcher.value = lang;
  switcher.addEventListener('change', e => {
    const newLang = e.target.value;
    localStorage.setItem('preferredLang', newLang);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.location.href = url.toString();
  });
}
