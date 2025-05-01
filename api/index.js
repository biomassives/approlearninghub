require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { createError, errorHandler, notFoundHandler } = require('./utils/error');

// Routes
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

// Initialize Express app
const app = express();
app.set('trust proxy', 1);

// ─── Security Middleware ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://i.ytimg.com', 'https://img.youtube.com'],
        connectSrc: ["'self'", process.env.SUPABASE_URL],
        frameSrc: ["'self'", 'https://www.youtube.com'],
        mediaSrc: ["'self'", 'https://www.youtube.com'],
      },
    },
  })
);

// ─── Global Middleware ─────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ─── Rate Limiting ─────────────────────────────────────────────────────
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: { success: false, message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

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
    if (req.originalUrl !== '/health') {
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/clinics', clinicsRouter);
app.use('/feeds', feedsRouter);
app.use('/tags', tagsRouter);
app.use('/videos', videosRouter);
app.use('/categories', categoriesRouter);
app.use('/training', trainingModulesRouter);
app.use('/profiles', authenticate(), profilesRouter);
app.use('/integrations', authenticate(), integrationsRouter);
app.use('/zip', docAndZipRouter);

// ─── Health Check ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Documentation Route (Optional) ────────────────────────────────
app.get('/docs', (req, res) => {
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

// ─── Not Found & Error Handling ────────────────────────────────────────
app.use('*', notFoundHandler);
app.use(errorHandler);

// ─── Local Dev Mode ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Local server running at http://localhost:${PORT}`));
}

// ─── Export for Vercel ─────────────────────────────────────────────────
module.exports = serverless(app);
