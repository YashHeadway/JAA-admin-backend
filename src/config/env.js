import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const parseOrigins = (originsStr) => {
  if (!originsStr || originsStr.trim() === '*') return ['*'];
  return originsStr.split(',').map((o) => o.trim()).filter(Boolean);
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  HOST: process.env.HOST || '0.0.0.0',
  LOCAL_IP: process.env.LOCAL_IP || '192.168.1.26',
  BACKEND_URL: process.env.BACKEND_URL || 'http://192.168.1.26:5000',
  ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://192.168.1.26:5000/api/admin',
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

  // Email / SMTP settings
  SMTP_HOST: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT, 10) || 587,
  SMTP_SECURE: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.EMAIL_FROM || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Redis / Upstash Cache settings
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || '',
  REDIS_URL: process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '',
  REDIS_CACHE_ENABLED: process.env.REDIS_CACHE_ENABLED !== 'false',
};
