const express = require('express');

const router = express.Router();
const { authenticate, authorize } = require('./middleware/auth');

const supabase = require('./lib/supabaseClient');



// Protect all admin routes.  Assuming this middleware checks for admin role.
router.use(authenticate({ required: true, roles: ['admin'] })); // secure

// Lattice security method
const applyLatticeMethod = (profileData) => {
  if (!profileData) return null;

  const secureData = { ...profileData }; // Use spread for shallow copy
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
    const userId = req.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Profile doesn't exist.  Handle this case.
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, role, created_at')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('User fetch error:', userError);
          return res.status(500).json({
            success: false,
            message: 'Failed to retrieve user data',
            error: userError.message,
          });
        }

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              username: user.email.split('@')[0],
              eco_points: 0,
              created_at: user.created_at, // Use user's created_at
              updated_at: new Date(),
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Profile creation error:', createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create profile',
            error: createError.message,
          });
        }

        const secureProfileData = applyLatticeMethod(newProfile);
        return res.json({ success: true, profile: secureProfileData });
      } else {
        // A real error occurred.
        console.error('Profile fetch error:', profileError);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve profile',
          error: profileError.message,
        });
      }
    }

    const secureProfileData = applyLatticeMethod(profile);

    // Get EcoOps/checkins count
    const { count: ecoPointsCount, error: ecoError } = await supabase
      .from('eco_ops_checkins')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (ecoError) {
      console.error('Eco ops count error:', ecoError);
      //  Consider whether this is a critical error or not.  If not, you might
      //  want to continue without this data, but log the error.
    }

    secureProfileData.ecoActivitiesCount = ecoPointsCount || 0;

    // Get wallet if exists
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!walletError && wallet) {
      secureProfileData.hasWallet = true;
      secureProfileData.wallet_type = wallet.wallet_type;
    } else if (walletError && walletError.code !== 'PGRST116') {
      console.error('Wallet fetch error:', walletError);
      //  Decide:  Is this a critical error?
    } else {
      secureProfileData.hasWallet = false; //  explicitly set hasWallet
    }

    return res.json({ success: true, profile: secureProfileData });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
});

/**
 * Update current user's profile
 * Protected endpoint
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, name, avatar_url, bio, projects, learning_path } = req.body;

    // Check for username uniqueness if changing it
    if (username) {
      const { data: existingUser, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .limit(1);

      if (usernameError) {
        console.error('Username check error:', usernameError);
        return res.status(500).json({ //  Important:  Return on error
          success: false,
          message: 'Failed to check username',
          error: usernameError.message,
        });
      }

      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken',
        });
      }
    }

    const updates = { updated_at: new Date() };
    if (username !== undefined) updates.username = username;
    if (name !== undefined) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (bio !== undefined) updates.bio = bio;
    if (projects !== undefined) updates.projects = projects;
    if (learning_path !== undefined) updates.learning_path = learning_path;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message,
      });
    }

    const secureProfileData = applyLatticeMethod(updatedProfile);
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: secureProfileData,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
       if(error.code === 'PGRST116'){
         return res.status(404).json({
            success: false,
            message: 'Profile not found'
          });
       }
      console.error('Profile fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message,
      });
    }

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
          eco_points: secureProfileData.eco_points,
        },
      });
    }

    return res.json({ success: true, profile: secureProfileData });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
});

/**
 * Get ECO Ops checkins for a user
 * Protected endpoint
 */
router.get('/me/eco-ops', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const { data: activities, error } = await supabase
      .from('eco_ops_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Eco ops fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve eco activities',
        error: error.message,
      });
    }

    const { count, error: countError } = await supabase
      .from('eco_ops_checkins')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (countError) {
      console.error('Count query error:', countError);
      //  Consider whether to fail the request if count fails.
    }

    return res.json({
      success: true,
      activities,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Eco ops fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
});

/**
 * Add ECO Ops checkin
 * Protected endpoint
 */
router.post('/me/eco-ops', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activity_type, description, evidence_url } = req.body;

    if (!activity_type) {
      return res.status(400).json({
        success: false,
        message: 'Activity type is required',
      });
    }

    let points_earned = 5;
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

    const { data: newActivity, error } = await supabase
      .from('eco_ops_checkins')
      .insert([
        {
          user_id: userId,
          activity_type,
          description,
          evidence_url,
          points_earned,
          verified: false,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Eco ops creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add eco activity',
        error: error.message,
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('eco_points')
      .eq('id', userId)
      .single();

    if (!profileError) {
      const currentPoints = profile.eco_points || 0;
      const newPoints = currentPoints + points_earned;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ eco_points: newPoints, updated_at: new Date() })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        //  Consider:  Is this a critical error?
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Eco activity added successfully',
      activity: newActivity,
      points_earned,
    });
  } catch (error) {
    console.error('Eco ops creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
});

module.exports = router;
