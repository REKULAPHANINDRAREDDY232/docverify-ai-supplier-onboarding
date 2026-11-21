import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
    },
  });
}
