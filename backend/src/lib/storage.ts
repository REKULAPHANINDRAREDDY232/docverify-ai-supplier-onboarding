import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { extensionForMime, type AllowedMimeType } from './fileValidation';

export function getUploadRoot(): string {
  const uploadDir = process.env.UPLOAD_DIR || env.UPLOAD_DIR;
  return path.resolve(process.cwd(), uploadDir);
}

export async function ensureUploadRoot(): Promise<string> {
  const root = getUploadRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export function buildStoredFilename(mimeType: AllowedMimeType): string {
  return `${randomUUID()}${extensionForMime(mimeType)}`;
}

export async function persistUpload(
  buffer: Buffer,
  mimeType: AllowedMimeType,
): Promise<{ storedFilename: string; storagePath: string; absolutePath: string }> {
  const root = await ensureUploadRoot();
  const storedFilename = buildStoredFilename(mimeType);
  const absolutePath = path.join(root, storedFilename);
  const resolved = path.resolve(absolutePath);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new AppError(400, 'Invalid storage path');
  }

  await fs.writeFile(resolved, buffer, { flag: 'wx' });

  const uploadDir = process.env.UPLOAD_DIR || env.UPLOAD_DIR;

  return {
    storedFilename,
    storagePath: path.join(uploadDir, storedFilename).replace(/\\/g, '/'),
    absolutePath: resolved,
  };
}

export function resolveStoredFile(storedFilename: string): string {
  const root = getUploadRoot();
  const safeName = path.basename(storedFilename);
  if (safeName !== storedFilename || safeName.includes('..')) {
    throw new AppError(400, 'Invalid document path');
  }

  const absolutePath = path.resolve(root, safeName);
  if (!absolutePath.startsWith(root + path.sep)) {
    throw new AppError(400, 'Invalid document path');
  }

  return absolutePath;
}

export async function removeStoredFile(storedFilename: string): Promise<void> {
  try {
    await fs.unlink(resolveStoredFile(storedFilename));
  } catch {
    // Best-effort cleanup; metadata remains authoritative.
  }
}
