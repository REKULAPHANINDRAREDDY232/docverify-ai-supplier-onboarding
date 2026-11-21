import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Valid email is required').max(255),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be at most 128 characters'),
  companyName: z.string().trim().min(2, 'Company name is required').max(200),
  legalName: z.string().trim().min(2).max(200).optional(),
  tradingName: z.string().trim().max(200).optional(),
  registrationNumber: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  role: z.enum([UserRole.REVIEWER, UserRole.ADMIN]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
