import { ChecklistStatus, ReviewDecision, SupplierStatus } from '@prisma/client';
import { z } from 'zod';

export const reviewerSupplierQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
});

export const checklistCheckSchema = z.object({
  status: z.nativeEnum(ChecklistStatus),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const reviewDecisionSchema = z.object({
  decision: z.nativeEnum(ReviewDecision),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const documentRequestSchema = z.object({
  documentTypeId: z.string().trim().min(1),
  message: z.string().trim().min(5).max(2000),
});

export const supplierCorrectionSchema = z
  .object({
    companyName: z.string().trim().min(2).max(200).optional(),
    legalName: z.string().trim().min(2).max(200).optional(),
    tradingName: z.string().trim().max(200).optional().nullable(),
    registrationNumber: z.string().trim().max(100).optional().nullable(),
    contactPerson: z.string().trim().min(2).max(120).optional(),
    contactEmail: z.string().trim().email().max(255).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    reason: z.string().trim().min(3).max(500),
  })
  .refine(
    (value) =>
      [
        value.companyName,
        value.legalName,
        value.tradingName,
        value.registrationNumber,
        value.contactPerson,
        value.contactEmail,
        value.notes,
      ].some((field) => field !== undefined),
    { message: 'At least one supplier field must be corrected' },
  );

export type ChecklistCheckInput = z.infer<typeof checklistCheckSchema>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
export type DocumentRequestInput = z.infer<typeof documentRequestSchema>;
export type SupplierCorrectionInput = z.infer<typeof supplierCorrectionSchema>;
