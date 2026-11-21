import { Prisma, SupplierStatus, UserRole } from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import { hashPassword } from '../lib/password';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  DocumentTypeCreateInput,
  DocumentTypeUpdateInput,
  ReferenceSourceCreateInput,
  ReferenceSourceUpdateInput,
} from '../validators/admin';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getAdminDashboard(_user: AuthUser) {
  const [
    totalSuppliers,
    draft,
    submitted,
    inReview,
    needsInformation,
    approved,
    onHold,
    totalUsers,
    activeUsers,
    documentTypes,
    checklistItems,
  ] = await Promise.all([
    prisma.supplier.count(),
    prisma.supplier.count({ where: { status: SupplierStatus.DRAFT } }),
    prisma.supplier.count({ where: { status: SupplierStatus.SUBMITTED } }),
    prisma.supplier.count({ where: { status: SupplierStatus.IN_REVIEW } }),
    prisma.supplier.count({ where: { status: SupplierStatus.NEEDS_INFORMATION } }),
    prisma.supplier.count({ where: { status: SupplierStatus.APPROVED } }),
    prisma.supplier.count({ where: { status: SupplierStatus.ON_HOLD } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.documentType.count({ where: { active: true } }),
    prisma.checklistItem.count({ where: { isActive: true } }),
  ]);

  return {
    suppliers: {
      total: totalSuppliers,
      byStatus: {
        DRAFT: draft,
        SUBMITTED: submitted,
        IN_REVIEW: inReview,
        NEEDS_INFORMATION: needsInformation,
        APPROVED: approved,
        ON_HOLD: onHold,
      },
    },
    users: { total: totalUsers, active: activeUsers },
    catalogue: { documentTypes, checklistItems },
  };
}

export async function listAdminUsers(query: {
  q?: string;
  role?: UserRole;
  isActive?: boolean;
}) {
  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: userPublicSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAdminUser(actor: AuthUser, input: AdminCreateUserInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      role: input.role,
      isActive: true,
    },
    select: userPublicSelect,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'ADMIN_USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  return user;
}

export async function updateAdminUser(
  actor: AuthUser,
  userId: string,
  input: AdminUpdateUserInput,
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  if (existing.id === actor.id && input.isActive === false) {
    throw new AppError(400, 'Administrators cannot deactivate their own account');
  }

  if (
    existing.id === actor.id &&
    input.role &&
    input.role !== UserRole.ADMIN
  ) {
    throw new AppError(400, 'Administrators cannot remove their own ADMIN role');
  }

  if (
    existing.role === UserRole.ADMIN &&
    input.role &&
    input.role !== UserRole.ADMIN
  ) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    if (adminCount <= 1) {
      throw new AppError(400, 'At least one active administrator must remain');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: userPublicSelect,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'ADMIN_USER_UPDATED',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      previous: {
        name: existing.name,
        role: existing.role,
        isActive: existing.isActive,
      },
      next: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    },
  });

  return user;
}

export async function listAdminSuppliers(query: { q?: string; status?: SupplierStatus }) {
  const where: Prisma.SupplierWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { companyName: { contains: query.q, mode: 'insensitive' } },
      { legalName: { contains: query.q, mode: 'insensitive' } },
      { contactEmail: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return prisma.supplier.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      contactUser: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
      _count: {
        select: {
          documents: true,
          documentRequests: true,
          reviewActions: true,
        },
      },
    },
  });
}

export async function listDocumentTypesAdmin() {
  return prisma.documentType.findMany({ orderBy: { code: 'asc' } });
}

export async function createDocumentType(actor: AuthUser, input: DocumentTypeCreateInput) {
  try {
    const documentType = await prisma.documentType.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        required: input.required,
        active: input.active,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: 'ADMIN_DOCUMENT_TYPE_CREATED',
      entityType: 'DocumentType',
      entityId: documentType.id,
      metadata: { code: documentType.code },
    });

    return documentType;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'Document type code already exists');
    }
    throw error;
  }
}

export async function updateDocumentType(
  actor: AuthUser,
  id: string,
  input: DocumentTypeUpdateInput,
) {
  const existing = await prisma.documentType.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Document type not found');
  }

  try {
    const documentType = await prisma.documentType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: 'ADMIN_DOCUMENT_TYPE_UPDATED',
      entityType: 'DocumentType',
      entityId: documentType.id,
      metadata: {
        previous: existing,
        next: documentType,
      },
    });

    return documentType;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'Document type code already exists');
    }
    throw error;
  }
}

