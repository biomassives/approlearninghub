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

// Create Express app instance FIRST
const app = express();
app.set('trust proxy', 1);

// Add debug middleware
const { addDebugMiddleware } = require('./api-debug');

// Load auth middleware
const { authenticate } = require('./middleware/auth');

// Load routers
const authRouter = require('./routes/auth');
const adminRouter = require('./admin');
const publicRouter = require('./public');
const libraryRouter = require('./library');
const expertRouter = require('./expert');
const libraryMgmtRouter = require('./librarymgmt');
const diagnosticsRouter = require('./diagnostics');
const dashboardsRouter = require('./dashboards');
const translationsRouter = require('./translations');
const contentRouter = require('./content');

// Add new routers based on schema
const profilesRouter = require('./profiles');
const videosRouter = require('./videos');
const categoriesRouter = require('./categories');
const integrationsRouter = require('./integrations');
//const tagsRouter = require('./tags');
//const panelsRouter = require('./panels');
//const trainingRouter = require('./training');
//const rewardsRouter = require('./rewards');
//const ecoOpsRouter = require('./eco-ops');
//const notesRouter = require('./notes');
//const discussionRouter = require('./discussion');
//const walletsRouter = require('./wallets');

// Add debug middleware first
addDebugMiddleware(app);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});

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

// ——— Global Middleware ————————————————————————————
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// CORS middleware
app.use((req, res, next) => {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'https://hub.approvideo.org'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
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
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount routes for API paths (matches client-side expectations)
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);
app.use('/api/library', libraryRouter);
app.use('/api/expert', expertRouter);
app.use('/api/librarymgmt', libraryMgmtRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/translations', translationsRouter);
app.use('/api/content', contentRouter);

// Mount new routers based on schema
app.use('/api/profiles', authenticate, profilesRouter);
app.use('/api/videos', videosRouter); // Public access for videos
app.use('/api/categories', categoriesRouter); // Public access for categories
app.use('/api/integrations', integrationsRouter);

//app.use('/api/tags', tagsRouter); // Public access for tags
//app.use('/api/panels', panelsRouter);
//app.use('/api/training', authenticate, trainingRouter);
//app.use('/api/rewards', authenticate, rewardsRouter);
//app.use('/api/eco-ops', authenticate, ecoOpsRouter);
//app.use('/api/notes', authenticate, notesRouter);
//app.use('/api/discussion', authenticate, discussionRouter);
//app.use('/api/wallets', authenticate, walletsRouter);

// Also mount on non-prefixed routes for direct Express use during development
if (process.env.NODE_ENV === 'development') {
  app.use('/auth', authRouter);
  app.use('/admin', adminRouter);
  app.use('/public', publicRouter);
  app.use('/library', libraryRouter);
  app.use('/expert', expertRouter);
  app.use('/librarymgmt', libraryMgmtRouter);
  app.use('/diagnostics', diagnosticsRouter);
  app.use('/dashboards', dashboardsRouter);
  app.use('/translations', translationsRouter);
  app.use('/content', contentRouter);
  // New routers also on non-prefixed paths
  app.use('/profiles', authenticate, profilesRouter);
  app.use('/videos', videosRouter);
  app.use('/categories', categoriesRouter);
  app.use('/integrations', integrationsRouter);
  //app.use('/tags', tagsRouter);
  //app.use('/panels', panelsRouter);
  //app.use('/training', authenticate, trainingRouter);
  //app.use('/rewards', authenticate, rewardsRouter);
  //app.use('/eco-ops', authenticate, ecoOpsRouter);
  //app.use('/notes', authenticate, notesRouter);
  //app.use('/discussion', authenticate, discussionRouter);
  //app.use('/wallets', authenticate, walletsRouter);
}

// Special video endpoints
app.get('/api/videos', async (req, res) => {
  const { handleVideos } = require('./lib/publicHandlers');
  console.log('👉 /api/videos hit with query:', req.query);
  return handleVideos(req, res);
});

// Legacy endpoint support
app.get('/videos', async (req, res) => {
  const { handleVideos } = require('./lib/publicHandlers');
  console.log('👉 Root /videos hit with query:', req.query);
  return handleVideos(req, res);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
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

// Simple welcome at root
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ApproVideo Hub API',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 for everything else
app.use('*', (req, res) => {
  console.log(`⚠️ No route found for ${req.method} ${req.originalUrl}`);
  res
    .status(404)
    .json({ success: false, error: `No route for ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR:', err.stack || err);
  res
    .status(err.status || 500)
    .json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message || 'Internal server error'
    });
});

module.exports = app;
module.exports.handler = serverless(app);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Express listening on http://localhost:${port}`);
    console.log(`Try accessing http://localhost:${port}/api/videos`);
    console.log(`Or http://localhost:${port}/health for a quick health check`);
    console.log(`API documentation available at http://localhost:${port}/api/docs`);
  });
}