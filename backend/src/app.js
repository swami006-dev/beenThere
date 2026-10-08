const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { successResponse } = require('./utils/apiResponse');
const { notFoundHandler } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const responsesRoutes = require('./routes/responses.routes');
const reportsRoutes = require('./routes/reports.routes');
const moderationRoutes = require('./routes/moderation.routes');
const experiencesRoutes = require('./routes/experiences.routes');
const aiRoutes = require('./routes/ai.routes');
const conversationsRoutes = require('./routes/conversations.routes');

const app = express();

// Security & Parsing Middlewares
const rawOrigins = (env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'https://been-there-g5on.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const allowedOriginsSet = new Set([...rawOrigins, ...defaultOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, or mobile requests with no origin
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOriginsSet.has(normalizedOrigin)) {
      return callback(null, origin);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  return successResponse(res, {
    service: 'Beenthere API',
    status: 'healthy'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/responses', responsesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/experiences', experiencesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/conversations', conversationsRoutes);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  const server = app.listen(env.PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Beenthere API Server`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🔌 Listening on port: ${env.PORT}`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`=========================================`);
  });

  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
