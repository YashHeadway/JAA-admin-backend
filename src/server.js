import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, getDbStatus } from './config/db.js';

const startServer = async () => {
  // Connect database if MONGO_URI is set
  await connectDB();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const dbStatus = getDbStatus();
    logger.info('====================================================');
    logger.info(`🚀 JAA Backend Server listening on port ${env.PORT}`);
    logger.info(`🌐 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Base URL:    http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`❤️  Health check: http://localhost:${env.PORT}/health`);
    logger.info(`💾 Storage Mode: ${dbStatus.mode}`);
    logger.info('====================================================');
  });

  // Handle server-level errors (e.g. port already in use)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${env.PORT} is already in use (EADDRINUSE). Please terminate the existing process or wait for port to release.`);
      console.error(`Port ${env.PORT} already in use. Waiting before retry...`);
    } else {
      logger.error(`❌ Server error: ${err.message}`);
      console.error(err);
    }
    process.exit(1);
  });

  // Handle unhandled Promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    logger.error(`UNHANDLED REJECTION: ${err?.name || 'Error'}: ${err?.message || err}`);
    if (err?.stack) logger.error(err.stack);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    logger.error(`UNCAUGHT EXCEPTION: ${err?.name || 'Error'}: ${err?.message || err}`);
    if (err?.stack) logger.error(err.stack);

    // Benign socket/headers errors should not crash the development server
    if (
      err?.code === 'ERR_HTTP_HEADERS_SENT' ||
      err?.code === 'ECONNRESET' ||
      err?.code === 'EPIPE'
    ) {
      return;
    }

    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown on termination signals
  const shutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server gracefully.`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
