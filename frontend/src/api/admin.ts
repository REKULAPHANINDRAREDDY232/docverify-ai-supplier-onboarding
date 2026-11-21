import { env } from '../config/env';
import type { SupplierStatus, UserRole } from '../types/domain';
import { ApiError } from './client';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new ApiError(body?.error?.message ?? 'Request failed', response.status);
  }
  return body.data as T;
}

export interface AdminDashboardData {
  suppliers: {
    total: number;
    byStatus: Record<SupplierStatus, number>;
  };
  users: { total: number; active: number };
  catalogue: { documentTypes: number; checklistItems: number };
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupplierDto {
  id: string;
  companyName: string;
  legalName: string;
  tradingName: string | null;
  contactPerson: string;
  contactEmail: string;
  status: SupplierStatus;
  updatedAt: string;
  contactUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  _count: {
    documents: number;
    documentRequests: number;
    reviewActions: number;
  };
}

export interface AdminDocumentTypeDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  required: boolean;
  active: boolean;
  createdAt: string;
}

export interface AdminChecklistItemDto {
  id: string;
  title: string;
  description: string | null;
  documentTypeId: string | null;
  isRequired: boolean;
  isActive: boolean;
  version: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  documentType: AdminDocumentTypeDto | null;
}

export interface AdminReferenceSourceDto {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  sourceDescription: string;
  createdAt: string;
}

export interface AdminAuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  } | null;
}

export async function fetchAdminDashboard() {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/dashboard`, {
    credentials: 'include',
  });
  return parseJson<AdminDashboardData>(response);
}

export async function fetchAdminUsers(params: {
  q?: string;
  role?: UserRole | '';
  isActive?: '' | 'true' | 'false';
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.role) search.set('role', params.role);
  if (params.isActive) search.set('isActive', params.isActive);
  const response = await fetch(`${env.apiBaseUrl}/api/admin/users?${search.toString()}`, {
    credentials: 'include',
  });
  return parseJson<{ users: AdminUserDto[] }>(response);
}

export async function createAdminUser(payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/users`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ user: AdminUserDto }>(response);
}

export async function updateAdminUser(
  id: string,
  payload: { name?: string; role?: UserRole; isActive?: boolean },
) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/users/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ user: AdminUserDto }>(response);
}

export async function fetchAdminSuppliers(params: { q?: string; status?: SupplierStatus | '' }) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  const response = await fetch(`${env.apiBaseUrl}/api/admin/suppliers?${search.toString()}`, {
    credentials: 'include',
  });
  return parseJson<{ suppliers: AdminSupplierDto[] }>(response);
}

export async function fetchAdminDocumentTypes() {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/document-types`, {
    credentials: 'include',
  });
  return parseJson<{ documentTypes: AdminDocumentTypeDto[] }>(response);
}

export async function createAdminDocumentType(payload: {
  name: string;
  code: string;
  description?: string | null;
  required: boolean;
  active: boolean;
}) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/document-types`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ documentType: AdminDocumentTypeDto }>(response);
}

export async function updateAdminDocumentType(
  id: string,
  payload: Partial<{
    name: string;
    code: string;
    description: string | null;
    required: boolean;
    active: boolean;
  }>,
) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/document-types/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ documentType: AdminDocumentTypeDto }>(response);
}

export async function fetchAdminChecklists() {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/checklists`, {
    credentials: 'include',
  });
  return parseJson<{ checklistItems: AdminChecklistItemDto[] }>(response);
}

export async function createAdminChecklistItem(payload: {
  title: string;
  description?: string | null;
  documentTypeId?: string | null;
  isRequired: boolean;
  isActive: boolean;
  version: string;
  effectiveDate: string;
}) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/checklists`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ checklistItem: AdminChecklistItemDto }>(response);
}

export async function updateAdminChecklistItem(
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    documentTypeId: string | null;
    isRequired: boolean;
    isActive: boolean;
    version: string;
    effectiveDate: string;
  }>,
) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/checklists/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ checklistItem: AdminChecklistItemDto }>(response);
}

export async function fetchAdminReferenceSources() {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/reference-sources`, {
    credentials: 'include',
  });
  return parseJson<{ referenceSources: AdminReferenceSourceDto[] }>(response);
}

export async function createAdminReferenceSource(payload: {
  title: string;
  version: string;
  effectiveDate: string;
  sourceDescription: string;
}) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/reference-sources`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ referenceSource: AdminReferenceSourceDto }>(response);
}

export async function updateAdminReferenceSource(
  id: string,
  payload: Partial<{
    title: string;
    version: string;
    effectiveDate: string;
    sourceDescription: string;
  }>,
) {
  const response = await fetch(`${env.apiBaseUrl}/api/admin/reference-sources/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ referenceSource: AdminReferenceSourceDto }>(response);
}

export async function fetchAdminAuditLogs(params: {
  q?: string;
  action?: string;
  entityType?: string;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.action) search.set('action', params.action);
  if (params.entityType) search.set('entityType', params.entityType);
  const response = await fetch(`${env.apiBaseUrl}/api/admin/audit-logs?${search.toString()}`, {
    credentials: 'include',
  });
  return parseJson<{ auditLogs: AdminAuditLogDto[] }>(response);
}
