import { DocumentStatus } from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import {
  assertValidUpload,
  sanitizeOriginalFilename,
} from '../lib/fileValidation';
import { prisma } from '../lib/prisma';
import { persistUpload, removeStoredFile, resolveStoredFile } from '../lib/storage';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';
import type { UploadDocumentInput } from '../validators/supplier';
import {
  assertCanDownloadDocument,
  assertCanManageSupplier,
  assertCanViewSupplier,
  getSupplierForAccess,
} from './accessControl';

export async function listSupplierDocuments(user: AuthUser, supplierId: string) {
  const supplier = await getSupplierForAccess(supplierId);
  assertCanViewSupplier(user, supplier);

  return prisma.supplierDocument.findMany({
    where: { supplierId },
    include: { documentType: true },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function uploadSupplierDocument(
  user: AuthUser,
  supplierId: string,
  input: UploadDocumentInput,
  file: Express.Multer.File | undefined,
) {
  if (!file) {
    throw new AppError(400, 'File is required');
  }

  const supplier = await getSupplierForAccess(supplierId);
  assertCanManageSupplier(user, supplier);

  if (supplier.status === 'APPROVED' || supplier.status === 'IN_REVIEW') {
    throw new AppError(409, 'Documents cannot be uploaded while in review or approved');
  }

  const documentType = await prisma.documentType.findFirst({
    where: { id: input.documentTypeId, active: true },
  });
  if (!documentType) {
    throw new AppError(404, 'Document type not found');
  }

  const mimeType = assertValidUpload(file);
  const originalFilename = sanitizeOriginalFilename(file.originalname);

  let supersededDocumentId: string | undefined;
  if (input.replaceDocumentId) {
    const previous = await prisma.supplierDocument.findFirst({
      where: {
        id: input.replaceDocumentId,
        supplierId,
        documentTypeId: documentType.id,
        status: DocumentStatus.ACTIVE,
      },
    });
    if (!previous) {
      throw new AppError(404, 'Active document to replace was not found');
    }
    supersededDocumentId = previous.id;
  } else {
    const existingActive = await prisma.supplierDocument.findFirst({
      where: {
        supplierId,
        documentTypeId: documentType.id,
        status: DocumentStatus.ACTIVE,
      },
      orderBy: { uploadedAt: 'desc' },
    });
    if (existingActive) {
      supersededDocumentId = existingActive.id;
    }
  }

  const stored = await persistUpload(file.buffer, mimeType);

  try {
    const document = await prisma.$transaction(async (tx) => {
      if (supersededDocumentId) {
        await tx.supplierDocument.update({
          where: { id: supersededDocumentId },
          data: { status: DocumentStatus.REPLACED },
        });
      }

      return tx.supplierDocument.create({
        data: {
          supplierId,
          documentTypeId: documentType.id,
          originalFilename,
          storedFilename: stored.storedFilename,
          storagePath: stored.storagePath,
          mimeType,
          fileSize: file.size,
          status: DocumentStatus.ACTIVE,
          uploadedById: user.id,
          supersededDocumentId: supersededDocumentId ?? null,
        },
        include: { documentType: true },
      });
    });

    await writeAuditLog({
      actorId: user.id,
      action: supersededDocumentId ? 'DOCUMENT_REPLACED' : 'DOCUMENT_UPLOADED',
      entityType: 'SupplierDocument',
      entityId: document.id,
      metadata: {
        supplierId,
        documentTypeId: documentType.id,
        supersededDocumentId: supersededDocumentId ?? null,
      },
    });

    return document;
  } catch (error) {
    await removeStoredFile(stored.storedFilename);
    throw error;
  }
}

export async function getDocumentForDownload(user: AuthUser, documentId: string) {
  const document = await prisma.supplierDocument.findUnique({
    where: { id: documentId },
    include: {
      supplier: true,
      documentType: true,
    },
  });

  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  assertCanDownloadDocument(user, document.supplier);

  const absolutePath = resolveStoredFile(document.storedFilename);
  return { document, absolutePath };
}
