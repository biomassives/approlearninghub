// /api/lib/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Ensure env vars
const url = process.env.SUPABASE_URL;
if (!url) {
  console.error('🚨 Missing SUPABASE_URL');
  process.exit(1);
}
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;
if (!key) {
  console.error('🚨 Missing SUPABASE_SERVICE_KEY or SERVICE_ROLE_KEY');
  process.exit(1);
}

// Lazy singleton
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    console.log('📡 Supabase client initialized');
  }
  return _supabase;
}

// Smoke test
async function testConnection() {
  try {
    const { error } = await getSupabase().from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection test OK');
    return true;
  } catch (err) {
    console.error('🚨 Supabase connection test failed:', err.message);
    return false;
  }
}

// Dev‑only check
if (process.env.NODE_ENV === 'development') {
  testConnection().then(ok => {
    if (!ok) console.warn('⚠️ “users” table missing or unreachable');
  });
}

module.exports = { getSupabase, testConnection };
