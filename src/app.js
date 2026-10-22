import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getDbStatus } from './config/db.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler } from './middlewares/notFoundMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import v1Routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy if behind a reverse proxy (Nginx, Heroku, etc.)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (
        env.CORS_ORIGIN.includes('*') ||
        env.CORS_ORIGIN.includes(origin) ||
        env.isDev
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// HTTP request logger (Morgan streamed into Winston)
const morganStream = {
  write: (message) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/*', 'application/text'] }));

// Parse raw text bodies as JSON if applicable and guarantee req.body is defined
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Ignore if not valid JSON
    }
  }
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});


// Cookie parser & Compression
app.use(cookieParser());
app.use(compression());

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Rate Limiting for all API endpoints
app.use(env.API_PREFIX, globalRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: getDbStatus(),
    environment: env.NODE_ENV,
  });
});

// Mount API v1 routes
app.use(env.API_PREFIX, v1Routes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
