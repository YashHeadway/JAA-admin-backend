/**
 * Async handler wrapper to catch and forward errors to Express next() error handler.
 * Eliminates repetitive try/catch boilerplate across controllers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
