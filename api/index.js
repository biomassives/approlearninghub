require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { errorHandler, notFoundHandler } = require('./utils/error');

// Import routes
const authRouter = require('./routes/auth');
const clinicsRouter = require('./routes/clinics');
const feedsRouter = require('./routes/feeds');
const tagsRouter = require('./tags');
const trainingModulesRouter = require('./training-modules');
const profilesRouter = require('./profiles');
const videosRouter = require('./videos');
const categoriesRouter = require('./categories');
const integrationsRouter = require('./integrations');
const docAndZipRouter = require('./routes/docandziprouter');
const { authenticate } = require('./middleware/auth');

// Main Express app
const app = express();
const router = express.Router();
app.set('trust proxy', 1);

// ─── Global Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ─── CORS ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://hub.approvideo.org'];
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

// ─── Request Logger ────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl !== '/api/health') {
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });
  next();
});

// ─── Root API Info ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the ApproVideo Hub API',
    routes: {
      auth: '/api/auth',
      clinics: '/api/clinics',
      feeds: '/api/feeds',
      tags: '/api/tags',
      videos: '/api/videos',
      categories: '/api/categories',
      training: '/api/training',
      profiles: '/api/profiles',
      integrations: '/api/integrations',
      zip: '/api/zip',
      docs: '/api/docs',
      health: '/api/health',
    },
  });
});

// ─── Routes under /api ─────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/clinics', clinicsRouter);
router.use('/feeds', feedsRouter);
router.use('/tags', tagsRouter);
router.use('/videos', videosRouter);
router.use('/categories', categoriesRouter);
router.use('/training', trainingModulesRouter);
router.use('/profiles', authenticate(), profilesRouter);
router.use('/integrations', authenticate(), integrationsRouter);
router.use('/zip', docAndZipRouter);

// ─── Health and Docs ───────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/docs', (req, res) => {
  res.status(200).json({
    message: 'ApproVideo Hub API Documentation',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
      },
      videos: {
        list: 'GET /api/videos',
      },
    },
  });
});

// ─── Error Handling ────────────────────────────────────────────────────
router.use('*', notFoundHandler);
router.use(errorHandler);

// ─── Mount all under /api ──────────────────────────────────────────────
app.use('/api', router);

// ─── Local Dev Support ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Local server running at http://localhost:${PORT}/api`));
}

// ─── Export for Vercel ─────────────────────────────────────────────────
module.exports = serverless(app);
