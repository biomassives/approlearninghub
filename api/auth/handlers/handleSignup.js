// File: /api/auth/handlers/handleSignup.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });

    if (signUpError) {
      console.error('❌ Signup error:', signUpError);
      return res.status(500).json({ success: false, error: signUpError.message });
    }

    // Optional: Save role info to a 'users' table or log user for tracking
    console.log(`[Signup] ✅ New user created: ${email} with role: ${role}`);

    return res.status(200).json({
      success: true,
      user: {
        email: user.user?.email || email,
        role: role,
        id: user.user?.id || null
      }
    });
  } catch (err) {
    console.error('🔥 Unexpected error in handleSignup:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
