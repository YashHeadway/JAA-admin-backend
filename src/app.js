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

// Normalize URL duplicate slashes (e.g. //admin//members -> /admin/members)
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing (CORS) Configuration
// Supports exact origins with credentials enabled (Never wildcard '*' with credentials)
const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow mobile apps, curl, Postman, and native HTTP clients (no Origin header)
    if (!origin) return callback(null, true);

    // 2. Allow if origin is explicitly in CORS_ORIGIN
    if (env.CORS_ORIGIN && env.CORS_ORIGIN.includes(origin)) {
      return callback(null, true);
    }

    // 3. Automatically allow all localhost, 127.0.0.1, local network IPs, and Hoppscotch
    try {
      const { hostname } = new URL(origin);
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '192.168.1.26' ||
        hostname === (env.LOCAL_IP || '') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        hostname === 'hoppscotch.io'
      ) {
        return callback(null, true);
      }
    } catch {}

    // 4. In development mode, echo back requesting origin
    if (env.isDev) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-Access-Token',
    'X-Auth-Token',
    'X-Admin-Token',
    'token',
    'admin_auth_token',
    'admin-auth-token',
    'auth_token',
    'auth-token',
    'admintoken',
    'admin-token',
    'Cookie',
    'cookie',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization', 'Set-Cookie'],
};

app.use(cors(corsOptions));

// HTTP request logger (Morgan streamed into Winston)
const morganStream = {
  write: (message) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Body parsers (with permissive JSON parsing that tolerates trailing commas)
app.use(express.text({ limit: '10mb', type: ['application/json', 'text/*', 'application/text'] }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    const raw = req.body.trim();
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        try {
          // Auto-remove trailing commas before closing braces/brackets (e.g. ,} or ,])
          const sanitized = raw.replace(/,\s*([}\]])/g, '$1');
          req.body = JSON.parse(sanitized);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: `Invalid JSON payload: ${err.message}. Please check for trailing commas or mismatched quotes.`,
          });
        }
      }
    }
  }
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

// Automatically format createdAt and updatedAt fields into 'DD-MM-YYYY hh:mm am/pm' across API responses
// (excluding leads routes where standard ISO 8601 timestamps are required)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    const isLeadsRoute = req.originalUrl && req.originalUrl.toLowerCase().includes('/leads');
    if (body && typeof body === 'object' && !isLeadsRoute) {
      formatTimestamps(body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Cookie parser & Compression
app.use(cookieParser());
app.use(compression());

// Development-only authentication cookie debugging (Never logs token values)
if (env.isDev) {
  app.use((req, res, next) => {
    const isAuthRoute =
      req.originalUrl &&
      (req.originalUrl.includes('/login') ||
        req.originalUrl.includes('/logout') ||
        req.originalUrl.includes('/auth') ||
        req.originalUrl.includes('/admin'));

    if (isAuthRoute) {
      const cookieNames = req.cookies ? Object.keys(req.cookies) : [];
      const hasTokenCookie = Boolean(
        req.cookies?.token || req.cookies?.accessToken || req.cookies?.jwt
      );
      const hasAuthHeader = Boolean(req.headers?.authorization);

      logger.info(
        `[Auth Cookie Debug] ${req.method} ${req.originalUrl} | cookies_received: [${cookieNames.join(', ')}] | has_token_cookie: ${hasTokenCookie} | has_auth_header: ${hasAuthHeader}`
      );
    }
    next();
  });
}

// Static file serving for uploads and images
const uploadsDir = path.resolve(env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d', fallthrough: true }));
app.use('/images', express.static(path.join(uploadsDir, 'images'), { maxAge: '1d', fallthrough: true }));
app.use('/images', express.static(uploadsDir, { maxAge: '1d', fallthrough: true }));

// Fallback for missing static images under /uploads or /images (returns default logo if available)
app.use(['/uploads', '/images'], (req, res, next) => {
  const isImageRequest = /\.(png|jpe?g|webp|svg|gif)$/i.test(req.path);
  const fallbackLogo = path.join(uploadsDir, 'jaa-logo.png');
  if (isImageRequest && fs.existsSync(fallbackLogo)) {
    return res.sendFile(fallbackLogo, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
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
