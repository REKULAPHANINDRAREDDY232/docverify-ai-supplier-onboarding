import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { getCookieMaxAgeMs } from './jwt';
import { AUTH_COOKIE_NAME } from '../types/auth';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Keep false for local HTTP Docker; enable via COOKIE_SECURE=true behind HTTPS.
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: getCookieMaxAgeMs(),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions());
}
