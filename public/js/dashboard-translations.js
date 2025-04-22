// dashboard-translations.js

const queryLang = new URLSearchParams(window.location.search).get('lang');
const browserLang = navigator.language.slice(0, 2);
const savedLang = localStorage.getItem('preferredLang');
const lang = queryLang || savedLang || browserLang || 'en';

async function loadTranslations(langCode) {
  try {
    const response = await fetch(`/lang/${langCode}.json`);
    if (!response.ok) throw new Error(`Failed to load translation for ${langCode}`);
    return await response.json();
  } catch (err) {
    console.warn(`[Translation] Falling back to en.json due to: ${err.message}`);
    const fallback = await fetch('/lang/en.json');
    return await fallback.json();
  }
}

function applyTranslations(translations) {
  Object.entries(translations).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (element) {
      element.textContent = value;
    }
  });
}

(async () => {
  const translations = await loadTranslations(lang);
  applyTranslations(translations);
  localStorage.setItem('preferredLang', lang);
})();
