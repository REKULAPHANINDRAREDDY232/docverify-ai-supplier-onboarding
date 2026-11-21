import { z } from 'zod';

export const createSupplierSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  legalName: z.string().trim().min(2).max(200),
  tradingName: z.string().trim().max(200).optional().nullable(),
  registrationNumber: z.string().trim().max(100).optional().nullable(),
  contactPerson: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(255),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
);

export const uploadDocumentSchema = z.object({
  documentTypeId: z.string().trim().min(1, 'documentTypeId is required'),
  replaceDocumentId: z.string().trim().min(1).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
