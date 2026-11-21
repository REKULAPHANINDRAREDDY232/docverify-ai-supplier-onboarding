import path from 'node:path';
import { AppError } from '../middleware/errorHandler';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function extensionForMime(mimeType: AllowedMimeType): string {
  return EXTENSION_BY_MIME[mimeType];
}

export function sanitizeOriginalFilename(filename: string): string {
  const base = path.basename(filename);
  const cleaned = Array.from(base)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || '<>:"/\\|?*'.includes(char)) {
        return '_';
      }
      return char;
    })
    .join('')
    .trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return 'upload.bin';
  }
  return cleaned.slice(0, 180);
}

export function detectMimeFromSignature(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length >= 4) {
    // %PDF
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'application/pdf';
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
  }

  // JPEG
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

export function assertValidUpload(file: Express.Multer.File): AllowedMimeType {
  if (!file?.buffer || file.buffer.length === 0) {
    throw new AppError(400, 'Uploaded file is empty');
  }

  if (!isAllowedMimeType(file.mimetype)) {
    throw new AppError(400, 'Only PDF, JPG, and PNG files are allowed');
  }

  const detected = detectMimeFromSignature(file.buffer);
  if (!detected) {
    throw new AppError(400, 'File signature is not a valid PDF, JPG, or PNG');
  }

  if (detected !== file.mimetype) {
    // Allow image/jpg vs image/jpeg mismatch only if we normalized; multer usually sends image/jpeg
    if (!(detected === 'image/jpeg' && file.mimetype === 'image/jpeg')) {
      throw new AppError(400, 'Declared file type does not match file contents');
    }
  }

  return detected;
}
