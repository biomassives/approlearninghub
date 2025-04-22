// api/cron/cleanup-rate-limits.js


const supabase = require('../lib/supabaseClient');

const createClient =  supabase(); 

module.exports = async (req, res) => {
  console.log("Rate limits cleanup cron job started");
  
  try {
    // Verify this is a scheduled invocation
    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("Unauthorized cron request");
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Perform cleanup directly without using the class
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_time', now);
    
    if (error) {
      console.error("Database error during cleanup:", error);
      return res.status(500).json({ error: 'Database operation failed', details: error.message });
    }
    
    console.log("Rate limits cleanup completed successfully");
    return res.status(200).json({ 
      success: true,
      message: 'Rate limit records cleaned up successfully',
      count: data?.length || 0,
      timestamp: now
    });
  } catch (error) {
    console.error("Unexpected error during rate limit cleanup:", error);
    return res.status(500).json({ 
      error: 'Cleanup failed',
      message: error.message
    });
  }
};
