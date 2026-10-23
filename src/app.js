import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getDbStatus } from './config/db.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler } from './middlewares/notFoundMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { formatTimestamps } from './utils/dateFormatter.js';
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

// Automatically format createdAt and updatedAt fields into 'DD-MM-YYYY hh:mm am/pm' across all API responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object') {
      formatTimestamps(body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Cookie parser & Compression
app.use(cookieParser());
app.use(compression());

// Static file serving for uploads and images
const uploadsDir = path.resolve(env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsDir));
app.use('/images', express.static(path.join(uploadsDir, 'images')));
app.use('/images', express.static(uploadsDir));

// Fallback for missing static images under /uploads or /images (returns default logo if available)
app.use(['/uploads', '/images'], (req, res, next) => {
  const fallbackLogo = path.join(uploadsDir, 'jaa-logo.png');
  if (fs.existsSync(fallbackLogo)) {
    return res.sendFile(fallbackLogo);
  }
  next();
});

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
