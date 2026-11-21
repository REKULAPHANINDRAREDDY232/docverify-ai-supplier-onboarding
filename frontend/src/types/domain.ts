export const USER_ROLES = ['SUPPLIER_CONTACT', 'REVIEWER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DOCUMENT_TYPE_CODES = [
  'BUSINESS_REGISTRATION',
  'BANK_CONFIRMATION',
  'INSURANCE_CERTIFICATE',
] as const;
export type DocumentTypeCode = (typeof DOCUMENT_TYPE_CODES)[number];

export const SUPPLIER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_INFORMATION',
  'APPROVED',
  'ON_HOLD',
] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const DOCUMENT_STATUSES = ['ACTIVE', 'REPLACED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CHECKLIST_STATUSES = [
  'PRESENT',
  'MISSING',
  'NEEDS_REVIEW',
  'NOT_APPLICABLE',
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const REVIEW_DECISIONS = ['APPROVED', 'ON_HOLD', 'NEEDS_INFORMATION'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DOCUMENT_REQUEST_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type DocumentRequestStatus = (typeof DOCUMENT_REQUEST_STATUSES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeCode, string> = {
  BUSINESS_REGISTRATION: 'Business registration',
  BANK_CONFIRMATION: 'Bank confirmation',
  INSURANCE_CERTIFICATE: 'Insurance certificate',
};

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  NEEDS_INFORMATION: 'Needs information',
  APPROVED: 'Approved',
  ON_HOLD: 'On hold',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  ACTIVE: 'Active',
  REPLACED: 'Replaced',
};
