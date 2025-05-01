// api/utils/db.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SERVICE_ROLE_KEY;

// Initialize Supabase client
let supabase = null;

// Local data cache for offline/fallback scenarios
const localData = {
  clinics: null,
  courses: null,
  users: null
};

/**
 * Initialize database connection
 */
const initDatabase = () => {
  try {
    // Initialize Supabase client if environment variables are available
    if (SUPABASE_URL && SUPABASE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('Supabase client initialized');
    } else {
      console.warn('Supabase credentials not found, using local data only');
    }
    
    // Load local data for fallback
    loadLocalData();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

/**
 * Load local JSON data for fallback scenarios
 */
const loadLocalData = () => {
  try {
    // Define paths to local data files
    const dataDir = path.join(__dirname, '../../public/data');
    
    // Load clinics data
    const clinicsPath = path.join(dataDir, 'clinics.json');
    if (fs.existsSync(clinicsPath)) {
      const clinicsData = JSON.parse(fs.readFileSync(clinicsPath, 'utf8'));
      localData.clinics = clinicsData.clinics;
    }
    
    // Load courses data
    const coursesPath = path.join(dataDir, 'courses.json');
    if (fs.existsSync(coursesPath)) {
      const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
      localData.courses = coursesData.courses;
    }
    
    // Load users data (for authentication)
    const usersPath = path.join(dataDir, 'users.json');
    if (fs.existsSync(usersPath)) {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      localData.users = usersData.users;
    }
    
    console.log('Local data loaded successfully');
  } catch (error) {
    console.error('Failed to load local data:', error);
  }
};

/**
 * Database interface with Supabase fallback to local data
 */
const db = {
  /**
   * Clinics table operations
   */
  clinics: {
    /**
     * Find all clinics with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - List of clinics
     */
    async findAll(filters = {}) {
      try {
        if (supabase) {
          let query = supabase.from('clinics').select('*');
          
          // Apply filters
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
          
          const { data, error } = await query;
          
          if (error) throw error;
          return data;
        }
        
        // Fallback to local data
        if (localData.clinics) {
          let result = [...localData.clinics];
          
          // Apply simple filters
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              result = result.filter(item => item[key] === value);
            }
          });
          
          return result;
        }
        
        return [];
      } catch (error) {
        console.error('Error finding clinics:', error);
        
        // Last resort fallback
        return localData.clinics || [];
      }
    },
    
    /**
     * Find clinic by ID
     * @param {string} id - Clinic ID
     * @returns {Promise<Object|null>} - Clinic data or null
     */
    async findById(id) {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return data;
        }
        
        // Fallback to local data
        if (localData.clinics) {
          return localData.clinics.find(clinic => clinic.id === id) || null;
        }
        
        return null;
      } catch (error) {
        console.error(`Error finding clinic with ID ${id}:`, error);
        
        // Last resort fallback
        if (localData.clinics) {
          return localData.clinics.find(clinic => clinic.id === id) || null;
        }
        
        return null;
      }
    }
  },
  
  /**
   * Courses table operations
   */
  courses: {
    /**
     * Find all courses with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - List of courses
     */
    async findAll(filters = {}) {
      try {
        if (supabase) {
          let query = supabase.from('courses').select('*');
          
          // Apply filters
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
          
          const { data, error } = await query;
          
          if (error) throw error;
          return data;
        }
        
        // Fallback to local data
        if (localData.courses) {
          let result = [...localData.courses];
          
          // Apply simple filters
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              result = result.filter(item => item[key] === value);
            }
          });
          
          return result;
        }
        
        return [];
      } catch (error) {
        console.error('Error finding courses:', error);
        
        // Last resort fallback
        return localData.courses || [];
      }
    },
    
 /**
 * Find course by ID
 * @param {string} id - Course ID
 * @returns {Promise<Object|null>} - Course data or null
 */
async findById(id) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
    
    // Fallback to local data
    if (localData.courses) {
      return localData.courses.find(course => course.id === id) || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding course with ID ${id}:`, error);
    
    // Last resort fallback
    if (localData.courses) {
      return localData.courses.find(course => course.id === id) || null;
    }
    
    return null;
  }
}
},

/**
 * Users table operations
 */
users: {
  /**
   * Find user by email
   */
  async findOne(query) {
    if (!query.email) throw new Error('Email is required');
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', query.email)
          .maybeSingle(); // Use maybeSingle() instead of single()
        
        if (error) throw error;
        return data; // This will be null if no user is found
      } catch (error) {
        console.error('Database query error:', error);
        return null; // Return null instead of throwing an error
      }
    }
    
    // Local fallback
    return localData.users?.find(u => u.email === query.email) || null;
  },

  /**
   * Insert new user
   */
  async insert({ email, password, name, role = 'student' }) {
    if (!supabase) throw new Error('Supabase not initialized');
    
    try {
      // Remove the .maybesingle() method which is causing issues
      const { data, error } = await supabase
        .from('users')
        .insert([{ email, password, name, role }])
        .select('id, email, name, role');
        
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      // Check that data exists and has at least one row
      if (!data || data.length === 0) {
        throw new Error('User insert returned no data');
      }
      
      // Return the first inserted user
      return data[0];
    } catch (error) {
      console.error('Error in users.insert:', error);
      throw error;
    }
  }
}
}


// Initialize database on module load
initDatabase();

// Export database interface
module.exports = {
  db,
  supabase
};