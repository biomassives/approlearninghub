// File: lib/authHandlers.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function handleSignup(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const { data: user, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } }
  });

  if (signUpError) return res.status(500).json({ success: false, error: signUpError.message });

  return res.status(200).json({
    success: true,
    user: { email: user.user?.email || email, role, id: user.user?.id || null }
  });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  return res.status(200).json({ success: true, session: data.session, user: data.user });
}

async function handleLogout(req, res) {
  const { error } = await supabase.auth.signOut();
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}

async function handleAccessCheck(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: 'Invalid token' });

  return res.status(200).json({ success: true, user: data.user });
}

async function handleUpdateLattice(req, res) {
  const { userId, lattice } = req.body;
  if (!userId || !lattice) return res.status(400).json({ error: 'Missing userId or lattice data' });

  const { error } = await supabase.from('users').update({ lattice }).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}

async function handleUserData(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true, user: data });
}

async function handleUserRole(req, res) {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });

  const { error } = await supabase.from('users').update({ role }).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}

async function handleVerify(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
  if (error) return res.status(401).json({ error: error.message });

  return res.status(200).json({ success: true, data });
}

module.exports = {
  handleSignup,
  handleLogin,
  handleLogout,
  handleAccessCheck,
  handleUpdateLattice,
  handleUserData,
  handleUserRole,
  handleVerify
};
