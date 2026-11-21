import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  role: z.nativeEnum(UserRole),
});

export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const documentTypeCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9_]+$/, 'Code must use uppercase letters, numbers, and underscores'),
  description: z.string().trim().max(1000).optional().nullable(),
  required: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const documentTypeUpdateSchema = documentTypeCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
);

export const checklistItemCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  documentTypeId: z.string().trim().min(1).optional().nullable(),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
  version: z.string().trim().min(1).max(40),
  effectiveDate: z.coerce.date(),
});

export const checklistItemUpdateSchema = checklistItemCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
);

export const referenceSourceCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  version: z.string().trim().min(1).max(40),
  effectiveDate: z.coerce.date(),
  sourceDescription: z.string().trim().min(5).max(2000),
});

export const referenceSourceUpdateSchema = referenceSourceCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
);

export const auditLogQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(80).optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type DocumentTypeCreateInput = z.infer<typeof documentTypeCreateSchema>;
export type DocumentTypeUpdateInput = z.infer<typeof documentTypeUpdateSchema>;
export type ChecklistItemCreateInput = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdateInput = z.infer<typeof checklistItemUpdateSchema>;
export type ReferenceSourceCreateInput = z.infer<typeof referenceSourceCreateSchema>;
export type ReferenceSourceUpdateInput = z.infer<typeof referenceSourceUpdateSchema>;
