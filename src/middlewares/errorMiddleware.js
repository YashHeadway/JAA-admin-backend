import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Build clean error response
  const response = {
    success: false,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(env.isDev && error.statusCode >= 500 && { stack: error.stack }),
  };



  logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);

  return res.status(error.statusCode).json(response);
};
