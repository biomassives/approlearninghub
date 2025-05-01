// /public/js/serverless-enhanced-auth.js
// Enhanced authentication with the lattice security pattern for ApproVideo Hub

/**
 * Save a secure session with lattice protection
 * @param {Object} sessionData - Session data to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveSecureSession(sessionData) {
  try {
    if (!sessionData.token) {
      console.error('Cannot save session: Missing token');
      return false;
    }
    
    // Generate a new lattice ID
    const latticeId = generateSecureLatticeId();
    
    // Create a secure hash combining token and lattice ID
    const latticeHash = await createLatticeHash(`${sessionData.token.substring(0, 16)}:${latticeId}`);
    
    // Prepare session data
    const secureSessionData = {
      token: sessionData.token,
      refreshToken: sessionData.refreshToken,
      user: {
        email: sessionData.email,
        role: sessionData.role,
        id: sessionData.userId || null
      },
      latticeHash: latticeHash,
      latticeId: latticeId,
      created: new Date().toISOString()
    };
    
    // Save session data to secure storage
    localStorage.setItem('_secure_session', JSON.stringify(secureSessionData));
    
    // Update the lattice on the server
    await updateLatticeOnServer(latticeId, secureSessionData.user.id, sessionData.token);
    
    return true;
  } catch (error) {
    console.error('Error saving secure session:', error);
    return false;
  }
}

/**
 * Generate a secure random lattice ID
 * @returns {string} A cryptographically secure random string for lattice verification
 */
function generateSecureLatticeId() {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a secure hash of the lattice string
 * @param {string} latticeString - String to hash
 * @returns {Promise<string>} Hashed string
 */
async function createLatticeHash(latticeString) {
  // Use SubtleCrypto API if available
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(latticeString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback to simpler hash if SubtleCrypto fails
      console.warn('SubtleCrypto failed, using fallback hash');
      return fallbackHash(latticeString);
    }
  } else {
    // Fallback for browsers without SubtleCrypto
    return fallbackHash(latticeString);
  }
}

/**
 * Simple fallback hash function for browsers without SubtleCrypto
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
function fallbackHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Update lattice value on the server for verification
 * @param {string} latticeId - The lattice ID to store
 * @param {string} userId - User ID for the lattice update
 * @param {string} token - Authentication token
 * @returns {Promise<void>}
 */
async function updateLatticeOnServer(latticeId, userId, token) {
  try {
    const response = await fetch('/api/auth/update-lattice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        lattice: latticeId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update lattice on server');
    }
  } catch (error) {
    console.error('Error updating lattice:', error);
    throw error;
  }
}

/**
 * Get current session data
 * @returns {Object|null} Current session data or null if not available
 */
export function getSecureSession() {
  try {
    const sessionData = localStorage.getItem('_secure_session');
    if (!sessionData) return null;
    
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Verify the current session lattice matches server
 * @returns {Promise<boolean>} True if verification passed
 */
export async function verifySession() {
  try {
    const session = getSecureSession();
    if (!session || !session.latticeId || !session.token) {
      return false;
    }
    
    const response = await fetch(`/api/auth/verify?token=${session.latticeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Session verification error:', error);
    return false;
  }
}

/**
 * Clear the current session
 */
export function clearSession() {
  localStorage.removeItem('_secure_session');
}

/**
 * Check if user has a valid session
 * @returns {boolean} True if user is logged in
 */
export function isLoggedIn() {
  const session = getSecureSession();
  if (!session || !session.token) {
    return false;
  }
  
  // Check if session is expired (24 hour sessions)
  const createdTime = new Date(session.created).getTime();
  const currentTime = new Date().getTime();
  const sessionAge = currentTime - createdTime;
  const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  return sessionAge <= MAX_SESSION_AGE;
}

/**
 * Get the current user role
 * @returns {string|null} User role or null if not logged in
 */
export function getUserRole() {
  const session = getSecureSession();
  return session?.user?.role || null;
}

/**
 * Get a formatted session timestamp
 * @returns {string} Formatted time
 */
export function getSessionCreationTime() {
  const session = getSecureSession();
  if (!session || !session.created) return 'Unknown';
  
  const createdDate = new Date(session.created);
  return createdDate.toLocaleString();
}

/**
 * Get a preview of the lattice ID (for display purposes)
 * @returns {string} Truncated lattice ID
 */
export function getLatticePreview() {
  const session = getSecureSession();
  if (!session || !session.latticeId) return 'Not available';
  
  const id = session.latticeId;
  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
}