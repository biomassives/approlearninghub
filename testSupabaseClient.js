// testSupabaseClient.js
require('dotenv').config();             // only if you’re using a .env file locally
const supabase = require('./lib/supabaseClient');

(async () => {
  try {
    // Try a simple query against a known table, e.g. profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase client test failed:', error);
      process.exit(1);
    }

    console.log('✅ Supabase client test succeeded, sample row:', data);
    process.exit(0);
  } catch (err) {
    console.error('🔥 Unexpected error testing Supabase client:', err);
    process.exit(1);
  }
})();
