// File: /api/admin/handlers/handleAdminWelcome.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async function handleAdminWelcome(req, res) {
  try {
    // Extract user ID from the request (assumes authentication middleware has set req.user)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Fetch the admin's stated goals from the database
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

    // Generate personalized welcome content based on goals
    const welcomeContent = [];

    if (goals.includes('user_management')) {
      welcomeContent.push({
        title: 'Manage Users',
        description: 'View and manage all user accounts.',
        link: '/admin/users'
      });
    }

    if (goals.includes('notifications')) {
      welcomeContent.push({
        title: 'Network Notifications',
        description: 'Send and manage network-wide notifications.',
        link: '/admin/notifications'
      });
    }

    if (goals.includes('event_confirmations')) {
      welcomeContent.push({
        title: 'Event Confirmations',
        description: 'Review and confirm upcoming event dates.',
        link: '/admin/events'
      });
    }

    if (goals.includes('role_specification')) {
      welcomeContent.push({
        title: 'User Roles',
        description: 'Assign and manage user roles.',
        link: '/admin/roles'
      });
    }

    if (goals.includes('clinic_proposals')) {
      welcomeContent.push({
        title: 'Clinic Proposals',
        description: 'Review and approve clinic proposals.',
        link: '/admin/clinics'
      });
    }

    if (goals.includes('expert_onboarding')) {
      welcomeContent.push({
        title: 'Expert Onboarding',
        description: 'Manage onboarding process for new experts.',
        link: '/admin/onboarding'
      });
    }

    return res.status(200).json({ success: true, welcomeContent });
  } catch (err) {
    console.error('Unexpected error in handleAdminWelcome:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
