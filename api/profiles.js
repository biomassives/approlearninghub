// /api/profiles.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticate, authorize } = require('./middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lattice security method as per requirements
const applyLatticeMethod = (profileData) => {
  // Strip sensitive data and apply security transformations
  if (!profileData) return null;
  
  // Deep copy to avoid mutations
  const secureData = JSON.parse(JSON.stringify(profileData));
  
  // Remove any sensitive fields
  delete secureData.internal_notes;
  delete secureData.admin_flags;
  
  return secureData;
};

/**
 * Get current user's profile
 * Protected endpoint
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // First check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      // Real error, not just "no rows returned"
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        error: profileError.message
      });
    }
    
    // If profile doesn't exist, fetch user info and create a basic profile
    if (!existingProfile) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', req.user.id)
        .single();
      
      if (userError) {
        console.error('User fetch error:', userError);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve user data',
          error: userError.message
        });
      }
      
      // Create basic profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            eco_points: 0,
            created_at: new Date(),
            updated_at: new Date()
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('Profile creation error:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create profile',
          error: createError.message
        });
      }
      
      // Apply lattice security method
      const secureProfileData = applyLatticeMethod(newProfile);
      
      return res.json({
        success: true,
        profile: secureProfileData
      });
    }
    
    // Apply lattice security method
    const secureProfileData = applyLatticeMethod(existingProfile);
    
    // Get EcoOps/checkins count
    const { count: ecoPointsCount, error: ecoError } = await supabase
      .from('eco_ops_checkins')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);
    
    if (!ecoError) {
      secureProfileData.ecoActivitiesCount = ecoPointsCount || 0;
    }
    
    // Get wallet if exists
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_primary', true)
      .single();
    
    if (!walletError && wallet) {
      secureProfileData.hasWallet = true;
      secureProfileData.wallet_type = wallet.wallet_type;
    } else {
      secureProfileData.hasWallet = false;
    }
    
    return res.json({
      success: true,
      profile: secureProfileData
    });
    
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Update current user's profile
 * Protected endpoint
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const {
      username,
      name,
      avatar_url,
      bio,
      projects,
      learning_path
    } = req.body;
    
    // Check for username uniqueness if changing it
    if (username) {
      const { data: existingUser, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', req.user.id)
        .limit(1);
      
      if (!usernameError && existingUser && existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }
    
    // Update profile
    const updates = {
      updated_at: new Date()
    };
    
    // Only add defined fields to update
    if (username !== undefined) updates.username = username;
    if (name !== undefined) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (bio !== undefined) updates.bio = bio;
    if (projects !== undefined) updates.projects = projects;
    if (learning_path !== undefined) updates.learning_path = learning_path;
    
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
    
    // Apply lattice security method
    const secureProfileData = applyLatticeMethod(updatedProfile);
    
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: secureProfileData
    });
    
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get user profile by ID
 * Protected endpoint
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    // Apply lattice security method
    const secureProfileData = applyLatticeMethod(profile);
    
    // Only show detailed info to admins or the owner
    if (req.user.role !== 'admin' && req.user.id !== id) {
      // Public profile info only
      return res.json({
        success: true,
        profile: {
          id: secureProfileData.id,
          username: secureProfileData.username,
          name: secureProfileData.name,
          avatar_url: secureProfileData.avatar_url,
          bio: secureProfileData.bio,
          eco_points: secureProfileData.eco_points
        }
      });
    }
    
    return res.json({
      success: true,
      profile: secureProfileData
    });
    
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Get ECO Ops checkins for a user
 * Protected endpoint
 */
router.get('/me/eco-ops', authenticate, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // Fetch user's eco activities
    const { data: activities, error } = await supabase
      .from('eco_ops_checkins')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Eco ops fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve eco activities',
        error: error.message
      });
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('eco_ops_checkins')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);
    
    if (countError) {
      console.error('Count query error:', countError);
    }
    
    return res.json({
      success: true,
      activities,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (err) {
    console.error('Eco ops fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

/**
 * Add ECO Ops checkin
 * Protected endpoint
 */
router.post('/me/eco-ops', authenticate, async (req, res) => {
  try {
    const {
      activity_type,
      description,
      evidence_url
    } = req.body;
    
    if (!activity_type) {
      return res.status(400).json({
        success: false,
        message: 'Activity type is required'
      });
    }
    
    // Default points based on activity type
    let points_earned = 5; // Default
    
    switch (activity_type) {
      case 'workshop':
        points_earned = 20;
        break;
      case 'recycling':
        points_earned = 10;
        break;
      case 'sustainable_transport':
        points_earned = 15;
        break;
      case 'tree_planting':
        points_earned = 30;
        break;
      case 'energy_saving':
        points_earned = 15;
        break;
      default:
        points_earned = 5;
    }
    
    // Add eco ops checkin
    const { data: newActivity, error } = await supabase
      .from('eco_ops_checkins')
      .insert([
        {
          user_id: req.user.id,
          activity_type,
          description,
          evidence_url,
          points_earned,
          verified: false,
          created_at: new Date()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Eco ops creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add eco activity',
        error: error.message
      });
    }
    
    // Update user's eco points
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('eco_points')
      .eq('id', req.user.id)
      .single();
    
    if (!profileError) {
      const currentPoints = profile.eco_points || 0;
      const newPoints = currentPoints + points_earned;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ eco_points: newPoints, updated_at: new Date() })
        .eq('id', req.user.id);
      
      if (updateError) {
        console.error('Profile update error:', updateError);
      }
    }
    
    return res.status(201).json({
      success: true,
      message: 'Eco activity added successfully',
      activity: newActivity,
      points_earned
    });
    
  } catch (err) {
    console.error('Eco ops creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

module.exports = router;