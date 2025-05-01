// /api/models/project.js

const dbService = require('../services/dbService');
const TrainingModule = require('./trainingModule');
const UserPersonality = require('./userPersonality');
const { v4: uuidv4 } = require('uuid');

/**
 * Project model
 * Handles collaborative learning projects, team management, and fundraising
 */
class Project {
  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} - Created project
   */
  static async create(projectData) {
    try {
      // Validate required fields
      if (!projectData.title || !projectData.created_by) {
        throw new Error('Project title and creator are required');
      }

      // Set default values
      const newProject = {
        title: projectData.title,
        description: projectData.description || '',
        status: projectData.status || 'planning',
        visibility: projectData.visibility || 'team',
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        cover_image_url: projectData.cover_image_url,
        tags: projectData.tags || [],
        funding_goal: projectData.funding_goal || 0,
        funding_current: 0,
        created_by: projectData.created_by
      };

      // Insert project into database
      const project = await dbService.insert('projects', newProject);
      
      // Add project creator as a member with leader role
      await this.addMember(project.id, project.created_by, {
        role: 'leader',
        status: 'active'
      });
      
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   * @param {string} id - Project ID
   * @param {boolean} includeDetails - Whether to include members and modules
   * @returns {Promise<Object>} - Project data
   */
  static async getById(id, includeDetails = false) {
    try {
      const supabase = dbService.getClient();
      
      let query = supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data: project, error } = await query;
      
      if (error) throw error;
      
      // If not including details, return basic project
      if (!includeDetails) {
        return project;
      }
      
      // Get project members
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select(`
          *,
          users:user_id(id, name, email, avatar_url)
        `)
        .eq('project_id', id);
      
      if (membersError) throw membersError;
      
      // Get project modules
      const { data: modules, error: modulesError } = await supabase
        .from('project_modules')
        .select(`
          *,
          module:module_id(*)
        `)
        .eq('project_id', id);
      
      if (modulesError) throw modulesError;
      
      // Get fundraising campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('fundraising_campaigns')
        .select('*')
        .eq('project_id', id);
      
      if (campaignsError) throw campaignsError;
      
      // Return project with details
      return {
        ...project,
        members: members || [],
        modules: modules ? modules.map(pm => ({
          ...pm.module,
          is_required: pm.is_required,
          assigned_to: pm.assigned_to
        })) : [],
        campaigns: campaigns || []
      };
    } catch (error) {
      console.error(`Failed to get project with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update project
   * @param {string} id - Project ID
   * @param {Object} updateData - Updated project data
   * @returns {Promise<Object>} - Updated project
   */
  static async update(id, updateData) {
    try {
      return await dbService.update('projects', id, updateData);
    } catch (error) {
      console.error(`Failed to update project with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    try {
      // Delete associated records (cascade should handle this in DB)
      return await dbService.delete('projects', id);
    } catch (error) {
      console.error(`Failed to delete project with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * List projects with filtering
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} - List of projects
   */
  static async list(options = {}) {
    try {
      // Set up filters
      const filters = {
        ...options.status && { status: options.status },
        ...options.visibility && { visibility: options.visibility },
        ...options.created_by && { created_by: options.created_by }
      };
      
      // Set up search
      const searchFields = ['title', 'description'];
      
      return await dbService.list('projects', {
        select: '*',
        filters,
        search: options.search,
        searchFields,
        limit: options.limit,
        offset: options.offset,
        orderBy: options.orderBy || 'created_at',
        orderDirection: options.orderDirection || 'desc'
      });
    } catch (error) {
      console.error('Failed to list projects:', error);
      throw error;
    }
  }

  /**
   * Get projects for a user (created or member)
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - List of projects
   */
  static async getByUser(userId, options = {}) {
    try {
      const supabase = dbService.getClient();
      
      // First get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project:project_id(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (memberError) throw memberError;
      
      // Get projects created by user
      const { data: createdProjects, error: createdError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', userId);
      
      if (createdError) throw createdError;
      
      // Combine and remove duplicates
      const memberProjectIds = memberProjects
        ? memberProjects.map(mp => mp.project.id)
        : [];
      
      let projects = createdProjects || [];
      
      // Add member projects that weren't created by the user
      if (memberProjects) {
        memberProjects.forEach(mp => {
          if (!projects.some(p => p.id === mp.project.id)) {
            projects.push(mp.project);
          }
        });
      }
      
      // Apply filters
      if (options.status) {
        projects = projects.filter(p => p.status === options.status);
      }
      
      if (options.search) {
        const search = options.search.toLowerCase();
        projects = projects.filter(p => 
          p.title.toLowerCase().includes(search) || 
          (p.description && p.description.toLowerCase().includes(search))
        );
      }
      
      // Sort projects
      const orderField = options.orderBy || 'created_at';
      const orderAsc = options.orderDirection === 'asc';
      
      projects.sort((a, b) => {
        const aValue = a[orderField];
        const bValue = b[orderField];
        
        if (aValue < bValue) return orderAsc ? -1 : 1;
        if (aValue > bValue) return orderAsc ? 1 : -1;
        return 0;
      });
      
      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit;
      
      if (limit) {
        projects = projects.slice(offset, offset + limit);
      } else if (offset) {
        projects = projects.slice(offset);
      }
      
      return {
        data: projects,
        count: projects.length,
        limit: options.limit,
        offset: options.offset
      };
    } catch (error) {
      console.error(`Failed to get projects for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a project
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {Object} memberData - Member data (role, etc.)
   * @returns {Promise<Object>} - Member data
   */
  static async addMember(projectId, userId, memberData = {}) {
    try {
      // Check if user is already a member
      const supabase = dbService.getClient();
      
      const { data: existingMember, error: checkError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      // Get user's personality profile if available
      let personalityType = null;
      try {
        const profile = await UserPersonality.getProfile(userId);
        if (profile) {
          personalityType = profile.personality_type;
        }
      } catch (profileError) {
        console.error(`Failed to get personality profile for user ${userId}:`, profileError);
      }
      
      // Prepare member data
      const member = {
        project_id: projectId,
        user_id: userId,
        role: memberData.role || 'member',
        status: memberData.status || 'invited',
        personality_type: memberData.personality_type || personalityType,
        skills: memberData.skills || []
      };
      
      if (existingMember) {
        // Update existing member
        return await dbService.update('project_members', existingMember.id, member);
      } else {
        // Create new member
        return await dbService.insert('project_members', member);
      }
    } catch (error) {
      console.error(`Failed to add member ${userId} to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update member status or role
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Updated member data
   * @returns {Promise<Object>} - Updated member
   */
  static async updateMember(projectId, userId, updateData) {
    try {
      const supabase = dbService.getClient();
      
      // Get member record
      const { data: member, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      // Update member
      return await dbService.update('project_members', member.id, updateData);
    } catch (error) {
      console.error(`Failed to update member ${userId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a member from a project
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeMember(projectId, userId) {
    try {
      const supabase = dbService.getClient();
      
      // Check if user is the project creator
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // Cannot remove the project creator
      if (project.created_by === userId) {
        throw new Error('Cannot remove the project creator');
      }
      
      // Get member record
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (memberError) throw memberError;
      
      // Delete member
      await dbService.delete('project_members', member.id);
      
      return true;
    } catch (error) {
      console.error(`Failed to remove member ${userId} from project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add a training module to a project
   * @param {string} projectId - Project ID
   * @param {string} moduleId - Module ID
   * @param {Object} moduleData - Module association data
   * @returns {Promise<Object>} - Project module data
   */
  static async addModule(projectId, moduleId, moduleData = {}) {
    try {
      // Check if module exists
      const module = await TrainingModule.getById(moduleId);
      
      if (!module) {
        throw new Error(`Module with ID ${moduleId} not found`);
      }
      
      // Check if module is already associated with project
      const supabase = dbService.getClient();
      
      const { data: existingModule, error: checkError } = await supabase
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId)
        .eq('module_id', moduleId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      // Prepare module data
      const projectModule = {
        project_id: projectId,
        module_id: moduleId,
        is_required: moduleData.is_required !== undefined ? moduleData.is_required : false,
        assigned_to: moduleData.assigned_to || []
      };
      
      if (existingModule) {
        // Update existing project module
        return await dbService.update('project_modules', existingModule.id, projectModule);
      } else {
        // Create new project module
        return await dbService.insert('project_modules', projectModule);
      }
    } catch (error) {
      console.error(`Failed to add module ${moduleId} to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a module from a project
   * @param {string} projectId - Project ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeModule(projectId, moduleId) {
    try {
      const supabase = dbService.getClient();
      
      // Get project module record
      const { data: projectModule, error: moduleError } = await supabase
        .from('project_modules')
        .select('id')
        .eq('project_id', projectId)
        .eq('module_id', moduleId)
        .single();
      
      if (moduleError) throw moduleError;
      
      // Delete project module
      await dbService.delete('project_modules', projectModule.id);
      
      return true;
    } catch (error) {
      console.error(`Failed to remove module ${moduleId} from project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Create a fundraising campaign for a project
   * @param {string} projectId - Project ID
   * @param {Object} campaignData - Campaign data
   * @returns {Promise<Object>} - Created campaign
   */
  static async createCampaign(projectId, campaignData) {
    try {
      // Validate required fields
      if (!campaignData.title || !campaignData.goal_amount || !campaignData.start_date) {
        throw new Error('Campaign title, goal amount, and start date are required');
      }
      
      // Check if project exists
      const project = await this.getById(projectId);
      
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      // Prepare campaign data
      const campaign = {
        project_id: projectId,
        title: campaignData.title,
        description: campaignData.description || '',
        goal_amount: campaignData.goal_amount,
        currency: campaignData.currency || 'USD',
        start_date: campaignData.start_date,
        end_date: campaignData.end_date,
        status: campaignData.status || 'draft',
        visibility: campaignData.visibility || 'public',
        cover_image_url: campaignData.cover_image_url,
        video_url: campaignData.video_url,
        created_by: campaignData.created_by || project.created_by
      };
      
      // Create campaign
      return await dbService.insert('fundraising_campaigns', campaign);
    } catch (error) {
      console.error(`Failed to create campaign for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get fundraising campaigns for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of campaigns
   */
  static async getCampaigns(projectId) {
    try {
      const supabase = dbService.getClient();
      
      const { data: campaigns, error } = await supabase
        .from('fundraising_campaigns')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return campaigns || [];
    } catch (error) {
      console.error(`Failed to get campaigns for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Record a donation to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} donationData - Donation data
   * @returns {Promise<Object>} - Created donation
   */
  static async recordDonation(campaignId, donationData) {
    try {
      // Validate required fields
      if (!donationData.amount) {
        throw new Error('Donation amount is required');
      }
      
      // Prepare donation data
      const donation = {
        campaign_id: campaignId,
        user_id: donationData.user_id,
        amount: donationData.amount,
        currency: donationData.currency || 'USD',
        status: donationData.status || 'completed',
        payment_method: donationData.payment_method,
        transaction_id: donationData.transaction_id,
        is_anonymous: donationData.is_anonymous || false,
        message: donationData.message
      };
      
      // Create donation
      const createdDonation = await dbService.insert('donations', donation);
      
      // Update campaign and project funding totals
      await this.updateCampaignFunding(campaignId);
      
      return createdDonation;
    } catch (error) {
      console.error(`Failed to record donation for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Update campaign funding total
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<void>}
   */
  static async updateCampaignFunding(campaignId) {
    try {
      const supabase = dbService.getClient();
      
      // Get campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('fundraising_campaigns')
        .select('project_id')
        .eq('id', campaignId)
        .single();
      
      if (campaignError) throw campaignError;
      
      // Sum donations for campaign
      const { data: result, error: sumError } = await supabase
        .from('donations')
        .select('amount')
        .eq('campaign_id', campaignId)
        .eq('status', 'completed');
      
      if (sumError) throw sumError;
      
      // Calculate total
      const total = result.reduce((sum, donation) => sum + donation.amount, 0);
      
      // Update campaign total
      await supabase
        .from('fundraising_campaigns')
        .update({ current_amount: total })
        .eq('id', campaignId);
      
      // Update project total
      await this.updateProjectFunding(campaign.project_id);
    } catch (error) {
      console.error(`Failed to update funding for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Update project funding total
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  static async updateProjectFunding(projectId) {
    try {
      const supabase = dbService.getClient();
      
      // Sum campaign totals for project
      const { data: campaigns, error } = await supabase
        .from('fundraising_campaigns')
        .select('current_amount')
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      // Calculate total
      const total = campaigns.reduce((sum, campaign) => sum + (campaign.current_amount || 0), 0);
      
      // Update project total
      await supabase
        .from('projects')
        .update({ funding_current: total })
        .eq('id', projectId);
    } catch (error) {
      console.error(`Failed to update funding for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze team composition and compatibility
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} - Team analysis
   */
  static async analyzeTeam(projectId) {
    try {
      const supabase = dbService.getClient();
      
      // Get project members
      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          *,
          users:user_id(id, name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      if (!members || members.length === 0) {
        throw new Error('No active team members found');
      }
      
      // Collect personality types
      const personalityTypes = members
        .filter(member => member.personality_type)
        .map(member => member.personality_type);
      
      // Get skills distribution
      const skillsMap = {};
      members.forEach(member => {
        if (member.skills && Array.isArray(member.skills)) {
          member.skills.forEach(skill => {
            skillsMap[skill] = (skillsMap[skill] || 0) + 1;
          });
        }
      });
      
      // Sort skills by frequency
      const skillsDistribution = Object.entries(skillsMap)
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: Math.round((count / members.length) * 100)
        }))
        .sort((a, b) => b.count - a.count);
      
      // Get role distribution
      const roleMap = {};
      members.forEach(member => {
        roleMap[member.role] = (roleMap[member.role] || 0) + 1;
      });
      
      const roleDistribution = Object.entries(roleMap)
        .map(([role, count]) => ({
          role,
          count,
          percentage: Math.round((count / members.length) * 100)
        }))
        .sort((a, b) => b.count - a.count);
      
      // Analyze team compatibility if personality types exist
      let personalityAnalysis = null;
      if (personalityTypes.length > 0) {
        personalityAnalysis = UserPersonality.analyzeTeamCompatibility(personalityTypes);
      }
      
      return {
        team_size: members.length,
        members: members.map(member => ({
          id: member.user_id,
          name: member.users?.name,
          avatar_url: member.users?.avatar_url,
          role: member.role,
          personality_type: member.personality_type,
          skills: member.skills || []
        })),
        skill_distribution: skillsDistribution,
        role_distribution: roleDistribution,
        personality_analysis: personalityAnalysis
      };
    } catch (error) {
      console.error(`Failed to analyze team for project ${projectId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get project progress summary
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} - Progress summary
   */
  static async getProgressSummary(projectId) {
    try {
      const supabase = dbService.getClient();
      
      // Get project modules
      const { data: projectModules, error: modulesError } = await supabase
        .from('project_modules')
        .select(`
          *,
          module:module_id(*)
        `)
        .eq('project_id', projectId);
      
      if (modulesError) throw modulesError;
      
      if (!projectModules || projectModules.length === 0) {
        return {
          total_modules: 0,
          completed_modules: 0,
          completion_percentage: 0,
          module_progress: []
        };
      }
      
      // Get project members
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');
      
      if (membersError) throw membersError;
      
      const memberIds = members.map(member => member.user_id);
      
      // Get module progress for all members
      const moduleIds = projectModules.map(pm => pm.module_id);
      
      // This query gets all progress records for all modules and all team members
      const { data: progressRecords, error: progressError } = await supabase
        .from('user_training_progress')
        .select('*')
        .in('module_id', moduleIds)
        .in('user_id', memberIds);
      
      if (progressError) throw progressError;
      
      // Calculate progress for each module
      const moduleProgress = projectModules.map(pm => {
        const moduleId = pm.module_id;
        const moduleName = pm.module?.title || 'Unknown Module';
        
        // Get all progress records for this module
        const moduleRecords = progressRecords.filter(record => record.module_id === moduleId);
        
        // Calculate module completion stats
        const totalAssigned = pm.assigned_to?.length || memberIds.length;
        const completedCount = moduleRecords.filter(record => record.completed).length;
        const completionPercentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
        
        return {
          module_id: moduleId,
          title: moduleName,
          required: pm.is_required,
          assigned_to: pm.assigned_to || memberIds,
          completed_count: completedCount,
          total_assigned: totalAssigned,
          completion_percentage: completionPercentage
        };
      });
      
      // Calculate overall project progress
      const requiredModules = projectModules.filter(pm => pm.is_required);
      const totalRequired = requiredModules.length;
      
      let completedRequired = 0;
      if (totalRequired > 0) {
        // A required module counts as complete when all assigned members have completed it
        completedRequired = moduleProgress
          .filter(mp => mp.required && mp.completion_percentage === 100)
          .length;
      }
      
      const overallPercentage = totalRequired > 0 
        ? Math.round((completedRequired / totalRequired) * 100)
        : Math.round((moduleProgress.reduce((sum, mp) => sum + mp.completion_percentage, 0) / moduleProgress.length));
      
      return {
        total_modules: projectModules.length,
        required_modules: totalRequired,
        completed_required: completedRequired,
        completion_percentage: overallPercentage,
        module_progress: moduleProgress
      };
    } catch (error) {
      console.error(`Failed to get progress summary for project ${projectId}:`, error);
      throw error;
    }
  }
  
  /**
   * Schedule a Zoom meeting for a project
   * @param {string} projectId - Project ID
   * @param {Object} meetingData - Meeting data
   * @returns {Promise<Object>} - Created meeting
   */
  static async scheduleMeeting(projectId, meetingData) {
    try {
      // Validate required fields
      if (!meetingData.topic || !meetingData.start_time) {
        throw new Error('Meeting topic and start time are required');
      }
      
      const supabase = dbService.getClient();
      
      // Check if project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // This is where you would integrate with Zoom API
      // For now, we'll just create a record in the database
      
      const meeting = {
        project_id: projectId,
        module_id: meetingData.module_id, // Optional
        topic: meetingData.topic,
        start_time: meetingData.start_time,
        duration: meetingData.duration || 60,
        timezone: meetingData.timezone || 'UTC',
        zoom_meeting_id: '123456789', // This would come from Zoom API
        join_url: 'https://zoom.us/j/123456789', // This would come from Zoom API
        password: 'password', // This would come from Zoom API
        settings: meetingData.settings || {},
        created_by: meetingData.created_by
      };
      
      return await dbService.insert('zoom_meetings', meeting);
    } catch (error) {
      console.error(`Failed to schedule meeting for project ${projectId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get upcoming meetings for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of upcoming meetings
   */
  static async getUpcomingMeetings(projectId) {
    try {
      const supabase = dbService.getClient();
      
      const now = new Date().toISOString();
      
      const { data: meetings, error } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          module:module_id(*),
          creator:created_by(id, name, avatar_url)
        `)
        .eq('project_id', projectId)
        .gte('start_time', now)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      return meetings || [];
    } catch (error) {
      console.error(`Failed to get upcoming meetings for project ${projectId}:`, error);
      throw error;
    }
  }
  
  /**
   * Send notification to project members
   * @param {string} projectId - Project ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Array>} - Created notifications
   */
  static async notifyMembers(projectId, notificationData) {
    try {
      // Validate required fields
      if (!notificationData.title || !notificationData.message) {
        throw new Error('Notification title and message are required');
      }
      
      const supabase = dbService.getClient();
      
      // Get project members
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');
      
      if (membersError) throw membersError;
      
      if (!members || members.length === 0) {
        throw new Error('No active members found for this project');
      }
      
      // Create a notification for each member
      const notifications = [];
      
      for (const member of members) {
        // Skip specific excluded members
        if (notificationData.exclude && notificationData.exclude.includes(member.user_id)) {
          continue;
        }
        
        const notification = {
          user_id: member.user_id,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'in-app',
          context: {
            project_id: projectId,
            ...notificationData.context
          },
          status: 'pending',
          scheduled_for: notificationData.scheduled_for
        };
        
        const createdNotification = await dbService.insert('notifications', notification);
        notifications.push(createdNotification);
      }
      
      // In a real application, you would queue these notifications for delivery
      // For now, we'll just mark them as sent
      for (const notification of notifications) {
        await dbService.update('notifications', notification.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }
      
      return notifications;
    } catch (error) {
      console.error(`Failed to send notifications for project ${projectId}:`, error);
      throw error;
    }
  }
}

module.exports = Project;