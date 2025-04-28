// --- 3rd-party imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs';
import * as dexieEncrypted from 'https://esm.run/dexie-encrypted';

// --- I18n setup ---
let translations = {}, currentLanguage = 'en';

async function loadTranslations() {
  try {
    const res = await fetch('/locales/taxonomy-33.json');
    if (!res.ok) throw new Error(res.statusText);
    translations = await res.json();
  } catch (err) {
    console.error('i18n load failed:', err);
  }
}

function getText(key, params = {}) {
  const dict = translations[currentLanguage] || translations.en || {};
  let txt = dict[key] || translations.en[key] || key;
  Object.entries(params).forEach(([k,v]) => {
    txt = txt.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return txt;
}

function translatePage() {
  document.querySelectorAll('[data-translate-key]').forEach(el => {
    el.textContent = getText(el.dataset.translateKey);
  });
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    el.placeholder = getText(el.dataset.translatePlaceholder);
  });
  document.querySelectorAll('[data-translate-title]').forEach(el => {
    el.title = getText(el.dataset.translateTitle);
  });
  const titleKey = document.documentElement.dataset.translateTitleKey;
  if (titleKey) document.title = getText(titleKey);
}

// --- Supabase client ---
const supabaseUrl = 'https://vlvbodwrtblttvwnxkjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdmJvZHdydGJsdHR2d254a2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODY3NDk2NzIsImV4cCI6MjAwMjMyNTY3Mn0.TRT1HeX85vP1zDxnU7qBz5GqNPgYZUj-BOdek4qmtEg';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Derive a AES-GCM encryption key from a passphrase using PBKDF2.
 *
 * @param {string} passphrase
 * @param {Uint8Array} [salt]            — 16-byte salt; if omitted, a random one is generated
 * @param {number}      [iterations=100000] — PBKDF2 iteration count (↑ for extra security)
 * @returns {Promise<{ key: Uint8Array, salt: Uint8Array }>}
 */
async function deriveKey(passphrase, salt = null, iterations = 100000) {
    // 1) Generate a secure random salt if none provided
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    }
  
    // 2) Import passphrase as "raw" key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      { name: "PBKDF2" },
      false,               // not extractable
      ["deriveKey"]
    );
  
    // 3) Derive an AES-GCM key from the material
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },  // 256-bit key
      true,                              // extractable, so we can export raw bits
      ["encrypt", "decrypt"]
    );
  
    // 4) Export the raw key bytes
    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  
    return { key: rawKey, salt };
  }
  
  /*
    ── Security Recommendations ──────────────────────────────────────────────────
  
    1) Use a unique, cryptographically-random salt *per user/device* and store it
       (e.g. in IndexedDB alongside the encrypted data). Salt need not be secret.
  
    2) Increase PBKDF2 iterations to 200k+ or even 500k depending on your threat model
       and target devices, to slow brute-force attacks.
  
    3) When encrypting with AES-GCM, always use a fresh random IV (12-byte) per message
       and store it with the ciphertext. Never reuse IV+key pairs.
  
    4) Consider using WebCrypto’s HKDF or Argon2 (via wasm) for even stronger key-derivation
       if you anticipate high-value data or powerful adversaries.
  
    5) Mark your CryptoKey non-extractable (`extractable: false`) in production if you
       never need the raw bytes—this prevents accidental leakage of key material.
  */

// --- store / managers definitions (EventEmitter, BlueprintStore, CategoryManager, TagManager) ---
// Move all of your class definitions here, *once*.

// --- app init ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  translatePage();
  
  // Initialize dark mode toggle, profile dropdown, language switcher…
  // (all your tiny UI bits)

  // Initialize Dexie + store
  const key   = await deriveKey('your-demo-pass');
  const db    = new Dexie('…');
  dexieEncrypted.applyEncryptionMiddleware(db, key, { categories: dexieEncrypted.NON_INDEXED_FIELDS, subcategories: dexieEncrypted.NON_INDEXED_FIELDS }, false);
  db.version(1).stores({ categories: 'id, name', subcategories: 'id, category_id' });
  await db.open();
  
  const store = new BlueprintStore({ db, supabase });
  await store.initialize();
  
  window.categoryManager = new CategoryManager(store, getText);
  window.tagManager      = new TagManager(store, getText);
  
  // Kick off data load
  await store.loadInitialData();
});
