import { env } from '../config/env';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: {
    message: string;
  };
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success === false) {
    const message =
      body && 'error' in body ? body.error.message : 'Request failed. Please try again.';
    throw new ApiError(message, response.status);
  }

  return body.data;
}
