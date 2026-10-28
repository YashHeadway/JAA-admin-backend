import { ApiError } from '../utils/apiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message =
      statusCode >= 500 && env.isProd
        ? 'Internal server error'
        : (error.message || 'Internal server error');
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  } else if (error.statusCode >= 500 && env.isProd) {
    error.message = 'Internal server error';
  }

  // Build clean error response
  const response = {
    success: false,
    message: error.message === 'Internal Server Error' ? 'Internal server error' : error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(env.isDev && error.statusCode >= 500 && { stack: error.stack }),
  };



  logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);

  return res.status(error.statusCode).json(response);
};
