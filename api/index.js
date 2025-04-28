// /api/index.js
require('dotenv').config();
console.log('▶️ Loaded env:', {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: !!process.env.JWT_SECRET
});

const express = require('express');
const serverless = require('serverless-http');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Requests per window
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
const clinicsRouter = require('./routes/clinics');
//const coursesRouter = require('./routes/courses');
const feedsRouter = require('./routes/feeds');
const trainingModulesRouter = require('./routes/training-modules');
const eventsRouter = require('./routes/events');
const projectsRouter = require('./routes/projects'); // Added projects router
const profilesRouter = require('./routes/profiles');
const videosRouter = require('./routes/videos');
const categoriesRouter = require('./routes/categories');
const integrationsRouter = require('./routes/integrations');

// Public API routes (no authentication required)
app.use('/api/auth', authRouter);
app.use('/api/clinics', clinicsRouter);
//app.use('/api/courses', coursesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/feeds', feedsRouter);
app.use('/api/training', trainingModulesRouter); // Some public, some protected internally

// Protected API routes (authentication required)
app.use('/api/projects', projectsRouter); // All routes protected
app.use('/api/profiles', authenticate, profilesRouter);
app.use('/api/events', eventsRouter); // Some routes public, some protected internally
app.use('/api/integrations', authenticate, integrationsRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    message: 'ApproVideo Hub API Documentation',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout'
      },
      videos: {
        list: 'GET /api/videos',
        detail: 'GET /api/videos/:id'
      },
      training: {
        list: 'GET /api/training',
        detail: 'GET /api/training/:id',
        progress: 'POST /api/training/:id/progress'
      },
      projects: {
        list: 'GET /api/projects',
        create: 'POST /api/projects',
        detail: 'GET /api/projects/:id',
        members: 'GET /api/projects/:id/members',
        teamAnalysis: 'GET /api/projects/:id/team-analysis'
      },
      events: {
        list: 'GET /api/events',
        detail: 'GET /api/events/:id',
        timeline: 'GET /api/events/:id/timeline'
      },
      profiles: {
        me: 'GET /api/profiles/me',
        detail: 'GET /api/profiles/:id'
      }
    }
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ApproVideo Hub API',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  console.log(`⚠️ API 404: No route found for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    error: `API route not found: ${req.method} ${req.originalUrl}` 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR:', err.stack || err);
  res.status(err.status || 500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Internal server error'
  });
});

// Export for serverless environment
module.exports.handler = serverless(app);

// Start server if not in serverless mode
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🚀 API Server listening on http://localhost:${port}`);
    console.log(`   Health Check: http://localhost:${port}/health`);
    console.log(`   API Docs: http://localhost:${port}/api/docs`);
  });
}