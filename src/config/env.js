import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const parseOrigins = (originsStr) => {
  if (!originsStr) return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'];
  return originsStr.split(',').map((o) => o.trim()).filter(Boolean);
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_PREFIX: process.env.API_PREFIX || '/api',
  CORS_ORIGIN: parseOrigins(process.env.CORS_ORIGIN),
  JWT_SECRET: process.env.JWT_SECRET || 'jaa_super_secret_jwt_key_2026_default_fallback',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'jaa_super_secret_jwt_refresh_key_2026_default_fallback',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/JAA_Backend',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
