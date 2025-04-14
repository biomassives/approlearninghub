// setup-test-users.js
// Script to create test users in Supabase for auth testing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations

// Test user accounts for different roles
const TEST_USERS = {
  viewer: {
    email: 'viewer@approvideotest.org',
    password: 'viewerPassword123!',
    role: 'viewer'
  },
  editor: {
    email: 'editor@approvideotest.org',
    password: 'editorPassword123!',
    role: 'editor'
  },
  expert: {
    email: 'expert@approvideotest.org',
    password: 'expertPassword123!',
    role: 'expert'
  },
  admin: {
    email: 'admin@approvideotest.org',
    password: 'adminPassword123!',
    role: 'admin'
  },
  developer: {
    email: 'developer@approvideotest.org',
    password: 'developerPassword123!',
    role: 'developer'
  }
};

async function setupTestUsers() {
  console.log('Setting up test users in Supabase...');
  
  // Check if Supabase configuration is available
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('⚠️ Missing Supabase configuration. Please check your .env file.');
    console.error('Required variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  
  // Initialize Supabase client with service key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Check if we can connect to Supabase
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Supabase connection error: ${error.message}`);
    }
    console.log('✅ Connected to Supabase successfully');
  } catch (err) {
    console.error('⚠️ Failed to connect to Supabase:', err.message);
    process.exit(1);
  }
  
  // Create or update user_roles table if it doesn't exist
  // Note: This assumes you have the necessary database privileges
  try {
    // Check if the user_roles table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_roles')
      .single();
    
    if (tableCheckError || !tableExists) {
      console.log('Creating user_roles table...');
      
      // Create the user_roles table
      const { error: createTableError } = await supabase.rpc('create_user_roles_table', {});
      
      if (createTableError) {
        console.error('⚠️ Error creating user_roles table:', createTableError.message);
        console.log('You may need to create the user_roles table manually.');
      } else {
        console.log('✅ Created user_roles table');
      }
    } else {
      console.log('✅ user_roles table already exists');
    }
  } catch (err) {
    console.error('⚠️ Error checking/creating user_roles table:', err.message);
    console.log('You may need to create the user_roles table manually.');
  }
  
  // Function to create a test user
  async function createTestUser(role, userData) {
    console.log(`\nSetting up ${role} user...`);
    
    try {
      // Check if user exists
      const { data: userExists, error: userCheckError } = await supabase.auth.admin.listUsers();
      
      const existingUser = userExists?.users?.find(user => user.email === userData.email);
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists with ID: ${existingUser.id}`);
        
        // Check if user has the correct role
        const { data: existingRole, error: roleCheckError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', existingUser.id)
          .single();
        
        if (roleCheckError || !existingRole) {
          // User exists but doesn't have a role, so add it
          const { error: insertRoleError } = await supabase
            .from('user_roles')
            .insert([{ user_id: existingUser.id, role: userData.role }]);
          
          if (insertRoleError) {
            console.error(`⚠️ Error assigning role to existing user: ${insertRoleError.message}`);
          } else {
            console.log(`✅ Assigned role '${userData.role}' to existing user`);
          }
        } else if (existingRole.role !== userData.role) {
          // User has a different role, so update it
          const { error: updateRoleError } = await supabase
            .from('user_roles')
            .update({ role: userData.role })
            .eq('user_id', existingUser.id);
          
          if (updateRoleError) {
            console.error(`⚠️ Error updating role for user: ${updateRoleError.message}`);
          } else {
            console.log(`✅ Updated role from '${existingRole.role}' to '${userData.role}'`);
          }
        } else {
          console.log(`✅ User already has the correct role: ${userData.role}`);
        }
        
        return existingUser.id;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true
        });
        
        if (createError) {
          console.error(`⚠️ Error creating user: ${createError.message}`);
          return null;
        }
        
        console.log(`✅ Created new user: ${userData.email} with ID: ${newUser.user.id}`);
        
        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: newUser.user.id, role: userData.role }]);
        
        if (roleError) {
          console.error(`⚠️ Error assigning role to user: ${roleError.message}`);
        } else {
          console.log(`✅ Assigned role '${userData.role}' to user`);
        }
        
        return newUser.user.id;
      }
    } catch (err) {
      console.error(`⚠️ Unexpected error for ${role} user: ${err.message}`);
      return null;
    }
  }
  
  // Create all test users
  for (const [role, userData] of Object.entries(TEST_USERS)) {
    await createTestUser(role, userData);
  }
  
  console.log('\n✅ Test users setup completed!');
  console.log('\nTest user credentials:');
  
  for (const [role, userData] of Object.entries(TEST_USERS)) {
    console.log(`\n${role.toUpperCase()}:`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Password: ${userData.password}`);
    console.log(`  Role: ${userData.role}`);
  }
  
  console.log('\nThese users can now be used for automated testing of your authentication system.');
}

// Run the setup
setupTestUsers();
