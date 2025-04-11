// Dexie Setup
const db = new Dexie("MyDatabase", {
    addons: [Dexie.addons.Encrypted]
  });
  
  db.version(1).stores({
    authTokens: "id, encryptedKey, token"
  });
  
  db.use({
    stack: "dbcore",
    create: (downlevelDatabase) => {
      return new Dexie.addons.Encrypted(downlevelDatabase, {
        key: null, // Key will be set dynamically
        algorithm: "aes-256-gcm",
        additionalProperties: ["token"]
      });
    }
  });
  
  // DOM Elements
  const authStatus = document.getElementById("authStatus");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const profileLink = document.getElementById("profileLink");
  const loginModal = document.getElementById("loginModal");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const submitLoginButton = document.getElementById("submitLogin");
  
  let isLoggedIn = false;
  
  // Functions
  async function deriveKeyFromPassword(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("your_salt_value"), // Replace with a unique salt
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    return derivedKey;
  }
  
  async function encryptKey(key, derivedKey) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      derivedKey,
      await window.crypto.subtle.exportKey("raw", key)
    );
    const combined = new Uint8Array(iv.length + encryptedKeyBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedKeyBuffer), iv.length);
    return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function decryptKey(encryptedKeyHex, derivedKey) {
    const combined = new Uint8Array(encryptedKeyHex.match(/.{1,2}/g