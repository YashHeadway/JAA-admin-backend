import { ApiError } from '../utils/apiError.js';

/**
 * Validate incoming request payload using a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source] !== undefined ? req[source] : {};
      const parsed = schema.safeParse(dataToValidate);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }));
        const primaryMessage = errorMessages[0]?.message || 'Validation failed';
        return next(ApiError.unprocessable(primaryMessage, errorMessages));
      }


      // Replace with sanitized/validated data
      try {
        req[source] = parsed.data;
      } catch {
        try {
          Object.defineProperty(req, source, {
            value: parsed.data,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        } catch {
          if (req[source] && typeof req[source] === 'object') {
            Object.assign(req[source], parsed.data);
          }
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

