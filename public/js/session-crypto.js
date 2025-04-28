// js/session-crypto.js
/**
 * Secure Session Crypto Module
 * Handles the lattice-based encryption for secure sessions
 */

const SECURE_SESSION_KEY = 'approvideo_secure_session';

/**
 * Generate a secure hash for the meta lattice data
 * @param {object} metaLatticeData - The data to hash
 * @returns {string} - Hash string
 */
export function hashMetaLattice(metaLatticeData) {
  // In production, this would be a proper cryptographic hash
  // For now, we'll use a simple JSON.stringify + btoa encoding
  try {
    const jsonStr = JSON.stringify(metaLatticeData);
    const encodedStr = btoa(jsonStr);
    
    // Take first 32 chars as our "hash"
    return encodedStr.substring(0, 32);
  } catch (err) {
    console.error('Hash calculation error:', err);
    return '';
  }
}

/**
 * Load the secure session from storage
 * @returns {Promise<object|null>} The secure session object or null if invalid
 */
export async function loadSecureSession() {
  try {
    const storedSession = localStorage.getItem(SECURE_SESSION_KEY);
    if (!storedSession) {
      console.warn('No secure session found in storage');
      return null;
    }

    const session = JSON.parse(storedSession);
    
    // Check if session has expired
    if (session.expires && session.expires < Date.now()) {
      console.warn('Secure session has expired');
      await clearSecureSession();
      return null;
    }

    return session;
  } catch (err) {
    console.error('Error loading secure session:', err);
    return null;
  }
}

/**
 * Create a new secure session
 * @param {object} userData - User data to include in the session
 * @returns {Promise<object>} The created secure session
 */
export async function createSecureSession(userData) {
  try {
    // Create meta lattice data (simulated for now)
    const metaLatticeData = {
      userRef: userData.id,
      role: userData.role,
      permissions: ['read', 'write', 'review'],
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15)
    };

    // Create session object
    const session = {
      sessionId: generateSessionId(),
      metaLatticeData,
      hash: hashMetaLattice(metaLatticeData),
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      activityFeed: 'No recent activities' // Placeholder
    };

    // Store in localStorage
    localStorage.setItem(SECURE_SESSION_KEY, JSON.stringify(session));
    
    return session;
  } catch (err) {
    console.error('Error creating secure session:', err);
    throw err;
  }
}

/**
 * Clear the secure session from storage
 * @returns {Promise<void>}
 */
export async function clearSecureSession() {
  localStorage.removeItem(SECURE_SESSION_KEY);
}

/**
 * Generate a pseudo-random session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
