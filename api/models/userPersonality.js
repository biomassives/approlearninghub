// /api/models/userPersonality.js
/**
 * UserPersonality model
 * Handles personality profiling, team compatibility, and learning style preferences
 */

const dbService = require('../services/dbService');


class UserPersonality {
  /**
   * Create or update a user's personality profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Personality profile data
   * @returns {Promise<Object>} - Updated profile
   */
  static async saveProfile(userId, profileData) {
    try {
      // Check if user profile already exists
      const supabase = dbService.getClient();
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // Prepare profile data
      const profileRecord = {
        user_id: userId,
        personality_type: profileData.personality_type,
        learning_style: profileData.learning_style,
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        bio: profileData.bio,
        social_links: profileData.social_links || {},
        avatar_url: profileData.avatar_url
      };
      
      if (existingProfile) {
        // Update existing profile
        return await dbService.update('user_profiles', existingProfile.id, profileRecord);
      } else {
        // Create new profile
        return await dbService.insert('user_profiles', profileRecord);
      }
    } catch (error) {
      console.error(`Failed to save personality profile for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a user's personality profile
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User profile or null if not found
   */
  static async getProfile(userId) {
    try {
      const supabase = dbService.getClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          users(id, name, email, avatar_url)
        `)
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error(`Failed to get personality profile for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get personality types with descriptions and characteristics
   * @returns {Array} - Personality types information
   */
  static getPersonalityTypes() {
    // MBTI personality types with learning characteristics
    return [
      {
        code: 'ISTJ',
        name: 'Inspector',
        description: 'Practical, factual, organized, logical, and decisive.',
        learning_preferences: [
          'Structured learning environments',
          'Clear instructions and expectations',
          'Practical applications',
          'Sequential learning'
        ],
        teamwork_traits: [
          'Dependable and responsible',
          'Detail-oriented',
          'Prefers established procedures',
          'Values tradition and experience'
        ],
        complementary_types: ['ENFP', 'ENTP', 'ESFP']
      },
      {
        code: 'ISFJ',
        name: 'Protector',
        description: 'Caring, loyal, observant, practical, and traditional.',
        learning_preferences: [
          'Practical, applicable knowledge',
          'Step-by-step instructions',
          'Supportive learning environment',
          'Connection to past experience'
        ],
        teamwork_traits: [
          'Service-oriented',
          'Patient and detail-focused',
          'Prefers harmony in teams',
          'Reliable and conscientious'
        ],
        complementary_types: ['ENFP', 'ENTP', 'ESTP']
      },
      {
        code: 'INFJ',
        name: 'Counselor',
        description: 'Insightful, compassionate, idealistic, complex, and committed.',
        learning_preferences: [
          'Conceptual and theoretical learning',
          'Working independently',
          'Creative problem-solving',
          'Learning that aligns with personal values'
        ],
        teamwork_traits: [
          'Insightful about people',
          'Values harmony and consensus',
          'Long-term vision-focused',
          'Good at inspiring others'
        ],
        complementary_types: ['ESTP', 'ENFP', 'ENTP']
      },
      {
        code: 'INTJ',
        name: 'Mastermind',
        description: 'Strategic, innovative, independent, analytical, and purposeful.',
        learning_preferences: [
          'Theoretical and abstract concepts',
          'Independent study',
          'Intellectual challenges',
          'Systems thinking'
        ],
        teamwork_traits: [
          'Strategic planner',
          'Values competence and intelligence',
          'Focuses on big picture',
          'Independent and self-directed'
        ],
        complementary_types: ['ENFP', 'ENTP', 'ESFP']
      },
      {
        code: 'ISTP',
        name: 'Craftsman',
        description: 'Adaptable, observant, practical, logical, and action-oriented.',
        learning_preferences: [
          'Hands-on learning',
          'Real-world applications',
          'Technical subjects',
          'Freedom to explore solutions'
        ],
        teamwork_traits: [
          'Problem-solver',
          'Adaptable and flexible',
          'Action-oriented',
          'Independent worker'
        ],
        complementary_types: ['ENFJ', 'ENTJ', 'ESFJ']
      },
      {
        code: 'ISFP',
        name: 'Composer',
        description: 'Sensitive, creative, gentle, spontaneous, and present-focused.',
        learning_preferences: [
          'Hands-on, experiential learning',
          'Artistic expression',
          'Personal connection to material',
          'Supportive environment'
        ],
        teamwork_traits: [
          'Adaptable and flexible',
          'Values harmony and individual needs',
          'Supportive of others',
          'Attentive to practical needs'
        ],
        complementary_types: ['ENTJ', 'ENFJ', 'ESTJ']
      },
      {
        code: 'INFP',
        name: 'Healer',
        description: 'Idealistic, compassionate, creative, intuitive, and authentic.',
        learning_preferences: [
          'Creative exploration',
          'Personal meaning and values',
          'Independent study',
          'Flexible learning environments'
        ],
        teamwork_traits: [
          'Values-driven',
          'Supportive and empathetic',
          'Adaptable and accommodating',
          'Seeks harmony and consensus'
        ],
        complementary_types: ['ENTJ', 'ESTJ', 'ENFJ']
      },
      {
        code: 'INTP',
        name: 'Architect',
        description: 'Logical, analytical, curious, theoretical, and innovative.',
        learning_preferences: [
          'Conceptual and logical understanding',
          'Independent exploration',
          'Theoretical frameworks',
          'Problem-solving challenges'
        ],
        teamwork_traits: [
          'Analytical problem-solver',
          'Values precision and logic',
          'Independent thinker',
          'Generates innovative ideas'
        ],
        complementary_types: ['ENTJ', 'ENFJ', 'ESTJ']
      },
      {
        code: 'ESTP',
        name: 'Dynamo',
        description: 'Energetic, adaptable, pragmatic, observant, and spontaneous.',
        learning_preferences: [
          'Active, hands-on learning',
          'Real-time problem solving',
          'Practical applications',
          'Dynamic, changing environments'
        ],
        teamwork_traits: [
          'Action-oriented',
          'Adaptable to change',
          'Pragmatic problem-solver',
          'Enjoys variety and challenge'
        ],
        complementary_types: ['INFJ', 'INTJ', 'ISFJ']
      },
      {
        code: 'ESFP',
        name: 'Performer',
        description: 'Enthusiastic, social, spontaneous, practical, and present-focused.',
        learning_preferences: [
          'Active, hands-on learning',
          'Group activities',
          'Visual and experiential methods',
          'Practical, immediate applications'
        ],
        teamwork_traits: [
          'Enthusiastic team player',
          'Brings energy and fun',
          'Practical and resourceful',
          'People-oriented'
        ],
        complementary_types: ['ISTJ', 'INTJ', 'ISFJ']
      },
      {
        code: 'ENFP',
        name: 'Champion',
        description: 'Enthusiastic, creative, spontaneous, empathetic, and possibility-focused.',
        learning_preferences: [
          'Creative exploration',
          'Group interaction',
          'Multiple learning approaches',
          'Making conceptual connections'
        ],
        teamwork_traits: [
          'Enthusiastic and inspiring',
          'Values innovation and possibilities',
          'Adaptable and flexible',
          'People-oriented'
        ],
        complementary_types: ['ISTJ', 'ISFJ', 'INTJ', 'INFJ']
      },
      {
        code: 'ENTP',
        name: 'Visionary',
        description: 'Innovative, analytical, versatile, theoretical, and debative.',
        learning_preferences: [
          'Conceptual understanding',
          'Debate and discussion',
          'Exploring multiple perspectives',
          'Novel and challenging ideas'
        ],
        teamwork_traits: [
          'Idea generator',
          'Values competence and debate',
          'Adaptable to change',
          'Conceptual problem-solver'
        ],
        complementary_types: ['ISTJ', 'ISFJ', 'INTJ', 'INFJ']
      },
      {
        code: 'ESTJ',
        name: 'Supervisor',
        description: 'Practical, organized, decisive, logical, and traditional.',
        learning_preferences: [
          'Structured learning environments',
          'Practical applications',
          'Clear objectives',
          'Sequential learning process'
        ],
        teamwork_traits: [
          'Organized and efficient',
          'Task-focused',
          'Decisive leader',
          'Values tradition and structure'
        ],
        complementary_types: ['INFP', 'INTP', 'ISFP']
      },
      {
        code: 'ESFJ',
        name: 'Provider',
        description: 'Supportive, practical, conscientious, traditional, and social.',
        learning_preferences: [
          'Structured group learning',
          'Practical, helpful information',
          'Supportive environment',
          'Clear guidance and feedback'
        ],
        teamwork_traits: [
          'Supportive team player',
          'Organized and reliable',
          'Values harmony and cooperation',
          'Practical contributor'
        ],
        complementary_types: ['ISTP', 'INTP', 'ISFP']
      },
      {
        code: 'ENFJ',
        name: 'Teacher',
        description: 'Empathetic, charismatic, organized, diplomatic, and responsible.',
        learning_preferences: [
          'Collaborative learning',
          'Personal growth-oriented material',
          'Organized approach',
          'People-focused applications'
        ],
        teamwork_traits: [
          'Natural facilitator',
          'Builds team cohesion',
          'Values harmony and growth',
          'Organized and responsible'
        ],
        complementary_types: ['ISTP', 'INTP', 'ISFP', 'INFP']
      },
      {
        code: 'ENTJ',
        name: 'Commander',
        description: 'Strategic, logical, efficient, driving, and decisive.',
        learning_preferences: [
          'Logical frameworks',
          'Efficiency in learning',
          'Strategic applications',
          'Leadership development'
        ],
        teamwork_traits: [
          'Natural leader',
          'Strategic planner',
          'Results-oriented',
          'Values competence and efficiency'
        ],
        complementary_types: ['ISFP', 'INFP', 'INTP', 'ISTP']
      }
    ];
  }
  
  /**
   * Get learning styles with descriptions
   * @returns {Array} - Learning styles information
   */
  static getLearningStyles() {
    return [
      {
        code: 'visual',
        name: 'Visual Learner',
        description: 'Learns best through seeing information represented visually.',
        preferences: [
          'Charts, graphs, and diagrams',
          'Written instructions',
          'Visual demonstrations',
          'Color-coding information',
          'Mind maps and visual organizers'
        ],
        teaching_strategies: [
          'Use visual aids and demonstrations',
          'Provide written instructions',
          'Incorporate videos and diagrams',
          'Use color-coding for organization',
          'Create visual summaries'
        ]
      },
      {
        code: 'auditory',
        name: 'Auditory Learner',
        description: 'Learns best through listening and verbal communication.',
        preferences: [
          'Verbal instructions and explanations',
          'Discussions and dialogue',
          'Audio recordings and lectures',
          'Reading aloud',
          'Verbal repetition of information'
        ],
        teaching_strategies: [
          'Encourage discussion and questions',
          'Use verbal directions',
          'Incorporate audio materials',
          'Allow for verbal processing of information',
          'Use mnemonic devices and rhymes'
        ]
      },
      {
        code: 'kinesthetic',
        name: 'Kinesthetic Learner',
        description: 'Learns best through physical activity and hands-on experiences.',
        preferences: [
          'Hands-on activities and experiments',
          'Physical movement during learning',
          'Real-world applications',
          'Building and manipulating objects',
          'Learning by doing'
        ],
        teaching_strategies: [
          'Incorporate physical activities',
          'Use hands-on experiments',
          'Allow movement during learning',
          'Create real-world applications',
          'Include role-playing and simulations'
        ]
      },
      {
        code: 'reading_writing',
        name: 'Reading/Writing Learner',
        description: 'Learns best through reading and writing information.',
        preferences: [
          'Reading textbooks and articles',
          'Taking detailed notes',
          'Writing summaries and reports',
          'Making lists',
          'Working with written information'
        ],
        teaching_strategies: [
          'Provide reading materials',
          'Encourage note-taking',
          'Assign writing tasks',
          'Use written instructions',
          'Create text-based summaries'
        ]
      },
      {
        code: 'multimodal',
        name: 'Multimodal Learner',
        description: 'Uses a combination of learning styles depending on the context.',
        preferences: [
          'Varied learning approaches',
          'Multiple forms of information presentation',
          'Flexibility in learning methods',
          'Combining different learning activities',
          'Adapting to different teaching styles'
        ],
        teaching_strategies: [
          'Use mixed methods of instruction',
          'Provide information in multiple formats',
          'Incorporate various learning activities',
          'Allow choice in learning approaches',
          'Combine visual, auditory, and kinesthetic elements'
        ]
      }
    ];
  }
  
  /**
   * Analyze team compatibility based on personality types
   * @param {Array} memberTypes - Array of team member personality types
   * @returns {Object} - Compatibility analysis
   */
  static analyzeTeamCompatibility(memberTypes) {
    try {
      const personalityTypes = this.getPersonalityTypes();
      const typeMap = {};
      
      // Create a map of personality types for easy lookup
      personalityTypes.forEach(type => {
        typeMap[type.code] = type;
      });
      
      // Count personality dimensions
      const dimensions = {
        extrovert: 0,
        introvert: 0,
        sensing: 0,
        intuitive: 0,
        thinking: 0,
        feeling: 0,
        judging: 0,
        perceiving: 0
      };
      
      // Analyze each member's type
      memberTypes.forEach(type => {
        if (!type || typeof type !== 'string' || type.length !== 4) return;
        
        // Count dimensions
        if (type[0] === 'E') dimensions.extrovert++;
        if (type[0] === 'I') dimensions.introvert++;
        if (type[1] === 'S') dimensions.sensing++;
        if (type[1] === 'N') dimensions.intuitive++;
        if (type[2] === 'T') dimensions.thinking++;
        if (type[2] === 'F') dimensions.feeling++;
        if (type[3] === 'J') dimensions.judging++;
        if (type[3] === 'P') dimensions.perceiving++;
      });
      
      // Calculate team balance
      const totalMembers = memberTypes.length;
      const balance = {
        ei: dimensions.extrovert / totalMembers, // 0 = all introvert, 1 = all extrovert
        sn: dimensions.sensing / totalMembers, // 0 = all intuitive, 1 = all sensing
        tf: dimensions.thinking / totalMembers, // 0 = all feeling, 1 = all thinking
        jp: dimensions.judging / totalMembers // 0 = all perceiving, 1 = all judging
      };
      
      // Identify strengths and potential challenges
      const strengths = [];
      const challenges = [];
      
      // EI dimension analysis
      if (balance.ei >= 0.3 && balance.ei <= 0.7) {
        strengths.push('Balance between reflection (introversion) and action (extroversion)');
      } else if (balance.ei < 0.3) {
        strengths.push('Strong reflective and deep-thinking capacity');
        challenges.push('May struggle with quick decision-making and team communication');
      } else {
        strengths.push('High energy and external focus');
        challenges.push('May lack sufficient reflection time and depth');
      }
      
      // SN dimension analysis
      if (balance.sn >= 0.3 && balance.sn <= 0.7) {
        strengths.push('Balance between practical details (sensing) and big-picture thinking (intuition)');
      } else if (balance.sn < 0.3) {
        strengths.push('Strong conceptual and future-oriented thinking');
        challenges.push('May overlook important practical details');
      } else {
        strengths.push('Practical and detail-oriented approach');
        challenges.push('May miss long-term implications and possibilities');
      }
      
      // TF dimension analysis
      if (balance.tf >= 0.3 && balance.tf <= 0.7) {
        strengths.push('Balance between logical analysis (thinking) and people considerations (feeling)');
      } else if (balance.tf < 0.3) {
        strengths.push('Strong focus on harmony and people\'s needs');
        challenges.push('May avoid necessary critical feedback and tough decisions');
      } else {
        strengths.push('Logical and analytical approach to problems');
        challenges.push('May overlook emotional impacts and team dynamics');
      }
      
      // JP dimension analysis
      if (balance.jp >= 0.3 && balance.jp <= 0.7) {
        strengths.push('Balance between structure (judging) and flexibility (perceiving)');
      } else if (balance.jp < 0.3) {
        strengths.push('Adaptable and open to new information');
        challenges.push('May struggle with deadlines and definitive decisions');
      } else {
        strengths.push('Structured and organized approach');
        challenges.push('May resist changes and new information');
      }
      
      // Missing type analysis
      const typeFrequency = {};
      memberTypes.forEach(type => {
        typeFrequency[type] = (typeFrequency[type] || 0) + 1;
      });
      
      // Check for complementary type gaps
      const allTypes = Object.keys(typeMap);
      const missingTypes = allTypes.filter(type => !typeFrequency[type]);
      
      // Find most valuable missing types to add
      const missingTypeValues = {};
      missingTypes.forEach(type => {
        // Calculate how well this type would complement the existing team
        let complementValue = 0;
        
        // Higher value for types that balance the dimensions
        if (type[0] === 'E' && balance.ei < 0.5) complementValue += 2;
        if (type[0] === 'I' && balance.ei > 0.5) complementValue += 2;
        if (type[1] === 'S' && balance.sn < 0.5) complementValue += 2;
        if (type[1] === 'N' && balance.sn > 0.5) complementValue += 2;
        if (type[2] === 'T' && balance.tf < 0.5) complementValue += 2;
        if (type[2] === 'F' && balance.tf > 0.5) complementValue += 2;
        if (type[3] === 'J' && balance.jp < 0.5) complementValue += 2;
        if (type[3] === 'P' && balance.jp > 0.5) complementValue += 2;
        
        missingTypeValues[type] = complementValue;
      });
      
      // Sort missing types by value
      const recommendedTypes = Object.entries(missingTypeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
      
      return {
        team_size: totalMembers,
        type_distribution: typeFrequency,
        dimension_balance: {
          extrovert_introvert: `${Math.round(balance.ei * 100)}% E / ${Math.round((1 - balance.ei) * 100)}% I`,
          sensing_intuition: `${Math.round(balance.sn * 100)}% S / ${Math.round((1 - balance.sn) * 100)}% N`,
          thinking_feeling: `${Math.round(balance.tf * 100)}% T / ${Math.round((1 - balance.tf) * 100)}% F`,
          judging_perceiving: `${Math.round(balance.jp * 100)}% J / ${Math.round((1 - balance.jp) * 100)}% P`
        },
        strengths,
        challenges,
        recommended_types: recommendedTypes.map(type => ({
          type: type,
          name: typeMap[type]?.name || 'Unknown',
          description: typeMap[type]?.description || 'No description available'
        }))
      };
    } catch (error) {
      console.error('Failed to analyze team compatibility:', error);
      throw error;
    }
  }
  
  /**
   * Recommend module learning approaches based on personality type
   * @param {string} personalityType - MBTI personality type
   * @param {string} learningStyle - Learning style preference
   * @returns {Object} - Learning recommendations
   */
  static getLearningRecommendations(personalityType, learningStyle) {
    try {
      const personalityTypes = this.getPersonalityTypes();
      const learningStyles = this.getLearningStyles();
      
      // Find matching personality type
      const personality = personalityTypes.find(type => type.code === personalityType);
      
      // Find matching learning style
      const learning = learningStyles.find(style => style.code === learningStyle);
      
      // Default recommendations if no matches found
      const defaultRecommendations = {
        environment_preferences: [
          'Quiet, organized study space',
          'Regular study schedule',
          'Balance between independent and group learning'
        ],
        content_approach: [
          'Mix of theoretical and practical content',
          'Clearly structured learning materials',
          'Regular opportunities for application'
        ],
        collaboration_tips: [
          'Communicate your learning preferences to teammates',
          'Recognize and respect different learning approaches',
          'Take breaks when needed to process information'
        ]
      };
      
      // If no personality type or learning style found, return defaults
      if (!personality && !learning) {
        return {
          personality_type: 'Unknown',
          learning_style: 'Unknown',
          ...defaultRecommendations
        };
      }
      
      // Combine personality and learning style recommendations
      const recommendations = {
        personality_type: personality ? 
          { code: personality.code, name: personality.name, description: personality.description } : 
          'Unknown',
        learning_style: learning ? 
          { code: learning.code, name: learning.name, description: learning.description } : 
          'Unknown',
        environment_preferences: [
          ...(personality ? personality.learning_preferences.slice(0, 2) : []),
          ...(learning ? learning.preferences.slice(0, 2) : [])
        ],
        content_approach: [
          ...(personality ? personality.learning_preferences.slice(2, 4) : []),
          ...(learning ? learning.preferences.slice(2, 4) : [])
        ],
        collaboration_tips: [
          ...(personality ? personality.teamwork_traits.slice(0, 2) : []),
          'Leverage your strengths in team learning environments',
          'Be aware of your learning preferences when collaborating'
        ],
        teaching_strategies: learning ? learning.teaching_strategies : []
      };
      
      return recommendations;
    } catch (error) {
      console.error('Failed to get learning recommendations:', error);
      throw error;
    }
  }
}

module.exports = UserPersonality;