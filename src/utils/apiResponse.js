import { formatTimestamps } from './dateFormatter.js';

/**
 * Standardized API Response formatter.
 * Ensures consistent response envelopes across all endpoints.
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success', meta = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data && typeof data === 'object' ? formatTimestamps(data) : data;
    if (meta !== null && meta !== undefined) {
      this.meta = meta;
    }
  }

  static success(res, data, message = 'Success', statusCode = 200, meta = null) {
    const payload = new ApiResponse(statusCode, data, message, meta);
    return res.status(statusCode).json(payload);
  }

  static created(res, data, message = 'Resource created successfully', meta = null) {
    const payload = new ApiResponse(201, data, message, meta);
    return res.status(201).json(payload);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}
