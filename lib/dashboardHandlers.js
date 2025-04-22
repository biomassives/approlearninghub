// lib/dashboardHandlers.js
// ApproVideo Dashboard API Handlers
// Handles Gantt data and timeline events display and updates.
//
// Supported handlers:
//   - handleGanttData
//   - handleTimelineEvents
//
// (c) 2025 Sustainable Community Development Hub
// Licensed under GNU GPL v3
// lib/dashboardHandlers.js

require('dotenv').config();
const supabase = require('./supabaseClient');

/**
 * GET /api/dashboards/overview
 * Returns a summary of key metrics for the user's dashboard
 */
async function handleDashboardOverview(req, res) {
  try {
    const userId = req.user.id;
    // Example: fetch total projects, tasks, and upcoming events
    const [{ count: projectCount }, { count: taskCount }] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact' }).eq('owner_id', userId),
      supabase.from('tasks').select('*', { count: 'exact' }).eq('assignee_id', userId)
    ]);

    // Fetch next 5 timeline events
    const { data: events, error: eventsError } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
      .limit(5);
    if (eventsError) throw eventsError;

    res.json({
      success: true,
      overview: { projectCount, taskCount, upcomingEvents: events }
    });
  } catch (err) {
    console.error('handleDashboardOverview error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/dashboards/gantt
 * Returns data formatted for a Gantt chart, optionally filtered by project and date range
 */
async function handleGanttData(req, res) {
  try {
    const { projectId, from, to } = req.query;
    let query = supabase.from('gantt_tasks').select('*');
    if (projectId) query = query.eq('project_id', projectId);
    if (from) query = query.gte('start_time', from);
    if (to) query = query.lte('end_time', to);

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;

    res.json({ success: true, gantt: data });
  } catch (err) {
    console.error('handleGanttData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/dashboards/timeline
 * Returns chronological events for the timeline view, optionally filtered
 */
async function handleTimelineEvents(req, res) {
  try {
    const { projectId, from, to } = req.query;
    let query = supabase.from('timeline_events').select('*');
    if (projectId) query = query.eq('project_id', projectId);
    if (from) query = query.gte('event_time', from);
    if (to) query = query.lte('event_time', to);

    const { data, error } = await query.order('event_time', { ascending: true });
    if (error) throw error;

    res.json({ success: true, timeline: data });
  } catch (err) {
    console.error('handleTimelineEvents error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}



module.exports = {
  handleDashboardOverview,
  handleGanttData,
  handleTimelineEvents
};

