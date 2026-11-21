import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types/auth';
import { AppError } from '../middleware/errorHandler';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== 'object' || decoded === null) {
      throw new AppError(401, 'Invalid authentication token');
    }

    const { sub, email, role } = decoded as jwt.JwtPayload & Partial<JwtPayload>;

    if (!sub || !email || !role) {
      throw new AppError(401, 'Invalid authentication token');
    }

    return { sub, email, role };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'Invalid or expired authentication token');
  }
}

export function getCookieMaxAgeMs(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_EXPIRES_IN.trim());
  if (!match) {
    return 8 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 8 * 60 * 60 * 1000;
  }
}
