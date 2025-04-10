// api/dashboards/gantt-data.js
// Serverless function to retrieve data for Gantt chart visualizations

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify user authentication and permissions
async function verifyUserAccess(token, requiredRole = null) {
  try {
    // Verify the JWT token
    const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      throw new Error('Invalid authentication token');
    }
    
    // If a specific role is required, check for it
    if (requiredRole) {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', tokenData.user.id)
        .maybeSingle();
        
      if (roleError) throw roleError;
      
      const userRole = roleData?.role || 'user';
      
      // Simple role hierarchy checking
      const ROLE_HIERARCHY = {
        user: ['user'],
        editor: ['user', 'editor'],
        admin: ['user', 'editor', 'admin']
      };
      
      const allowedRoles = ROLE_HIERARCHY[userRole] || [];
      if (!allowedRoles.includes(requiredRole)) {
        throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
      }
    }
    
    return tokenData.user;
  } catch (error) {
    throw error;
  }
}

// Helper function to format date strings to ISO format or handle null
function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString();
}

export default async function handler(req, res) {
  // This endpoint only supports GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Extract auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify user is authenticated
    const user = await verifyUserAccess(token);
    
    // Extract query parameters
    const { 
      view = 'all', 
      userId,
      startDate,
      endDate,
      includeCompleted = 'true'
    } = req.query;
    
    // Format date filters if provided
    const formattedStartDate = startDate ? formatDate(startDate) : null;
    const formattedEndDate = endDate ? formatDate(endDate) : null;
    
    // If requesting data for a specific user other than self, verify permissions
    if (userId && userId !== user.id) {
      await verifyUserAccess(token, 'editor');
    }
    
    // Data structure to hold Gantt chart items
    const ganttData = {
      clinics: [],
      modules: [],
      library: []
    };
    
    // 1. Fetch Clinics data
    if (view === 'all' || view === 'clinics') {
      let clinicsQuery = supabase
        .from('clinics')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          status,
          clinic_participants(
            id,
            user_id,
            role,
            status
          )
        `);
      
      // Apply date filters if provided
      if (formattedStartDate) {
        clinicsQuery = clinicsQuery.gte('end_date', formattedStartDate);
      }
      if (formattedEndDate) {
        clinicsQuery = clinicsQuery.lte('start_date', formattedEndDate);
      }
      
      // Apply completion filter
      if (includeCompleted !== 'true') {
        const today = new Date().toISOString();
        clinicsQuery = clinicsQuery.gt('end_date', today);
      }
      
      const { data: clinicsData, error: clinicsError } = await clinicsQuery;
      
      if (clinicsError) throw clinicsError;
      
      // Filter and map clinics data for Gantt format
      ganttData.clinics = clinicsData.map(clinic => {
        // Check for user participation if userId is specified
        let userInvolvement = null;
        if (userId) {
          const participation = clinic.clinic_participants.find(
            p => p.user_id === userId
          );
          if (participation) {
            userInvolvement = {
              role: participation.role,
              status: participation.status
            };
          }
        }
        
        // Include the clinic in the result if:
        // - No specific userId is requested, OR
        // - userId is requested AND user is involved
        const shouldInclude = !userId || userInvolvement !== null;
        
        if (shouldInclude) {
          return {
            id: clinic.id,
            title: clinic.title,
            description: clinic.description,
            type: 'clinic',
            start: clinic.start_date,
            end: clinic.end_date,
            status: clinic.status,
            location: clinic.location,
            participants: clinic.clinic_participants.length,
            userInvolvement
          };
        }
        return null;
      }).filter(Boolean); // Remove null entries
    }
    
    // 2. Fetch Training Modules data
    if (view === 'all' || view === 'modules') {
      // Modules don't typically have start/end dates, so we'll use enrollments
      let modulesQuery;
      
      if (userId) {
        // If a userId is specified, get modules that user is enrolled in
        modulesQuery = supabase
          .from('module_enrollments')
          .select(`
            id,
            enrollment_date,
            completion_date,
            status,
            progress,
            training_modules(
              id,
              title,
              description,
              difficulty_level,
              points_reward,
              estimated_duration
            )
          `)
          .eq('user_id', userId);
          
        // Apply date filters if provided
        if (formattedStartDate) {
          modulesQuery = modulesQuery.gte('enrollment_date', formattedStartDate);
        }
        if (formattedEndDate) {
          modulesQuery = modulesQuery.lte('completion_date', formattedEndDate);
        }
        
        // Apply completion filter
        if (includeCompleted !== 'true') {
          modulesQuery = modulesQuery.neq('status', 'completed');
        }
        
        const { data: enrollmentData, error: enrollmentError } = await modulesQuery;
        
        if (enrollmentError) throw enrollmentError;
        
        // Map enrollments to Gantt format
        ganttData.modules = enrollmentData.map(enrollment => {
          const module = enrollment.training_modules;
          
          // Calculate end date (enrollment date + estimated duration)
          let endDate = enrollment.completion_date;
          if (!endDate && module.estimated_duration && enrollment.enrollment_date) {
            const startDate = new Date(enrollment.enrollment_date);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + parseInt(module.estimated_duration, 10));
            endDate = endDate.toISOString();
          }
          
          return {
            id: module.id,
            title: module.title,
            description: module.description,
            type: 'module',
            start: enrollment.enrollment_date,
            end: endDate,
            progress: enrollment.progress,
            status: enrollment.status,
            enrollmentId: enrollment.id,
            difficulty: module.difficulty_level,
            points: module.points_reward,
            userInvolvement: {
              status: enrollment.status,
              progress: enrollment.progress
            }
          };
        });
      } else {
        // If no userId specified, get all modules with their enrolled users
        modulesQuery = supabase
          .from('training_modules')
          .select(`
            id,
            title,
            description,
            difficulty_level,
            points_reward,
            estimated_duration,
            created_at,
            module_enrollments(
              id,
              user_id,
              enrollment_date,
              completion_date,
              status,
              progress
            )
          `);
          
        // Apply date filters if provided (on created_at)
        if (formattedStartDate) {
          modulesQuery = modulesQuery.gte('created_at', formattedStartDate);
        }
        
        const { data: modulesData, error: modulesError } = await modulesQuery;
        
        if (modulesError) throw modulesError;
        
        // Map modules to Gantt format
        ganttData.modules = modulesData.map(module => {
          // Get enrollment statistics
          const enrollments = module.module_enrollments || [];
          const activeEnrollments = enrollments.filter(e => e.status !== 'completed' && e.status !== 'dropped');
          const completedEnrollments = enrollments.filter(e => e.status === 'completed');
          
          // Skip this module if we're excluding completed and all enrollments are completed
          if (includeCompleted !== 'true' && activeEnrollments.length === 0 && completedEnrollments.length > 0) {
            return null;
          }
          
          return {
            id: module.id,
            title: module.title,
            description: module.description,
            type: 'module',
            start: module.created_at,
            end: null, // Modules don't have an end date in this context
            difficulty: module.difficulty_level,
            points: module.points_reward,
            totalEnrollments: enrollments.length,
            activeEnrollments: activeEnrollments.length,
            completedEnrollments: completedEnrollments.length
          };
        }).filter(Boolean); // Filter out null entries
      }
    }
    
    // 3. Fetch Library Entries data
    if (view === 'all' || view === 'library') {
      let libraryQuery;
      
      if (userId) {
        // If userId specified, get libraries where user is a contributor
        libraryQuery = supabase
          .from('library_contributions')
          .select(`
            id,
            contribution_type,
            contribution_date,
            library_entries(
              id,
              title,
              description,
              publication_date,
              status,
              type
            )
          `)
          .eq('contributor_id', userId);
          
        // Apply date filters if provided
        if (formattedStartDate) {
          libraryQuery = libraryQuery.gte('contribution_date', formattedStartDate);
        }
        if (formattedEndDate) {
          libraryQuery = libraryQuery.lte('contribution_date', formattedEndDate);
        }
        
        const { data: contributionsData, error: contributionsError } = await libraryQuery;
        
        if (contributionsError) throw contributionsError;
        
        // Map contributions to Gantt format
        ganttData.library = contributionsData.map(contribution => {
          const library = contribution.library_entries;
          
          return {
            id: library.id,
            title: library.title,
            description: library.description,
            type: 'library',
            subtype: library.type,
            start: contribution.contribution_date,
            end: library.publication_date,
            status: library.status,
            contributionType: contribution.contribution_type,
            userInvolvement: {
              role: contribution.contribution_type,
              date: contribution.contribution_date
            }
          };
        });
      } else {
        // If no userId, get all library entries
        libraryQuery = supabase
          .from('library_entries')
          .select(`
            id,
            title,
            description,
            created_at,
            publication_date,
            status,
            type,
            library_contributions(
              id,
              contributor_id,
              contribution_type,
              contribution_date
            )
          `);
          
        // Apply date filters if provided
        if (formattedStartDate) {
          libraryQuery = libraryQuery.gte('created_at', formattedStartDate);
        }
        if (formattedEndDate) {
          libraryQuery = libraryQuery.lte('publication_date', formattedEndDate);
        }
        
        // Apply completion filter
        if (includeCompleted !== 'true') {
          libraryQuery = libraryQuery.neq('status', 'published');
        }
        
        const { data: libraryData, error: libraryError } = await libraryQuery;
        
        if (libraryError) throw libraryError;
        
        // Map library entries to Gantt format
        ganttData.library = libraryData.map(library => {
          return {
            id: library.id,
            title: library.title,
            description: library.description,
            type: 'library',
            subtype: library.type,
            start: library.created_at,
            end: library.publication_date,
            status: library.status,
            contributors: library.library_contributions.length
          };
        });
      }
    }
    
    // 4. Fetch Video Production Status for Gantt
    if (view === 'all' || view === 'videos') {
      let videoQuery = supabase
        .from('Video')
        .select(`
          id,
          title,
          description,
          createdAt,
          datePublished,
          status,
          statusNote,
          creator,
          youtubeId
        `);
        
      // Apply date filters if provided
      if (formattedStartDate) {
        videoQuery = videoQuery.gte('createdAt', formattedStartDate);
      }
      if (formattedEndDate) {
        videoQuery = videoQuery.lte('datePublished', formattedEndDate);
      }
      
      // Apply completion filter
      if (includeCompleted !== 'true') {
        videoQuery = videoQuery.neq('status', 'published');
      }
      
      const { data: videoData, error: videoError } = await videoQuery;
      
      if (videoError) throw videoError;
      
      // Map videos to Gantt format
      ganttData.videos = videoData.map(video => {
        return {
          id: video.id,
          title: video.title,
          description: video.description,
          type: 'video',
          start: video.createdAt,
          end: video.datePublished,
          status: video.status,
          statusNote: video.statusNote,
          creator: video.creator,
          youtubeId: video.youtubeId
        };
      });
    }
    
    // Return combined Gantt data
    return res.status(200).json({
      success: true,
      data: ganttData,
      filters: {
        view,
        userId,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        includeCompleted: includeCompleted === 'true'
      }
    });
  } catch (error) {
    console.error('Error in gantt-data:', error);
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'An unexpected error occurred' 
    });
  }
}
