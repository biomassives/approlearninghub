const { createError } = require('../utils/error'); // Import your error utility
const db = require('../utils/db'); // Import your database connection/query utility

const trainingModulesController = {
  /**
   * Lists all training modules (public)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  listModules: async (req, res, next) => {
    try {
      // Example: Fetch modules from the database
      const query = 'SELECT * FROM training_modules WHERE is_published = true';
      const modules = await db.query(query); // Use your database query function
      res.status(200).json({ success: true, modules });
    } catch (error) {
      next(error); // Pass error to your error handler
    }
  },

  /**
   * Retrieves a single training module (public)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getModule: async (req, res, next) => {
    try {
      const { id } = req.params;
      const query = 'SELECT * FROM training_modules WHERE id = $1 AND is_published = true';
      const values = [id];
      const module = await db.query(query, values); // Use your database query function

      if (!module || module.length === 0) {
        throw createError(404, 'Module not found');
      }

      res.status(200).json({ success: true, module: module[0] });
    } catch (error) {
      next(error); // Pass error to your error handler
    }
  },

  /**
   * Creates a new training module (protected, admin/instructor)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createModule: async (req, res, next) => {
    try {
      //  Check user role (assuming it's in req.user from the authenticate middleware)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        throw createError(403, 'Unauthorized');
      }

      const { title, description, content, is_published } = req.body; //  Extract data

      //  Validate data (use a library like Joi for more robust validation)
      if (!title || !description || !content) {
        throw createError(400, 'Title, description, and content are required');
      }

      // Example: Insert the new module into the database
      const query = `
        INSERT INTO training_modules (title, description, content, is_published)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [title, description, content, is_published || false]; //  default
      const newModule = await db.query(query, values); // Use your database query

      res.status(201).json({ success: true, message: 'Module created', module: newModule[0] });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Updates an existing training module (protected, admin/instructor)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateModule: async (req, res, next) => {
    try {
      //  Check user role
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        throw createError(403, 'Unauthorized');
      }

      const { id } = req.params;
      const { title, description, content, is_published } = req.body;

       // Validate data
      if (!title || !description || !content) {
        throw createError(400, 'Title, description, and content are required');
      }

      // Example: Update the module in the database
      const query = `
        UPDATE training_modules
        SET title = $1, description = $2, content = $3, is_published = $4
        WHERE id = $5
        RETURNING *
      `;
      const values = [title, description, content, is_published, id];
      const updatedModule = await db.query(query, values); // Use your database query

      if (!updatedModule || updatedModule.length === 0) {
        throw createError(404, 'Module not found');
      }

      res.status(200).json({ success: true, message: 'Module updated', module: updatedModule[0] });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Deletes a training module (protected, admin/instructor)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteModule: async (req, res, next) => {
    try {
      //  Check user role
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        throw createError(403, 'Unauthorized');
      }

      const { id } = req.params;

      //  Delete the module
      const query = 'DELETE FROM training_modules WHERE id = $1 RETURNING *';
      const values = [id];
      const deletedModule = await db.query(query, values); // Use your database query

      if (!deletedModule || deletedModule.length === 0) {
        throw createError(404, 'Module not found');
      }

      res.status(200).json({ success: true, message: 'Module deleted', module: deletedModule[0] });
    } catch (error) {
      next(error);
    }
  },

  /**
    * Get all modules a user is enrolled in
    * @param {Object} req - Express request object
    * @param {Object} res - Express response object
    * @param {Function} next - Express next function
    */
  getUserModules: async (req, res, next) => {
    try {
      const userId = req.params.userId || req.user.id; // Use userId if provided (for admin), otherwise use current user
      // get user modules
      const query = `
        SELECT tm.*
        FROM training_modules AS tm
        JOIN user_modules AS um ON tm.id = um.module_id
        WHERE um.user_id = $1;
      `;
      const values = [userId];
      const modules = await db.query(query, values);

      res.status(200).json({ success: true, modules });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all modules a user has completed
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCompletedModules: async (req, res, next) => {
    try {
       const userId = req.params.userId || req.user.id;
      const query = `
        SELECT tm.*
        FROM training_modules AS tm
        JOIN user_modules AS um ON tm.id = um.module_id
        WHERE um.user_id = $1 AND um.is_completed = true;
      `;
      const values = [userId];
      const modules = await db.query(query, values);

      res.status(200).json({ success: true, modules });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a user's total points
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getUserPoints: async (req, res, next) => {
    try {
      const userId = req.params.userId || req.user.id;
      const query = 'SELECT SUM(points) AS total_points FROM user_modules WHERE user_id = $1';
      const values = [userId];
      const result = await db.query(query, values);
      const totalPoints = result[0]?.total_points || 0; // Handle null case

      res.status(200).json({ success: true, totalPoints });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Tracks a user's progress in a module
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  trackProgress: async (req, res, next) => {
    try {
      const { id: moduleId } = req.params;
      const { progress } = req.body;
      const userId = req.user.id;

      //  Validate progress
      if (progress === undefined || progress < 0 || progress > 100) {
        throw createError(400, 'Invalid progress value');
      }

      //  Update or insert progress
        const query = `
          INSERT INTO user_modules (user_id, module_id, progress)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, module_id) DO UPDATE
          SET progress = $3
          RETURNING *;
        `;
        const values = [userId, moduleId, progress];
        const result = await db.query(query, values);
        const updatedProgress = result[0];


      res.status(200).json({ success: true, message: 'Progress tracked', updatedProgress });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Marks a module as completed for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  markCompleted: async (req, res, next) => {
    try {
      const { id: moduleId } = req.params;
      const userId = req.user.id;

      //  Update completion status
      const query = `
        INSERT INTO user_modules (user_id, module_id, is_completed, completed_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (user_id, module_id) DO UPDATE
        SET is_completed = true, completed_at = NOW()
        RETURNING *;
      `;
      const values = [userId, moduleId];
      const result = await db.query(query, values);
      const updatedCompletion = result[0];


      res.status(200).json({ success: true, message: 'Module marked as completed', updatedCompletion });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = trainingModulesController;
