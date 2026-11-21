import {
  DocumentRequestStatus,
  ReviewDecision,
  SupplierStatus,
  type Prisma,
} from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';
import type {
  ChecklistCheckInput,
  DocumentRequestInput,
  ReviewDecisionInput,
  SupplierCorrectionInput,
} from '../validators/reviewer';
import { assertCanReview, getSupplierForAccess } from './accessControl';

const reviewStatuses: SupplierStatus[] = [
  SupplierStatus.SUBMITTED,
  SupplierStatus.IN_REVIEW,
  SupplierStatus.NEEDS_INFORMATION,
  SupplierStatus.APPROVED,
  SupplierStatus.ON_HOLD,
];

async function markInReviewIfNeeded(supplierId: string, current: SupplierStatus) {
  if (current === SupplierStatus.SUBMITTED) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: { status: SupplierStatus.IN_REVIEW },
    });
  }
  return null;
}

export async function getReviewerDashboard(user: AuthUser) {
  assertCanReview(user);

  const [submitted, inReview, needsInformation, approved, onHold] = await Promise.all([
    prisma.supplier.count({ where: { status: SupplierStatus.SUBMITTED } }),
    prisma.supplier.count({ where: { status: SupplierStatus.IN_REVIEW } }),
    prisma.supplier.count({ where: { status: SupplierStatus.NEEDS_INFORMATION } }),
    prisma.supplier.count({ where: { status: SupplierStatus.APPROVED } }),
    prisma.supplier.count({ where: { status: SupplierStatus.ON_HOLD } }),
  ]);

  const recent = await prisma.supplier.findMany({
    where: {
      status: {
        in: [
          SupplierStatus.SUBMITTED,
          SupplierStatus.IN_REVIEW,
          SupplierStatus.NEEDS_INFORMATION,
        ],
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 8,
    select: {
      id: true,
      companyName: true,
      legalName: true,
      status: true,
      updatedAt: true,
      contactPerson: true,
    },
  });

  return {
    stats: { submitted, inReview, needsInformation, approved, onHold },
    recent,
  };
}

export async function listReviewerSuppliers(
  user: AuthUser,
  query: { q?: string; status?: SupplierStatus },
) {
  assertCanReview(user);

  const where: Prisma.SupplierWhereInput = {
    status: query.status ?? { in: reviewStatuses },
  };

  if (query.q) {
    where.OR = [
      { companyName: { contains: query.q, mode: 'insensitive' } },
      { legalName: { contains: query.q, mode: 'insensitive' } },
      { tradingName: { contains: query.q, mode: 'insensitive' } },
      { registrationNumber: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return prisma.supplier.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      documents: {
        where: { status: 'ACTIVE' },
        include: { documentType: true },
      },
      _count: {
        select: {
          documentRequests: { where: { status: DocumentRequestStatus.OPEN } },
          reviewActions: true,
        },
      },
    },
  });
}

export async function getReviewerSupplierDetail(user: AuthUser, supplierId: string) {
  assertCanReview(user);

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      contactUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      documents: {
        include: { documentType: true },
        orderBy: { uploadedAt: 'desc' },
      },
      documentRequests: {
        include: {
          documentType: true,
          reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      reviewActions: {
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      checklistChecks: {
        include: {
          checklistItem: { include: { documentType: true } },
          checkedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { checkedAt: 'desc' },
      },
    },
  });

  if (!supplier) {
    throw new AppError(404, 'Supplier not found');
  }

  const checklistItems = await prisma.checklistItem.findMany({
    where: { isActive: true },
    include: { documentType: true },
    orderBy: { title: 'asc' },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: 'Supplier', entityId: supplierId },
        {
          entityType: 'SupplierDocument',
          entityId: { in: supplier.documents.map((doc) => doc.id) },
        },
      ],
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return { supplier, checklistItems, auditLogs };
}

export async function upsertChecklistCheck(
  user: AuthUser,
  supplierId: string,
  checklistItemId: string,
  input: ChecklistCheckInput,
) {
  assertCanReview(user);
  const supplier = await getSupplierForAccess(supplierId);

  const item = await prisma.checklistItem.findFirst({
    where: { id: checklistItemId, isActive: true },
  });
  if (!item) {
    throw new AppError(404, 'Checklist item not found');
  }

  await markInReviewIfNeeded(supplierId, supplier.status);

  const check = await prisma.checklistCheck.upsert({
    where: {
      supplierId_checklistItemId: {
        supplierId,
        checklistItemId,
      },
    },
    create: {
      supplierId,
      checklistItemId,
      status: input.status,
      comment: input.comment || null,
      checkedById: user.id,
      checkedAt: new Date(),
    },
    update: {
      status: input.status,
      comment: input.comment || null,
      checkedById: user.id,
      checkedAt: new Date(),
    },
    include: {
      checklistItem: { include: { documentType: true } },
      checkedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'CHECKLIST_CHECK_RECORDED',
    entityType: 'Supplier',
    entityId: supplierId,
    metadata: {
      checklistItemId,
      status: input.status,
      comment: input.comment ?? null,
    },
  });

  return check;
}

export async function recordReviewDecision(
  user: AuthUser,
  supplierId: string,
  input: ReviewDecisionInput,
) {
  assertCanReview(user);
  const supplier = await getSupplierForAccess(supplierId);

  if (supplier.status === SupplierStatus.DRAFT) {
    throw new AppError(409, 'Draft suppliers cannot be decided yet');
  }

  const statusMap: Record<ReviewDecision, SupplierStatus> = {
    APPROVED: SupplierStatus.APPROVED,
    ON_HOLD: SupplierStatus.ON_HOLD,
    NEEDS_INFORMATION: SupplierStatus.NEEDS_INFORMATION,
  };

  const result = await prisma.$transaction(async (tx) => {
    const action = await tx.reviewAction.create({
      data: {
        supplierId,
        reviewerId: user.id,
        decision: input.decision,
        comment: input.comment || null,
      },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    const updated = await tx.supplier.update({
      where: { id: supplierId },
      data: { status: statusMap[input.decision] },
    });

    return { action, supplier: updated };
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'REVIEW_DECISION_RECORDED',
    entityType: 'Supplier',
    entityId: supplierId,
    metadata: {
      decision: input.decision,
      comment: input.comment ?? null,
      previousStatus: supplier.status,
      nextStatus: statusMap[input.decision],
    },
  });

  return result;
}

export async function createDocumentRequest(
  user: AuthUser,
  supplierId: string,
  input: DocumentRequestInput,
) {
  assertCanReview(user);
  await getSupplierForAccess(supplierId);

  const documentType = await prisma.documentType.findFirst({
    where: { id: input.documentTypeId, active: true },
  });
  if (!documentType) {
    throw new AppError(404, 'Document type not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.documentRequest.create({
      data: {
        supplierId,
        reviewerId: user.id,
        documentTypeId: documentType.id,
        message: input.message,
        status: DocumentRequestStatus.OPEN,
      },
      include: {
        documentType: true,
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    const supplier = await tx.supplier.update({
      where: { id: supplierId },
      data: { status: SupplierStatus.NEEDS_INFORMATION },
    });

    return { request, supplier };
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'DOCUMENT_REQUEST_CREATED',
    entityType: 'Supplier',
    entityId: supplierId,
    metadata: {
      documentTypeId: documentType.id,
      documentTypeCode: documentType.code,
      message: input.message,
    },
  });

  return result;
}

export async function correctSupplierDetails(
  user: AuthUser,
  supplierId: string,
  input: SupplierCorrectionInput,
) {
  assertCanReview(user);
  const supplier = await getSupplierForAccess(supplierId);

  const previous = {
    companyName: supplier.companyName,
    legalName: supplier.legalName,
    tradingName: supplier.tradingName,
    registrationNumber: supplier.registrationNumber,
    contactPerson: supplier.contactPerson,
    contactEmail: supplier.contactEmail,
    notes: supplier.notes,
  };

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
      ...(input.tradingName !== undefined ? { tradingName: input.tradingName } : {}),
      ...(input.registrationNumber !== undefined
        ? { registrationNumber: input.registrationNumber }
        : {}),
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.contactEmail !== undefined
        ? { contactEmail: input.contactEmail.toLowerCase() }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'SUPPLIER_MANUAL_CORRECTION',
    entityType: 'Supplier',
    entityId: supplierId,
    metadata: {
      reason: input.reason,
      previous,
      next: {
        companyName: updated.companyName,
        legalName: updated.legalName,
        tradingName: updated.tradingName,
        registrationNumber: updated.registrationNumber,
        contactPerson: updated.contactPerson,
        contactEmail: updated.contactEmail,
        notes: updated.notes,
      },
    },
  });

  return updated;
}

export async function listActiveChecklistItems(user: AuthUser) {
  assertCanReview(user);
  return prisma.checklistItem.findMany({
    where: { isActive: true },
    include: { documentType: true },
    orderBy: { title: 'asc' },
  });
}
