// expert-dashboard.js
import { loadSecureSession, hashMetaLattice, clearSecureSession } from './session-crypto.js';

const latticeInfo = document.getElementById('lattice-info');
const logoutBtn = document.getElementById('logout-btn');

async function init() {
  const session = await loadSecureSession();
  if (!session || session.role !== 'expert') {
    window.location.href = '/login.html';
    return;
  }

  const { metaLattice, latticeHash, email } = session;
  const recomputedHash = await hashMetaLattice(metaLattice);

  latticeInfo.textContent = `Email: ${email}\n\nMetaLattice:\n  x: ${metaLattice.x.toFixed(6)}\n  y: ${metaLattice.y.toFixed(6)}\n  z: ${metaLattice.z.toFixed(6)}\n  w: ${metaLattice.w.toFixed(6)}\n\nStored Hash:\n  ${latticeHash}\nRecomputed Hash:\n  ${recomputedHash}\n\nMatch: ${latticeHash === recomputedHash ? '✅ Verified' : '⚠️ Mismatch'}`;
}

logoutBtn.addEventListener('click', () => {
  clearSecureSession();
  window.location.href = '/login.html';
});

init();
