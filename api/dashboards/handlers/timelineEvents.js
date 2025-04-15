// api/dashboards/timeline-events.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async (req, res) => {
  // Check for proper request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { event, userId, token } = req.body;

    if (!event || !userId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the JWT token
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);

    if (tokenError || !tokenData.user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Verify that the token belongs to the user
    if (tokenData.user.id !== userId) {
      return res.status(403).json({ error: 'Token user ID mismatch' });
    }

    // Verify the event object has all required fields
    if (!event.name || !event.type || !event.startDate || !event.group) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    // Get the user's role to check permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Error fetching user role:', roleError);
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }

    const userRole = roleData?.role || 'user';

    // Only editors and admins can create events
    if (userRole !== 'admin' && userRole !== 'editor') {
      return res.status(403).json({ error: 'You do not have permission to create events' });
    }

    // Format the event data for database insertion
    const eventData = {
      name: event.name,
      type: event.type,
      start_date: new Date(event.startDate).toISOString(),
      end_date: new Date(event.endDate || event.startDate).toISOString(),
      group_category: event.group,
      description: event.description || '',
      priority: event.priority || 'medium',
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    // Insert the event into the database
    // Note: In a real implementation, you would have a timeline_events table
    // For this example, we'll just simulate successful insertion
    
    /*
    const { data, error } = await supabase
      .from('timeline_events')
      .insert(eventData)
      .select();

    if (error) {
      console.error('Error saving event:', error);
      return res.status(500).json({ error: 'Failed to save event to database' });
    }
    */

    // Simulate successful insertion with a mock ID
    const mockInsertedEvent = {
      ...eventData,
      id: Math.floor(Math.random() * 10000) + 100, // Random ID for demo purposes
    };

    // Log the event creation
    await supabase
      .from('auth_activity_log')
      .insert({
        user_id: userId,
        action: 'create_timeline_event',
        details: `Created ${event.type}: ${event.name}`,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      })
      .catch(error => {
        console.error('Failed to log event creation:', error);
      });

    return res.status(200).json({
      success: true,
      message: 'Event created successfully',
      event: mockInsertedEvent
    });

  } catch (error) {
    console.error('Error creating timeline event:', error);
    return res.status(500).json({ error: 'Server error processing event creation' });
  }
};
