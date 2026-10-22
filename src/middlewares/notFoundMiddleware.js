import { logger } from '../config/logger.js';

export const notFoundHandler = (req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);

  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });

};

