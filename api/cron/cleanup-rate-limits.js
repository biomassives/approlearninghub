// api/cron/cleanup-rate-limits.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Verify this is a scheduled invocation
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const limiter = new SupabaseRateLimiter(supabase);
  await limiter.cleanup();
  
  return res.status(200).json({ success: true });
};
