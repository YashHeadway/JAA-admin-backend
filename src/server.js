import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, getDbStatus } from './config/db.js';

const startServer = async () => {
  // Connect database if MONGO_URI is set
  await connectDB();

  const server = app.listen(env.PORT, () => {
    const dbStatus = getDbStatus();
    logger.info('====================================================');
    logger.info(`🚀 JAA Backend Server listening on port ${env.PORT}`);
    logger.info(`🌐 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Base URL:    http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`❤️  Health check: http://localhost:${env.PORT}/health`);
    logger.info(`💾 Storage Mode: ${dbStatus.mode}`);
    logger.info('====================================================');
  });

  // Handle unhandled Promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION! Shutting down... ${err.name}: ${err.message}`);
    if (err.stack) logger.error(err.stack);
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT EXCEPTION! Shutting down... ${err.name}: ${err.message}`);
    if (err.stack) logger.error(err.stack);
    process.exit(1);
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
