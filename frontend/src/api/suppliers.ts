import type { DocumentStatus, DocumentTypeCode, SupplierStatus } from '../types/domain';
import { ApiError } from './client';
import { env } from '../config/env';

export interface DocumentTypeDto {
  id: string;
  name: string;
  code: DocumentTypeCode | string;
  description: string | null;
  required: boolean;
  active: boolean;
}

export interface SupplierDocumentDto {
  id: string;
  supplierId: string;
  documentTypeId: string;
  originalFilename: string;
  storedFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedById: string;
  uploadedAt: string;
  supersededDocumentId: string | null;
  documentType: DocumentTypeDto;
}

export interface DocumentRequestDto {
  id: string;
  supplierId: string;
  reviewerId: string;
  documentTypeId: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
  documentType: DocumentTypeDto;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SupplierDto {
  id: string;
  companyName: string;
  legalName: string;
  tradingName: string | null;
  registrationNumber: string | null;
  contactPerson: string;
  contactEmail: string;
  contactUserId: string;
  status: SupplierStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: SupplierDocumentDto[];
  documentRequests?: DocumentRequestDto[];
}

export interface SupplierProfilePayload {
  companyName: string;
  legalName: string;
  tradingName?: string | null;
  registrationNumber?: string | null;
  contactPerson: string;
  contactEmail: string;
  notes?: string | null;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new ApiError(body?.error?.message ?? 'Request failed', response.status);
  }
  return body.data as T;
}

export async function listDocumentTypes() {
  const response = await fetch(`${env.apiBaseUrl}/api/document-types`, {
    credentials: 'include',
  });
  return parseJson<{ documentTypes: DocumentTypeDto[] }>(response);
}

export async function listSuppliers() {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers`, {
    credentials: 'include',
  });
  return parseJson<{ suppliers: SupplierDto[] }>(response);
}

export async function getSupplier(id: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers/${id}`, {
    credentials: 'include',
  });
  return parseJson<{ supplier: SupplierDto }>(response);
}

export async function createSupplier(payload: SupplierProfilePayload) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ supplier: SupplierDto }>(response);
}

export async function updateSupplier(id: string, payload: Partial<SupplierProfilePayload>) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ supplier: SupplierDto }>(response);
}

export async function submitSupplier(id: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers/${id}/submit`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson<{ supplier: SupplierDto }>(response);
}

export async function listSupplierDocuments(id: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers/${id}/documents`, {
    credentials: 'include',
  });
  return parseJson<{ documents: SupplierDocumentDto[] }>(response);
}

export async function listSupplierRequests(id: string) {
  const response = await fetch(`${env.apiBaseUrl}/api/suppliers/${id}/requests`, {
    credentials: 'include',
  });
  return parseJson<{ requests: DocumentRequestDto[] }>(response);
}

export function uploadSupplierDocument(options: {
  supplierId: string;
  documentTypeId: string;
  file: File;
  replaceDocumentId?: string;
  onProgress?: (percent: number) => void;
}): Promise<SupplierDocumentDto> {
  const { supplierId, documentTypeId, file, replaceDocumentId, onProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiBaseUrl}/api/suppliers/${supplierId}/documents`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          success: boolean;
          data?: { document: SupplierDocumentDto };
          error?: { message: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.success && body.data) {
          resolve(body.data.document);
          return;
        }
        reject(new ApiError(body.error?.message ?? 'Upload failed', xhr.status));
      } catch {
        reject(new ApiError('Upload failed', xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Upload failed', 0));

    const form = new FormData();
    form.append('documentTypeId', documentTypeId);
    if (replaceDocumentId) {
      form.append('replaceDocumentId', replaceDocumentId);
    }
    form.append('file', file);
    xhr.send(form);
  });
}

export function documentDownloadUrl(documentId: string): string {
  return `${env.apiBaseUrl}/api/documents/${documentId}/download`;
}
