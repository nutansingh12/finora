import 'dotenv/config';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
// Robust TS path alias registration (works for dist, src, and bundled runtime)
import path from 'path';
import fs from 'fs';
import { register as registerTsPaths } from 'tsconfig-paths';
(() => {
  try {
    const candidates = [
      path.resolve(__dirname),
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, '..', 'src'),
    ];
    const baseUrl = candidates.find((c) =>
      fs.existsSync(path.join(c, 'models')) ||
      fs.existsSync(path.join(c, 'routes')) ||
      fs.existsSync(path.join(c, 'controllers'))
    );
    if (baseUrl) {
      // Helpful during Vercel function boot to confirm which layout is used
      try { console.log('[ts-paths] baseUrl:', baseUrl); } catch {}
      const aliasKey = '@' + '/*';
      const paths: Record<string, string[]> = {};
      // Support direct children and nested under src
      paths[aliasKey] = ['*', 'src/*'];
      registerTsPaths({ baseUrl, paths });
    }
  } catch {
    // noop
  }
})();
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { testConnection, closeConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import alertRoutes from './routes/alerts';
import searchRoutes from './routes/search';
import marketDataRoutes from './routes/marketData';
import feedbackRoutes from './routes/feedback';
import portfolioRoutes from './routes/portfolio';
import usersRoutes from './routes/users';
import jobsRoutes from './routes/jobs';

const app = express();
// Trust reverse proxy headers (Vercel/Node serverless) so rate limiter and req.ip work correctly
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS — include explicit preflight handling for browser OPTIONS requests
const corsOptions: CorsOptions = {
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.server.env !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.env,
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

// Status endpoint (reports DB, upload path, notifications readiness)
app.get('/api/status', async (_req, res) => {
  try {
    const dbConnected = await testConnection();
    const notificationsEnabled = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    res.json({
      success: true,
      data: {
        db: { connected: dbConnected },
        upload: { path: config.upload?.uploadPath || '/tmp/uploads' },
        notifications: { enabled: notificationsEnabled }
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Status check failed' });
  }
});


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/api-keys', require('./routes/apiKeys').default);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/jobs', jobsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
      console.log(`📊 Environment: ${config.server.env}`);
      console.log(`🔗 API Base URL: http://${config.server.host}:${config.server.port}/api`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('✅ HTTP server closed');

        // Close database connection
        await closeConnection();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server only when not running on Vercel (serverless)
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
