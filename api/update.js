//  session-crypto.js  with metalattice


export async function hashMetaLattice(quat) {
  const str = `${quat.x.toFixed(6)}:${quat.y.toFixed(6)}:${quat.z.toFixed(6)}:${quat.w.toFixed(6)}`;
  const buffer = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', buffer);

  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
import {
  generateNormalizedQuaternion,
  generateQuaternionIV,
  hashMetaLattice
} from './session-crypto.js';

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
import { loadSecureSession, hashMetaLattice } from './session-crypto.js';

export async function verifyLatticeMatch(expectedHash) {
  const session = await loadSecureSession();
  if (!session?.metaLattice) return false;

  const currentHash = await hashMetaLattice(session.metaLattice);
  return currentHash === expectedHash;
}
await supabase
  .from('profiles')
  .update({ lattice_hash: latticeHash })
  .eq('id', user.id);
