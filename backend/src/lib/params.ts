import { AppError } from '../middleware/errorHandler';

export function paramId(value: string | string[] | undefined, label = 'id'): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return value;
}
