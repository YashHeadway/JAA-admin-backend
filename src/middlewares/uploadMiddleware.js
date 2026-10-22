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
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type '${file.mimetype}' is not supported.`), false);
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
 * @param {string} fieldName - Optional file field name (e.g., 'avatar', 'image')
 */
export const handleFormData = (fieldName = 'avatar') => {
  const uploader = upload.single(fieldName);
  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return uploader(req, res, (err) => {
        if (err) return next(err);
        if (req.file) {
          req.body[fieldName] = `/uploads/${req.file.filename}`;
        }
        next();
      });
    }
    next();
  };
};
