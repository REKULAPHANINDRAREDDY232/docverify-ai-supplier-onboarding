import { env } from '../config/env';
import type {
  ChecklistStatus,
  ReviewDecision,
  SupplierStatus,
} from '../types/domain';
import { ApiError } from './client';
import type { DocumentTypeDto, SupplierDocumentDto, DocumentRequestDto } from './suppliers';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new ApiError(body?.error?.message ?? 'Request failed', response.status);
  }
  return body.data as T;
}

export interface ReviewerStats {
  submitted: number;
  inReview: number;
  needsInformation: number;
  approved: number;
  onHold: number;
}

export interface ReviewerSupplierListItem {
  id: string;
  companyName: string;
  legalName: string;
  tradingName: string | null;
  status: SupplierStatus;
  contactPerson: string;
  contactEmail: string;
  updatedAt: string;
  documents: SupplierDocumentDto[];
  _count: {
    documentRequests: number;
    reviewActions: number;
  };
}

export interface ChecklistItemDto {
  id: string;
  title: string;
  description: string | null;
  documentTypeId: string | null;
  isRequired: boolean;
  documentType: DocumentTypeDto | null;
}

export interface ChecklistCheckDto {
  id: string;
  supplierId: string;
  checklistItemId: string;
  status: ChecklistStatus;
  comment: string | null;
  checkedById: string;
  checkedAt: string;
  checklistItem: ChecklistItemDto;
  checkedBy: { id: string; name: string; email: string };
}

export interface ReviewActionDto {
  id: string;
  supplierId: string;
  reviewerId: string;
  decision: ReviewDecision;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; name: string; email: string };
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

export interface ReviewerSupplierDetail {
  supplier: {
    id: string;
    companyName: string;
    legalName: string;
    tradingName: string | null;
    registrationNumber: string | null;
    contactPerson: string;
    contactEmail: string;
    status: SupplierStatus;
    notes: string | null;
    updatedAt: string;
    contactUser: { id: string; name: string; email: string; role: string };
    documents: SupplierDocumentDto[];
    documentRequests: DocumentRequestDto[];
    reviewActions: ReviewActionDto[];
    checklistChecks: ChecklistCheckDto[];
  };
  checklistItems: ChecklistItemDto[];
  auditLogs: AuditLogDto[];
}

export async function fetchReviewerDashboard() {
  const response = await fetch(`${env.apiBaseUrl}/api/reviewer/dashboard`, {
    credentials: 'include',
  });
  return parseJson<{
    stats: ReviewerStats;
    recent: Array<{
      id: string;
      companyName: string;
      legalName: string;
      status: SupplierStatus;
      updatedAt: string;
      contactPerson: string;
    }>;
  }>(response);
}

export async function fetchReviewerSuppliers(params: {
  q?: string;
  status?: SupplierStatus | '';
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  const response = await fetch(
    `${env.apiBaseUrl}/api/reviewer/suppliers?${search.toString()}`,
    { credentials: 'include' },
  );
  return parseJson<{ suppliers: ReviewerSupplierListItem[] }>(response);
}

export async function fetchReviewerSupplier(id: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/reviewer/suppliers/${id}`, {
    credentials: 'include',
  });
  return parseJson<ReviewerSupplierDetail>(response);
}

export async function saveChecklistCheck(
  supplierId: string,
  itemId: string,
  payload: { status: ChecklistStatus; comment?: string },
) {
  const response = await fetch(
    `${env.apiBaseUrl}/api/reviewer/suppliers/${supplierId}/checklist/${itemId}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<{ check: ChecklistCheckDto }>(response);
}

export async function submitReviewDecision(
  supplierId: string,
  payload: { decision: ReviewDecision; comment?: string },
) {
  const response = await fetch(
    `${env.apiBaseUrl}/api/reviewer/suppliers/${supplierId}/decisions`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<{ action: ReviewActionDto; supplier: { id: string; status: SupplierStatus } }>(
    response,
  );
}

export async function createReviewerDocumentRequest(
  supplierId: string,
  payload: { documentTypeId: string; message: string },
) {
  const response = await fetch(
    `${env.apiBaseUrl}/api/reviewer/suppliers/${supplierId}/document-requests`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<{ request: DocumentRequestDto; supplier: { id: string; status: SupplierStatus } }>(
    response,
  );
}

export async function correctSupplierDetails(
  supplierId: string,
  payload: Record<string, string | null>,
) {
  const response = await fetch(
    `${env.apiBaseUrl}/api/reviewer/suppliers/${supplierId}/corrections`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<{ supplier: ReviewerSupplierDetail['supplier'] }>(response);
}

export async function fetchDocumentBlob(documentId: string): Promise<Blob> {
  const response = await fetch(`${env.apiBaseUrl}/api/documents/${documentId}/download`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new ApiError('Unable to download document', response.status);
  }
  return response.blob();
}
