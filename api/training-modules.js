// /api/routes/training-modules.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('./middleware/auth');


const trainingModulesController = require('./controllers/trainingModulesController');

/**
 * Training modules routes
 * Public routes for listing/viewing modules
 * Protected routes for managing modules and progress
 */

// Public routes
router.get('/', trainingModulesController.listModules);
router.get('/:id', trainingModulesController.getModule);

// Protected routes
router.use(authenticate); // Apply authentication to all routes below

// Module CRUD operations (admin/instructor only)
router.post('/', trainingModulesController.createModule);
router.put('/:id', trainingModulesController.updateModule);
router.delete('/:id', trainingModulesController.deleteModule);

// User progress routes
router.get('/user/modules', trainingModulesController.getUserModules);
router.get('/user/completed', trainingModulesController.getCompletedModules);
router.get('/user/points', trainingModulesController.getUserPoints);

// Individual user routes when admin is accessing other users' data
router.get('/user/:userId/modules', trainingModulesController.getUserModules);
router.get('/user/:userId/completed', trainingModulesController.getCompletedModules);
router.get('/user/:userId/points', trainingModulesController.getUserPoints);

// Progress tracking
router.post('/:id/progress', trainingModulesController.trackProgress);
router.post('/:id/complete', trainingModulesController.markCompleted);

module.exports = router;