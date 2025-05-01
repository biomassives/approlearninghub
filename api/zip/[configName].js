const JSZip = require('jszip');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Get config name from URL parameter
    const { configName } = req.query;
    console.log(`Processing ZIP request for: ${configName}`);
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch configuration from Supabase
    const { data, error } = await supabase
      .from('download_configurations')
      .select('*')
      .eq('name', configName)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).send('Failed to retrieve configuration');
    }
    
    if (!data) {
      return res.status(404).send('Failed to retrieve configuration');
    }

