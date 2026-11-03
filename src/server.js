import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, getDbStatus } from './config/db.js';

const startServer = async () => {
  // Connect database if MONGO_URI is set
  await connectDB();

  let activeServer = null;

  const listenWithRetry = (retries = 5, delay = 1000) => {
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      activeServer = server;
      const dbStatus = getDbStatus();
      logger.info('====================================================');
      logger.info(`🚀 JAA Backend Server listening on port ${env.PORT}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Base URL:    http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`❤️  Health check: http://localhost:${env.PORT}/health`);
      logger.info(`💾 Storage Mode: ${dbStatus.mode}`);
      logger.info('====================================================');
    });

    // Handle server-level errors (e.g. port already in use during nodemon reload)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (retries > 0) {
          logger.warn(`⚠️ Port ${env.PORT} busy. Retrying in ${delay}ms... (${retries} attempts left)`);
          setTimeout(() => {
            listenWithRetry(retries - 1, delay);
          }, delay);
          return;
        }
        logger.error(`❌ Port ${env.PORT} is already in use (EADDRINUSE). Please terminate the existing process or wait for port to release.`);
      } else {
        logger.error(`❌ Server error: ${err.message}`);
        console.error(err);
      }
      process.exit(1);
    });
  };

  listenWithRetry();

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

    if (activeServer) {
      activeServer.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  // Graceful shutdown on termination signals
  const shutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server gracefully.`);
    if (activeServer) {
      activeServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
