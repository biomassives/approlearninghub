// api/translations.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// --- Supabase Client Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Translation Cache Management ---
const translationCache = new Map();
const CACHE_TTL = 3600000; // Cache for 1 hour (in milliseconds)
const cacheTimestamps = new Map();

// --- Load Local Fallback Translations ---
async function getLocalTranslations(langCode) {
  try {
    // Construct path relative to the api directory
    const filePath = path.resolve(__dirname, '..', 'data', 'translations', `${langCode}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn(`No local translation file found for ${langCode}, using fallback`);
    
    // If requested language isn't available, try to fall back to English
    if (langCode !== 'en') {
      try {
        const fallbackPath = path.resolve(__dirname, '..', 'data', 'translations', 'en.json');
        const fallbackContent = await fs.readFile(fallbackPath, 'utf-8');
        return JSON.parse(fallbackContent);
      } catch (fallbackError) {
        console.error('Failed to load fallback English translations:', fallbackError);
      }
    }
    
    // If all else fails, return an empty object
    return {};
  }
}

// --- Fetch Translations from Supabase ---
async function getTranslationsFromDB(langCode) {
  // Check cache first
  if (translationCache.has(langCode)) {
    const timestamp = cacheTimestamps.get(langCode);
    if (timestamp && Date.now() - timestamp < CACHE_TTL) {
      return translationCache.get(langCode);
    }
  }

  try {
    // Option 1: Use the get_translations function if it exists
    try {
      const { data: functionData, error: functionError } = await supabase.rpc(
        'get_translations',
        { p_language: langCode }
      );
      
      if (!functionError && functionData) {
        // Cache the result
        translationCache.set(langCode, functionData);
        cacheTimestamps.set(langCode, Date.now());
        return functionData;
      }
    } catch (functionCallError) {
      console.warn('get_translations function not available, using direct query:', functionCallError);
    }
    
    // Option 2: Fall back to direct query if the function doesn't exist
    const { data, error } = await supabase
      .from('translations')
      .select('key, translation')
      .eq('language', langCode);

    if (error) {
      console.error(`Error fetching translations for ${langCode}:`, error);
      throw error;
    }

    // Convert flat key-value array to nested object structure
    const translationObj = {};
    for (const item of data) {
      if (!item.key || typeof item.translation !== 'string') continue;
      
      // Split key by dots to create nested structure
      const keyParts = item.key.split('.');
      let current = translationObj;
      
      // Build nested structure
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        current[part] = current[part] || {};
        current = current[part];
      }
      
      // Set the value at the final level
      const lastKey = keyParts[keyParts.length - 1];
      current[lastKey] = item.translation;
    }

    // Cache the result
    translationCache.set(langCode, translationObj);
    cacheTimestamps.set(langCode, Date.now());
    
    return translationObj;
  } catch (dbError) {
    console.error(`Failed to fetch translations from database for ${langCode}:`, dbError);
    throw dbError;
  }
}

// --- Merge Database and Local Translations ---
function mergeTranslations(dbTranslations, localTranslations) {
  // Deep merge function
  function deepMerge(target, source) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          // If property is an object, recurse
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          // Otherwise just assign the value
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  // Start with local translations as base
  return deepMerge({...localTranslations}, dbTranslations);
}

// --- Get Supported Languages ---
async function getSupportedLanguages() {
  try {
    // Get languages from database
    const { data: dbLanguages, error } = await supabase
      .from('translations')
      .select('language')
      .distinct();
    
    if (error) throw error;
    
    // Map to array of language codes
    const languages = dbLanguages.map(item => item.language);
    
    return languages;
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    
    // Fallback to hardcoded supported languages if needed
    return [
      'am', 'ar', 'bn', 'de', 'en', 'es', 'fa', 'fr', 'ha', 'hi', 
      'id', 'it', 'jp', 'km', 'ko', 'ku', 'ms', 'my', 'ne', 'ps',
      'pt', 'ru', 'so', 'sw', 'ta', 'th', 'tl', 'tr', 'uk', 'ur',
      'vi', 'yo', 'zh'
    ];
  }
}

// --- Request Handler ---
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get langCode from path parameter or query parameter
    const langCodeParam = req.query.langCode || req.query.lang || 'en';
    const langCode = langCodeParam.toLowerCase();
    
    // Special case to list all supported languages
    if (langCode === 'list') {
      const languages = await getSupportedLanguages();
      return res.status(200).json({ languages });
    }
    
    // Get translations from database
    let dbTranslations = {};
    try {
      dbTranslations = await getTranslationsFromDB(langCode);
    } catch (dbError) {
      console.warn(`Using only local translations for ${langCode} due to DB error:`, dbError);
    }
    
    // Get local translations
    const localTranslations = await getLocalTranslations(langCode);
    
    // Merge translations (DB overrides local)
    const mergedTranslations = mergeTranslations(dbTranslations, localTranslations);
    
    // Return merged translations
    res.status(200).json(mergedTranslations);
  } catch (error) {
    console.error('API Function Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch translation data.' });
  }
};
