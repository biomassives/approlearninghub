// lib/adminHandlers.js
// ApproVideo Admin API Handlers
// Supports personalized admin panel logic, user role tools, event scheduling, Notion mapping,
// and pre-meeting coordination for module formation.
//
// Supported handlers:
//   - handleAdminWelcome
//   - handleAllUsers
//   - handleUpdateUserRole
//   - handlePendingItems
//   - handleNotifications
//   - handleApproveItem
//   - handleZoomSchedule
//   - handleNotionSync
//   - handleModulePrep
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function handleAdminWelcome(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('admin_goals')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching admin goals:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin goals' });
    }

    const goals = profile?.admin_goals || [];
    const sections = {
      user_management: { title: 'Manage Users', description: 'View and manage all user accounts.', link: '/admin/users' },
      notifications: { title: 'Network Notifications', description: 'Send and manage notifications.', link: '/admin/notifications' },
      event_confirmations: { title: 'Event Confirmations', description: 'Confirm event dates.', link: '/admin/events' },
      role_specification: { title: 'User Roles', description: 'Assign and manage roles.', link: '/admin/roles' },
      clinic_proposals: { title: 'Clinic Proposals', description: 'Review and approve clinics.', link: '/admin/clinics' },
      expert_onboarding: { title: 'Expert Onboarding', description: 'Onboard new experts.', link: '/admin/onboarding' }
    };

    const welcomeContent = goals
      .filter(goal => sections[goal])
      .map(goal => sections[goal]);

    return res.status(200).json({ success: true, welcomeContent });
  } catch (err) {
    console.error('Unexpected error in handleAdminWelcome:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ⬇️ Existing handlers you already had
const handleAllUsers = async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.status(200).json({ success: true, users: data });
};

const handleUpdateUserRole = async (req, res) => {
  const { userId, newRole } = req.body;
  if (!userId || !newRole) return res.status(400).json({ error: 'Missing userId or newRole' });

  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) return res.status(500).json({ success: false, error: error.message });

  return res.status(200).json({ success: true, message: 'User role updated' });
};

const handlePendingItems = async (req, res) => {
  const { data, error } = await supabase.from('submissions').select('*').eq('status', 'pending');
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.status(200).json({ success: true, pending: data });
};

// ⬇️ Optional: placeholders for existing or upcoming admin tools
const handleNotifications = async (req, res) =>
  res.status(200).json({ success: true, message: 'Notifications placeholder' });

const handleApproveItem = async (req, res) =>
  res.status(200).json({ success: true, message: 'Approve item placeholder' });

// 🧠 New functionality
async function handleZoomSchedule(req, res) {
  const { title, expertId, startTime, duration, attendees } = req.body;
  if (!title || !expertId || !startTime || !duration || !Array.isArray(attendees)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid Zoom event fields' });
  }

  const { data, error } = await supabase
    .from('zoom_events')
    .insert([{ title, expert_id: expertId, start_time: startTime, duration, attendees }]);

  if (error) return res.status(500).json({ success: false, error: error.message });

  return res.status(200).json({ success: true, message: 'Zoom event scheduled', eventId: data[0].id });
}

async function handleNotionSync(req, res) {
  const { notionPageId, moduleId } = req.body;
  if (!notionPageId || !moduleId) {
    return res.status(400).json({ success: false, error: 'Missing Notion page or module ID' });
  }

  const { error } = await supabase
    .from('module_notion_links')
    .insert([{ module_id: moduleId, notion_page_id: notionPageId }]);

  if (error) return res.status(500).json({ success: false, error: error.message });

  return res.status(200).json({ success: true, message: 'Notion content mapped successfully' });
}

async function handleModulePrep(req, res) {
  const { moduleId, task, contributorId } = req.body;
  if (!moduleId || !task || !contributorId) {
    return res.status(400).json({ success: false, error: 'Missing prep task or contributor info' });
  }

  const { error } = await supabase
    .from('module_prep_tasks')
    .insert([{ module_id: moduleId, task, contributor_id: contributorId }]);

  if (error) return res.status(500).json({ success: false, error: error.message });

  return res.status(200).json({ success: true, message: 'Prep task assigned successfully' });
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
  handleModulePrep
};

