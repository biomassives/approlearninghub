// lib/adminHandlers.js

// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

// lib/adminHandlers.js
// ApproVideo Admin API Handlers
// Supports personalized admin panel logic, user role tools, event scheduling, Notion mapping,
// and pre-meeting coordination for module formation.

const supabase = require('./supabaseClient');

/** GET /api/admin/welcome */
async function handleAdminWelcome(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('admin_goals')
      .eq('id', userId)
      .single();

    if (error) throw error;
    const goals = profile?.admin_goals || [];
    const sections = {
      user_management:    { title: 'Manage Users', link: '/admin/users' },
      notifications:      { title: 'Network Notifications', link: '/admin/notifications' },
      event_confirmations:{ title: 'Event Confirmations', link: '/admin/events' },
      role_specification: { title: 'User Roles', link: '/admin/roles' },
      clinic_proposals:   { title: 'Clinic Proposals', link: '/admin/clinics' },
      expert_onboarding:  { title: 'Expert Onboarding', link: '/admin/onboarding' }
    };
    const welcomeContent = goals
      .filter(goal => sections[goal])
      .map(goal => sections[goal]);

    res.json({ success: true, welcomeContent });
  } catch (err) {
    console.error('handleAdminWelcome error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/users */
async function handleAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at');
    if (error) throw error;
    res.json({ success: true, users: data });
  } catch (err) {
    console.error('handleAllUsers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/admin/user-role */
async function handleUpdateUserRole(req, res) {
  try {
    const { userId, newRole } = req.body;
    if (!userId || !newRole) return res.status(400).json({ success: false, error: 'Missing userId or newRole' });
  
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    console.error('handleUpdateUserRole error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/pending-items */
async function handlePendingItems(req, res) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    res.json({ success: true, pending: data });
  } catch (err) {
    console.error('handlePendingItems error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/notifications */
const handleNotifications = async (req, res) =>
  res.json({ success: true, message: 'Notifications placeholder' });

/** POST /api/admin/approve-item */
const handleApproveItem = async (req, res) =>
  res.json({ success: true, message: 'Approve item placeholder' });

/** POST /api/admin/zoom/schedule */
async function handleZoomSchedule(req, res) {
  try {
    const { title, expertId, startTime, duration, attendees } = req.body;
    if (!title || !expertId || !startTime || !duration || !Array.isArray(attendees)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid Zoom event fields' });
    }
    const { data, error } = await supabase
      .from('zoom_events')
      .insert([{ title, expert_id: expertId, start_time: startTime, duration, attendees }]);
    if (error) throw error;
    res.json({ success: true, message: 'Zoom event scheduled', eventId: data[0].id });
  } catch (err) {
    console.error('handleZoomSchedule error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/integrations */
async function handleGetIntegrationSettings(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, settings: data || {} });
  } catch (err) {
    console.error('handleGetIntegrationSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/admin/integrations */
async function handleSaveIntegrationSettings(req, res) {
  try {
    const userId = req.user.id;
    const payload = { user_id: userId, ...req.body };
    const { data, error } = await supabase
      .from('integration_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .single();
    if (error) throw error;
    res.json({ success: true, settings: data });
  } catch (err) {
    console.error('handleSaveIntegrationSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/zoom/host-link */
async function handleGetZoomHostLink(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('integration_settings')
      .select('zoom_host_link')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json({ success: true, zoomHostLink: data.zoom_host_link });
  } catch (err) {
    console.error('handleGetZoomHostLink error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/zoom/connect-url */
function handleZoomConnectUrl(req, res) {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).json({ success: false, error: 'Zoom OAuth misconfigured' });
  }
  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  res.json({ success: true, url: url.toString() });
}

/** GET /api/admin/notion/connect-url */
function handleNotionConnectUrl(req, res) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).json({ success: false, error: 'Notion OAuth misconfigured' });
  }
  const url = new URL('https://api.notion.com/v1/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('owner', 'user');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  res.json({ success: true, url: url.toString() });
}




/** POST /api/admin/notion/sync */
async function handleNotionSync(req, res) {
  try {
    const { notionPageId, moduleId } = req.body;
    if (!notionPageId || !moduleId) {
      return res.status(400).json({ success: false, error: 'Missing Notion page or module ID' });
    }
    const { error } = await supabase
      .from('module_notion_links')
      .insert([{ module_id: moduleId, notion_page_id: notionPageId }]);
    if (error) throw error;
    res.json({ success: true, message: 'Notion content mapped successfully' });
  } catch (err) {
    console.error('handleNotionSync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/admin/module-prep */
async function handleModulePrep(req, res) {
  try {
    const { moduleId, task, contributorId } = req.body;
    if (!moduleId || !task || !contributorId) {
      return res.status(400).json({ success: false, error: 'Missing prep task or contributor info' });
    }
    const { error } = await supabase
      .from('module_prep_tasks')
      .insert([{ module_id: moduleId, task, contributor_id: contributorId }]);
    if (error) throw error;
    res.json({ success: true, message: 'Prep task assigned successfully' });
  } catch (err) {
    console.error('handleModulePrep error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/integrations */
async function handleGetIntegrationSettings(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, settings: data || {} });
  } catch (err) {
    console.error('handleGetIntegrationSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** PUT /api/admin/integrations */
async function handleSaveIntegrationSettings(req, res) {
  try {
    const userId = req.user.id;
    const payload = { user_id: userId, ...req.body };
    const { data, error } = await supabase
      .from('integration_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .single();
    if (error) throw error;
    res.json({ success: true, settings: data });
  } catch (err) {
    console.error('handleSaveIntegrationSettings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/zoom/host-link */
async function handleGetZoomHostLink(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('integration_settings')
      .select('zoom_host_link')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json({ success: true, zoomHostLink: data.zoom_host_link });
  } catch (err) {
    console.error('handleGetZoomHostLink error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /api/admin/zoom/connect-url */
function handleZoomConnectUrl(req, res) {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).json({ success: false, error: 'Zoom OAuth misconfigured' });
  }
  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  res.json({ success: true, url: url.toString() });
}

/** GET /api/admin/notion/connect-url */
function handleNotionConnectUrl(req, res) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).json({ success: false, error: 'Notion OAuth misconfigured' });
  }
  const url = new URL('https://api.notion.com/v1/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('owner', 'user');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  res.json({ success: true, url: url.toString() });
}



module.exports = {
  handleAdminWelcome,
  handleAllUsers,
  handleUpdateUserRole,
  handlePendingItems,
  handleNotifications,
  handleApproveItem,
  handleZoomSchedule,
  handleNotionSync,
  handleModulePrep,
  handleGetIntegrationSettings,
  handleSaveIntegrationSettings,
  handleGetZoomHostLink,
  handleZoomConnectUrl,
  handleNotionConnectUrl
}; 