export async function listChecklistItemsAdmin() {
  return prisma.checklistItem.findMany({
    include: { documentType: true },
    orderBy: [{ isActive: 'desc' }, { title: 'asc' }],
  });
}

export async function createChecklistItem(actor: AuthUser, input: ChecklistItemCreateInput) {
  if (input.documentTypeId) {
    const type = await prisma.documentType.findUnique({ where: { id: input.documentTypeId } });
    if (!type) {
      throw new AppError(404, 'Document type not found');
    }
  }

  const item = await prisma.checklistItem.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      documentTypeId: input.documentTypeId ?? null,
      isRequired: input.isRequired,
      isActive: input.isActive,
      version: input.version,
      effectiveDate: input.effectiveDate,
    },
    include: { documentType: true },
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'ADMIN_CHECKLIST_ITEM_CREATED',
    entityType: 'ChecklistItem',
    entityId: item.id,
    metadata: { title: item.title, version: item.version },
  });

  return item;
}

export async function updateChecklistItem(
  actor: AuthUser,
  id: string,
  input: ChecklistItemUpdateInput,
) {
  const existing = await prisma.checklistItem.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Checklist item not found');
  }

  if (input.documentTypeId) {
    const type = await prisma.documentType.findUnique({ where: { id: input.documentTypeId } });
    if (!type) {
      throw new AppError(404, 'Document type not found');
    }
  }

  const item = await prisma.checklistItem.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.documentTypeId !== undefined ? { documentTypeId: input.documentTypeId } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.version !== undefined ? { version: input.version } : {}),
      ...(input.effectiveDate !== undefined ? { effectiveDate: input.effectiveDate } : {}),
    },
    include: { documentType: true },
  });

  await writeAuditLog({
    actorId: actor.id,
    action: 'ADMIN_CHECKLIST_ITEM_UPDATED',
    entityType: 'ChecklistItem',
    entityId: item.id,
    metadata: {
      previous: {
        title: existing.title,
        isActive: existing.isActive,
        version: existing.version,
        documentTypeId: existing.documentTypeId,
      },
      next: {
        title: item.title,
        isActive: item.isActive,
        version: item.version,
        documentTypeId: item.documentTypeId,
      },
    },
  });

  return item;
}

export async function listReferenceSourcesAdmin() {
  return prisma.referenceSource.findMany({ orderBy: [{ title: 'asc' }, { version: 'asc' }] });
}

export async function createReferenceSource(
  actor: AuthUser,
  input: ReferenceSourceCreateInput,
) {
  try {
    const source = await prisma.referenceSource.create({
      data: {
        title: input.title,
        version: input.version,
        effectiveDate: input.effectiveDate,
        sourceDescription: input.sourceDescription,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: 'ADMIN_REFERENCE_SOURCE_CREATED',
      entityType: 'ReferenceSource',
      entityId: source.id,
      metadata: { title: source.title, version: source.version },
    });

    return source;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'Reference source title and version already exist');
    }
    throw error;
  }
}

export async function updateReferenceSource(
  actor: AuthUser,
  id: string,
  input: ReferenceSourceUpdateInput,
) {
  const existing = await prisma.referenceSource.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Reference source not found');
  }

  try {
    const source = await prisma.referenceSource.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.effectiveDate !== undefined ? { effectiveDate: input.effectiveDate } : {}),
        ...(input.sourceDescription !== undefined
          ? { sourceDescription: input.sourceDescription }
          : {}),
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: 'ADMIN_REFERENCE_SOURCE_UPDATED',
      entityType: 'ReferenceSource',
      entityId: source.id,
      metadata: { previous: existing, next: source },
    });

    return source;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'Reference source title and version already exist');
    }
    throw error;
  }
}

export async function listAdminAuditLogs(query: {
  q?: string;
  action?: string;
  entityType?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
  if (query.entityType) where.entityType = query.entityType;
  if (query.q) {
    where.OR = [
      { action: { contains: query.q, mode: 'insensitive' } },
      { entityType: { contains: query.q, mode: 'insensitive' } },
      { entityId: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
