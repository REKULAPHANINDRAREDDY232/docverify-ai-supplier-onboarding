import multer from 'multer';
import { env } from '../config/env';
import { ALLOWED_MIME_TYPES } from '../lib/fileValidation';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      callback(new AppError(400, 'Only PDF, JPG, and PNG files are allowed'));
      return;
    }
    callback(null, true);
  },
}).single('file');
