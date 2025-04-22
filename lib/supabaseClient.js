// /api/lib/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('🚨 Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SERVICE_ROLE_KEY) {
  console.error('🚨 Missing SUPABASE_SERVICE_KEY or SERVICE_ROLE_KEY environment variable');
}

// Determine which key to use
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

// Create and export Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Log that the client was initialized
console.log('📡 Supabase client initialized with URL:', process.env.SUPABASE_URL);

// Test connection function
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('🚨 Supabase connection test failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (err) {
    console.error('🚨 Supabase connection test error:', err.message);
    return false;
  }
}

module.exports = supabase;
module.exports.testConnection = testConnection;
