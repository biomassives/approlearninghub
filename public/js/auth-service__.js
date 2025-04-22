// /js/auth-service.js
import { latticeEncrypt as _latticeEncrypt } from '/js/lattice-utils.js';

class AuthService {
  constructor() {
    this.apiBase = '/api/auth';
  }

// now this method will correctly call the imported helper
latticeEncrypt(data) {
    return _latticeEncrypt(data);
    }


  generateLatticeKey() {
    return Math.random().toString(36).slice(2);
  }

  getAuthHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  // send Supabase + an extra lattice “proof” for server to verify
  async signup(email, password, role) {
    const payload = {
      email,
      password,
      role,
      lattice: this.latticeEncrypt({ email, ts: Date.now() })
    };
    try {
      const res = await fetch(`${this.apiBase}/signup`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async login(email, password) {
    const payload = {
      email,
      password,
      lattice: this.latticeEncrypt({ email, ts: Date.now() })
    };
    try {
      const res = await fetch(`${this.apiBase}/login`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      // now perform a quick lattice‑only verify roundtrip
      const ok = await this.verifyLattice();
      if (!ok) throw new Error('Lattice verification failed');

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async getSession() {
    try {
      const res = await fetch(`${this.apiBase}/access-check`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      return { success: true, user: data.user };
    } catch {
      return { success: false };
    }
  }

  async logout() {
    await fetch(`${this.apiBase}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return { success: true };
  }

  /** 
   * Send a tiny “proof” that you hold the same latticeKey 
   * so server can decrypt & compare against its copy.
   */
  async verifyLattice() {
    const proof = this.latticeEncrypt({ proof: 'ping', ts: Date.now() });
    try {
      const res = await fetch(`${this.apiBase}/verify-lattice`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ proof })
      });
      const { success } = await res.json();
      return success;
    } catch {
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
