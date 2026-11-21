import type { UserRole } from '../types/domain';
import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  supplierAsContact?: {
    id: string;
    companyName: string;
    legalName: string;
    status: string;
  } | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  companyName: string;
  legalName?: string;
  tradingName?: string;
  registrationNumber?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function register(payload: RegisterPayload) {
  return apiRequest<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload) {
  return apiRequest<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiRequest<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export function fetchCurrentUser() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me');
}
