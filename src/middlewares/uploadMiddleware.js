import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    cb(null, `${baseName}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images (Photos)
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/ogg',
    'video/3gpp',
    'video/x-matroska',
    // Documents / Notices
    'application/pdf',
    // Spreadsheets / Data
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type '${file.mimetype}' is not supported. Supported: images, videos (mp4, webm, mov), and notices (pdf).`), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Middleware that seamlessly supports multipart/form-data (from Postman or file inputs)
 * as well as raw JSON payloads without throwing errors.
 *
 * @param {string} fieldName - Optional file field name (e.g., 'media', 'avatar', 'image')
 */
export const handleFormData = (fieldName = 'media') => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const uploader = upload.any();
      return uploader(req, res, (err) => {
        if (err) return next(err);
        if (req.files && req.files.length > 0) {
          const matched = req.files.find((f) => f.fieldname === fieldName) || req.files[0];
          req.body[matched.fieldname] = `/uploads/${matched.filename}`;
          if (fieldName && matched.fieldname !== fieldName) {
            req.body[fieldName] = `/uploads/${matched.filename}`;
          }
        }
        next();
      });
    }
    next();
  };
};
