// /api/index.js

require('dotenv').config();
console.log('▶️ Loaded env:', {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: !!process.env.JWT_SECRET
});

const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const serverless = require('serverless-http');

const { createError, errorHandler, notFoundHandler } = require('./utils/error');

// Create Express app instance
const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://i.ytimg.com", "https://img.youtube.com"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
      frameSrc: ["'self'", "https://www.youtube.com"],
      mediaSrc: ["'self'", "https://www.youtube.com"]
    }
  }
}));

// Global Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Use the error handling middleware:



// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://hub.approvideo.org'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl !== '/health') {
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });
  next();
});

// Load auth middleware
const { authenticate } = require('./middleware/auth');

// Load routes
const authRouter = require('./routes/auth');
const clinicsRouter = require('./clinics');
const tagsRouter = require('./tags');
const feedsRouter = require('./routes/feeds'); 
const trainingModulesRouter = require('./training-modules');
//const eventRouter = require('./routes/events');
const profilesRouter = require('./profiles');
const videosRouter = require('./videos');
const categoriesRouter = require('./categories');
const integrationsRouter = require('./integrations');

const docAndZipRouter = require('./docandziprouter');

// Public API routes (no authentication required)
app.use('/auth', authRouter);



app.use('/clinics', clinicsRouter);

app.use((req, res, next) => {
  console.log(`>>> Request received in index.js: ${req.method} ${req.path}`);
  next();
});

// Your existing line
app.use('/tags', tagsRouter)

app.use('/videos', videosRouter);
app.use('/categories', categoriesRouter);
app.use('/feeds', feedsRouter);
app.use('/training', trainingModulesRouter);

// Protected API routes (authentication required)
app.use('/profiles', authenticate, profilesRouter);
//app.use('/api/events', eventRouter);
app.use('/integrations', authenticate, integrationsRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation
app.get('/docs', (req, res) => {
  res.status(200).json({
    message: 'ApproVideo Hub API Documentation',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        accessCheck: 'GET /api/auth/access-check'
      },
      videos: {
        list: 'GET /api/videos',
        featured: 'GET /api/videos/featured',
        byCategory: 'GET /api/videos/category/:slug',
        search: 'GET /api/videos/search?q=:query'
      },
      profiles: {
        me: 'GET /api/profiles/me',
        update: 'PUT /api/profiles/me'
      },
      integrations: {
        list: 'GET /api/integrations',
        settings: 'GET /api/integrations/settings',
        zoomTemplates: 'GET /api/integrations/zoom-templates'
      }
      // Add more documentation as needed
    }
  });
});

app.use('/api', docAndZipRouter);   // output managed docs and zip file archives


app.use('*', notFoundHandler);



// Add error handling middleware
app.use(errorHandler);

/*
console.log('DEBUG: Checking notFoundHandler:', typeof notFoundHandler);
console.log('DEBUG: Checking errorHandler:', typeof errorHandler);
// Add error handling and 404 handlers
app.use(notFoundHandler);
app.use(errorHandler);
*/





module.exports = app;