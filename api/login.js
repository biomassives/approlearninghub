// /api/login.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // this one is safe to use for auth
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.session) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { session, user } = data;

    return res.status(200).json({
      success: true,
      token: session.access_token,
      refreshToken: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unexpected error during login' });
  }
}
