// session-crypto.js

const STORAGE_KEY = 'secure_session';
const ENCRYPTION_KEY_NAME = 'session_encryption_key';

function strToBuf(str) {
  return new TextEncoder().encode(str);
}

function bufToStr(buf) {
  return new TextDecoder().decode(buf);
}

function bufToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuf(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function getOrCreateKey() {
  const existing = localStorage.getItem(ENCRYPTION_KEY_NAME);
  if (existing) {
    const raw = base64ToBuf(existing);
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, bufToBase64(exported));
  return key;
}

export function generateNormalizedQuaternion() {
  const raw = crypto.getRandomValues(new Float32Array(4));
  let [x, y, z, w] = raw;
  const mag = Math.sqrt(x * x + y * y + z * z + w * w);
  return { x: x / mag, y: y / mag, z: z / mag, w: w / mag };
}

export function generateQuaternionIV(quat) {
  const buffer = new ArrayBuffer(12);
  const view = new DataView(buffer);
  view.setFloat32(0, quat.x);
  view.setFloat32(4, quat.y);
  view.setFloat32(8, quat.z);
  return new Uint8Array(buffer);
}

export async function hashMetaLattice(quat) {
  const str = `${quat.x.toFixed(6)}:${quat.y.toFixed(6)}:${quat.z.toFixed(6)}:${quat.w.toFixed(6)}`;
  const buffer = strToBuf(str);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveSecureSession(data) {
  const key = await getOrCreateKey();
  const quaternion = generateNormalizedQuaternion();
  const iv = generateQuaternionIV(quaternion);
  const latticeHash = await hashMetaLattice(quaternion);

  const sessionWithLattice = {
    ...data,
    metaLattice: quaternion,
    latticeHash,
    timestamp: Date.now()
  };

  const encoded = strToBuf(JSON.stringify(sessionWithLattice));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const payload = {
    iv: bufToBase64(iv),
    data: bufToBase64(ciphertext)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadSecureSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const payload = JSON.parse(raw);
  const { iv, data } = payload;
  if (!iv || !data) return null;

  try {
    const key = await getOrCreateKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuf(iv) },
      key,
      base64ToBuf(data)
    );
    return JSON.parse(bufToStr(decrypted));
  } catch (err) {
    console.warn('Failed to decrypt session:', err);
    return null;
  }
}

export function clearSecureSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENCRYPTION_KEY_NAME);
}

export async function verifyLatticeMatch(expectedHash) {
  const session = await loadSecureSession();
  if (!session?.metaLattice) return false;

  const currentHash = await hashMetaLattice(session.metaLattice);
  return currentHash === expectedHash;
}

// Example Supabase update (should be in a separate API file or called from signup/login)
// await supabase.from('profiles').update({ lattice_hash: latticeHash }).eq('id', user.id);
