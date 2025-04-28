// /api/controllers/projectsController.js
const Project = require('../models/project');
const UserPersonality = require('../models/userPersonality');

/**
 * Controller for projects API endpoints
 * Handles project management, team collaboration, and fundraising
 */
const projectsController = {
  /**
   * List all projects with filtering
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  listProjects: async (req, res) => {
    try {
      // Extract query parameters
      const options = {
        status: req.query.status,
        visibility: req.query.visibility,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0,
        orderBy: req.query.orderBy || 'created_at',
        orderDirection: req.query.orderDirection || 'desc'
      };

      // Handle visibility filter for non-admins
      if (!req.user || req.user.role !== 'admin') {
        // Regular users can only see public or team projects they're members of
        if (options.visibility !== 'public') {
          // Will be filtered by user membership in the model
          options.visibility = undefined;
        }
      }

      // Get projects
      const result = await Project.list(options);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.count,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list projects',
        error: error.message
      });
    }
  },

  /**
   * Get projects for current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUserProjects: async (req, res) => {
    try {
      // Extract query parameters
      const options = {
        status: req.query.status,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0,
        orderBy: req.query.orderBy || 'created_at',
        orderDirection: req.query.orderDirection || 'desc'
      };

      // Get projects for user
      const result = await Project.getByUser(req.user.id, options);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.count,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      console.error(`Error getting projects for user ${req.user.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get your projects',
        error: error.message
      });
    }
  },

  /**
   * Get a project by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getProject: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project with details
      const project = await Project.getById(projectId, true);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions for private projects
      if (project.visibility === 'private') {
        // Check if user is a member or admin
        const isMember = project.members.some(member => 
          member.user_id === req.user.id && member.status === 'active'
        );
        const isCreator = project.created_by === req.user.id;
        const isAdmin = req.user.role === 'admin';
        
        if (!isMember && !isCreator && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this project'
          });
        }
      }
      
      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error(`Error getting project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project',
        error: error.message
      });
    }
  },

  /**
   * Create a new project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createProject: async (req, res) => {
    try {
      // Validate request
      if (!req.body.title) {
        return res.status(400).json({
          success: false,
          message: 'Project title is required'
        });
      }
      
      // Set creator to current user
      const projectData = {
        ...req.body,
        created_by: req.user.id
      };
      
      // Create project
      const project = await Project.create(projectData);
      
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: error.message
      });
    }
  },

  /**
   * Update a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateProject: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get current project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this project'
        });
      }
      
      // Update project
      const updatedProject = await Project.update(projectId, req.body);
      
      res.status(200).json({
        success: true,
        data: updatedProject,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error(`Error updating project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error.message
      });
    }
  },

  /**
   * Delete a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  deleteProject: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get current project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions (only creator or admin can delete)
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this project'
        });
      }
      
      // Delete project
      await Project.delete(projectId);
      
      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error(`Error deleting project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message
      });
    }
  },

  /**
   * Get project members
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getProjectMembers: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project with members
      const project = await Project.getById(projectId, true);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Extract members from project
      const members = project.members || [];
      
      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error(`Error getting members for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project members',
        error: error.message
      });
    }
  },

  /**
   * Add a member to a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addProjectMember: async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.body.user_id;
      
      // Validate request
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions (only creator, admin, or team leader can add members)
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Also check if the user is a team leader
      const isTeamLeader = await isUserTeamLeader(projectId, req.user.id);
      
      if (!isCreator && !isAdmin && !isTeamLeader) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add members to this project'
        });
      }
      
      // Add member
      const member = await Project.addMember(projectId, userId, req.body);
      
      res.status(200).json({
        success: true,
        data: member,
        message: 'Member added successfully'
      });
    } catch (error) {
      console.error(`Error adding member to project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to add member',
        error: error.message
      });
    }
  },

  /**
   * Update a member's role or status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateProjectMember: async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.params.userId;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions (only creator or admin can update member roles)
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isTeamLeader = await isUserTeamLeader(projectId, req.user.id);
      
      // Users can update their own status (e.g., to leave a project)
      const isSelf = userId === req.user.id;
      
      if (!isCreator && !isAdmin && !isTeamLeader && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this member'
        });
      }
      
      // If it's the user updating themselves, they can only update status (not role)
      if (isSelf && !isCreator && !isAdmin && req.body.role) {
        return res.status(403).json({
          success: false,
          message: 'You cannot change your own role'
        });
      }
      
      // Update member
      const member = await Project.updateMember(projectId, userId, req.body);
      
      res.status(200).json({
        success: true,
        data: member,
        message: 'Member updated successfully'
      });
    } catch (error) {
      console.error(`Error updating member in project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to update member',
        error: error.message
      });
    }
  },

  /**
   * Remove a member from a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  removeProjectMember: async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.params.userId;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isTeamLeader = await isUserTeamLeader(projectId, req.user.id);
      const isSelf = userId === req.user.id; // Users can remove themselves
      
      if (!isCreator && !isAdmin && !isTeamLeader && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove this member'
        });
      }
      
      // Cannot remove the project creator
      if (userId === project.created_by && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Cannot remove the project creator'
        });
      }
      
      // Remove member
      await Project.removeMember(projectId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      console.error(`Error removing member from project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove member',
        error: error.message
      });
    }
  },

  /**
   * Analyze team composition and compatibility
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  analyzeTeam: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isMember = await isUserProjectMember(projectId, req.user.id);
      const isAdmin = req.user.role === 'admin';
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this project'
        });
      }
      
      // Analyze team
      const analysis = await Project.analyzeTeam(projectId);
      
      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error(`Error analyzing team for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze team',
        error: error.message
      });
    }
  },

  /**
   * Get personality type information
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getPersonalityTypes: async (req, res) => {
    try {
      const types = UserPersonality.getPersonalityTypes();
      
      res.status(200).json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Error getting personality types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personality types',
        error: error.message
      });
    }
  },

  /**
   * Get learning styles information
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getLearningStyles: async (req, res) => {
    try {
      const styles = UserPersonality.getLearningStyles();
      
      res.status(200).json({
        success: true,
        data: styles
      });
    } catch (error) {
      console.error('Error getting learning styles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get learning styles',
        error: error.message
      });
    }
  },

  /**
   * Get personalized learning recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getLearningRecommendations: async (req, res) => {
    try {
      const userId = req.params.userId || req.user.id;
      
      // Check permissions
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own learning recommendations'
        });
      }
      
      // Get user's personality profile
      const profile = await UserPersonality.getProfile(userId);
      
      if (!profile || !profile.personality_type) {
        return res.status(400).json({
          success: false,
          message: 'User does not have a personality profile'
        });
      }
      
      // Get learning recommendations
      const recommendations = UserPersonality.getLearningRecommendations(
        profile.personality_type,
        profile.learning_style || 'visual'
      );
      
      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error getting learning recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get learning recommendations',
        error: error.message
      });
    }
  },

  /**
   * Add a training module to a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addModule: async (req, res) => {
    try {
      const projectId = req.params.id;
      const moduleId = req.body.module_id;
      
      // Validate request
      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: 'Module ID is required'
        });
      }
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isTeamLeader = await isUserTeamLeader(projectId, req.user.id);
      
      if (!isCreator && !isAdmin && !isTeamLeader) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add modules to this project'
        });
      }
      
      // Add module
      const projectModule = await Project.addModule(projectId, moduleId, req.body);
      
      res.status(200).json({
        success: true,
        data: projectModule,
        message: 'Module added to project successfully'
      });
    } catch (error) {
      console.error(`Error adding module to project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to add module to project',
        error: error.message
      });
    }
  },

  /**
   * Remove a module from a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  removeModule: async (req, res) => {
    try {
      const projectId = req.params.id;
      const moduleId = req.params.moduleId;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isTeamLeader = await isUserTeamLeader(projectId, req.user.id);
      
      if (!isCreator && !isAdmin && !isTeamLeader) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove modules from this project'
        });
      }
      
      // Remove module
      await Project.removeModule(projectId, moduleId);
      
      res.status(200).json({
        success: true,
        message: 'Module removed from project successfully'
      });
    } catch (error) {
      console.error(`Error removing module from project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove module from project',
        error: error.message
      });
    }
  },

  /**
   * Get project progress summary
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getProgressSummary: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isMember = await isUserProjectMember(projectId, req.user.id);
      const isAdmin = req.user.role === 'admin';
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this project'
        });
      }
      
      // Get progress summary
      const summary = await Project.getProgressSummary(projectId);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error(`Error getting progress summary for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress summary',
        error: error.message
      });
    }
  },

  /**
   * Create a fundraising campaign
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  createCampaign: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate request
      if (!req.body.title || !req.body.goal_amount || !req.body.start_date) {
        return res.status(400).json({
          success: false,
          message: 'Campaign title, goal amount, and start date are required'
        });
      }
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isCreator = project.created_by === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create campaigns for this project'
        });
      }
      
      // Create campaign
      const campaignData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const campaign = await Project.createCampaign(projectId, campaignData);
      
      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully'
      });
    } catch (error) {
      console.error(`Error creating campaign for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
        error: error.message
      });
    }
  },

  /**
   * Get campaigns for a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getCampaigns: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Get campaigns
      const campaigns = await Project.getCampaigns(projectId);
      
      res.status(200).json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      console.error(`Error getting campaigns for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get campaigns',
        error: error.message
      });
    }
  },

  /**
   * Record a donation to a campaign
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  recordDonation: async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      
      // Validate request
      if (!req.body.amount) {
        return res.status(400).json({
          success: false,
          message: 'Donation amount is required'
        });
      }
      
      // Prepare donation data
      const donationData = {
        ...req.body,
        user_id: req.user.id
      };
      
      // Record donation
      const donation = await Project.recordDonation(campaignId, donationData);
      
      res.status(201).json({
        success: true,
        data: donation,
        message: 'Donation recorded successfully'
      });
    } catch (error) {
      console.error(`Error recording donation for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to record donation',
        error: error.message
      });
    }
  },

  /**
   * Schedule a meeting for a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  scheduleMeeting: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate request
      if (!req.body.topic || !req.body.start_time) {
        return res.status(400).json({
          success: false,
          message: 'Meeting topic and start time are required'
        });
      }
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isMember = await isUserProjectMember(projectId, req.user.id);
      const isAdmin = req.user.role === 'admin';
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to schedule meetings for this project'
        });
      }
      
      // Schedule meeting
      const meetingData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const meeting = await Project.scheduleMeeting(projectId, meetingData);
      
      // Notify project members about the meeting
      Project.notifyMembers(projectId, {
        title: `New Meeting: ${req.body.topic}`,
        message: `A new meeting has been scheduled for ${new Date(req.body.start_time).toLocaleString()}`,
        type: 'in-app',
        context: {
          meeting_id: meeting.id
        },
        exclude: [req.user.id] // Don't notify the meeting creator
      }).catch(err => console.error('Failed to send meeting notifications:', err));
      
      res.status(201).json({
        success: true,
        data: meeting,
        message: 'Meeting scheduled successfully'
      });
    } catch (error) {
      console.error(`Error scheduling meeting for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule meeting',
        error: error.message
      });
    }
  },

  /**
   * Get upcoming meetings for a project
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUpcomingMeetings: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isMember = await isUserProjectMember(projectId, req.user.id);
      const isAdmin = req.user.role === 'admin';
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this project'
        });
      }
      
      // Get upcoming meetings
      const meetings = await Project.getUpcomingMeetings(projectId);
      
      res.status(200).json({
        success: true,
        data: meetings
      });
    } catch (error) {
      console.error(`Error getting upcoming meetings for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get upcoming meetings',
        error: error.message
      });
    }
  },

  /**
   * Send notification to project members
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  notifyMembers: async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate request
      if (!req.body.title || !req.body.message) {
        return res.status(400).json({
          success: false,
          message: 'Notification title and message are required'
        });
      }
      
      // Get project
      const project = await Project.getById(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check permissions
      const isMember = await isUserProjectMember(projectId, req.user.id);
      const isAdmin = req.user.role === 'admin';
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to send notifications for this project'
        });
      }
      
      // Send notifications
      const notifications = await Project.notifyMembers(projectId, {
        ...req.body,
        exclude: [req.user.id] // Don't notify the sender
      });
      
      res.status(200).json({
        success: true,
        data: {
          notifications_sent: notifications.length
        },
        message: 'Notifications sent successfully'
      });
    } catch (error) {
      console.error(`Error sending notifications for project ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: error.message
      });
    }
  }
};

/**
 * Helper function to check if a user is a member of a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether the user is a member
 */
async function isUserProjectMember(projectId, userId) {
  try {
    const supabase = require('../services/dbService').getClient();
    
    const { data, error } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if user ${userId} is a member of project ${projectId}:`, error);
    return false;
  }
}

/**
 * Helper function to check if a user is a team leader of a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether the user is a team leader
 */
async function isUserTeamLeader(projectId, userId) {
  try {
    const supabase = require('../services/dbService').getClient();
    
    const { data, error } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('role', 'leader')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if user ${userId} is a team leader of project ${projectId}:`, error);
    return false;
  }
}

module.exports = projectsController;