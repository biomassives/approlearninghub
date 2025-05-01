// api/clinics.js
const express = require('express');
const router = express.Router();
const { db } = require('./utils/db');
const { createError } = require('./utils/error');

/**
 * List all clinics with optional filters
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const listClinics = async (req, res, next) => {
  try {
    // Extract query parameters
    const filters = {
      status: req.query.status,
      location: req.query.location,
      instructor: req.query.instructor
    };

    // Clean undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    // Get clinics from database
    const clinics = await db.clinics.findAll(filters);

    res.json(clinics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get clinic by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getClinic = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createError(400, 'Clinic ID is required');
    }

    // Get clinic from database
    const clinic = await db.clinics.findById(id);

    if (!clinic) {
      throw createError(404, `Clinic with ID ${id} not found`);
    }

    res.json(clinic);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new clinic
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const createClinic = async (req, res, next) => {
  try {
    // Validate required fields
    const { name, description, location, instructor, date } = req.body;

    if (!name || !description || !location || !instructor || !date) {
      throw createError(400, 'Missing required fields');
    }

    // Check if supabase is available
    if (!db.supabase) {
      throw createError(503, 'Database service is currently unavailable');
    }

    // Create clinic in database
    const { data, error } = await db.supabase
      .from('clinics')
      .insert([req.body])
      .select()
      .single();

    if (error) {
      throw createError(500, error.message);
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing clinic
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const updateClinic = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createError(400, 'Clinic ID is required');
    }

    // Check if clinic exists
    const existingClinic = await db.clinics.findById(id);

    if (!existingClinic) {
      throw createError(404, `Clinic with ID ${id} not found`);
    }

    // Check if supabase is available
    if (!db.supabase) {
      throw createError(503, 'Database service is currently unavailable');
    }

    // Update clinic in database
    const { data, error } = await db.supabase
      .from('clinics')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw createError(500, error.message);
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete clinic
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const deleteClinic = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createError(400, 'Clinic ID is required');
    }

    // Check if clinic exists
    const existingClinic = await db.clinics.findById(id);

    if (!existingClinic) {
      throw createError(404, `Clinic with ID ${id} not found`);
    }

    // Check if supabase is available
    if (!db.supabase) {
      throw createError(503, 'Database service is currently unavailable');
    }

    // Delete clinic from database
    const { error } = await db.supabase
      .from('clinics')
      .delete()
      .eq('id', id);

    if (error) {
      throw createError(500, error.message);
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// Define your routes and associate them with the handler functions
router.get('/', listClinics);
router.get('/:id', getClinic);
router.post('/', createClinic);
router.put('/:id', updateClinic);
router.delete('/:id', deleteClinic);

// Export the router
module.exports = router;