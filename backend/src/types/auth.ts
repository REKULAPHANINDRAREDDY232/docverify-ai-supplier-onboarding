import type { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export const AUTH_COOKIE_NAME = 'docverify_access_token';
