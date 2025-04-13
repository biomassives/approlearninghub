// api/index.js - Main API Router
const express = require('express');
const path = require('path');
const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Import API handlers
const loginHandler = require('./auth/login');
const verifyHandler = require('./auth/verify');
const updateLatticeHandler = require('./auth/update-lattice');
const logoutHandler = require('./auth/logout');
const userDataHandler = require('./auth/user-data');
const userRoleHandler = require('./auth/user-role');

// Set up routes
app.all('/api/auth/login', (req, res) => loginHandler(req, res));
app.all('/api/auth/verify', (req, res) => verifyHandler(req, res));
app.all('/api/auth/update-lattice', (req, res) => updateLatticeHandler(req, res));
app.all('/api/auth/logout', (req, res) => logoutHandler(req, res));
app.all('/api/auth/user-data', (req, res) => userDataHandler(req, res));
app.all('/api/auth/user-role', (req, res) => userRoleHandler(req, res));

// Root API route
app.get('/api', (req, res) => {
  res.json({ message: 'ApproVideo API is running' });
});

// Handle 404s for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export the serverless function handler
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Pass the request to the Express app
  return app(req, res);
};