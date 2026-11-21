import { SupplierStatus, UserRole } from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';
import type { CreateSupplierInput, UpdateSupplierInput } from '../validators/supplier';
import {
  assertCanManageSupplier,
  assertCanViewSupplier,
  getSupplierForAccess,
} from './accessControl';

const supplierInclude = {
  documents: {
    include: { documentType: true },
    orderBy: { uploadedAt: 'desc' as const },
  },
  documentRequests: {
    include: { documentType: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

export async function createSupplier(user: AuthUser, input: CreateSupplierInput) {
  if (user.role !== UserRole.SUPPLIER_CONTACT) {
    throw new AppError(403, 'Only supplier contacts can create a supplier profile');
  }

  const existing = await prisma.supplier.findUnique({
    where: { contactUserId: user.id },
  });
  if (existing) {
    throw new AppError(409, 'Supplier profile already exists for this account');
  }

  const supplier = await prisma.supplier.create({
    data: {
      companyName: input.companyName,
      legalName: input.legalName,
      tradingName: input.tradingName || null,
      registrationNumber: input.registrationNumber || null,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail.toLowerCase(),
      notes: input.notes || null,
      contactUserId: user.id,
      status: SupplierStatus.DRAFT,
    },
    include: supplierInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'SUPPLIER_CREATED',
    entityType: 'Supplier',
    entityId: supplier.id,
    metadata: { companyName: supplier.companyName },
  });

  return supplier;
}

export async function listSuppliers(user: AuthUser) {
  if (user.role === UserRole.SUPPLIER_CONTACT) {
    const suppliers = await prisma.supplier.findMany({
      where: { contactUserId: user.id },
      include: supplierInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return suppliers;
  }

  if (user.role === UserRole.REVIEWER || user.role === UserRole.ADMIN) {
    return prisma.supplier.findMany({
      include: supplierInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  throw new AppError(403, 'You do not have permission to list suppliers');
}

export async function getSupplierById(user: AuthUser, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      ...supplierInclude,
      contactUser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!supplier) {
    throw new AppError(404, 'Supplier not found');
  }

  assertCanViewSupplier(user, supplier);
  return supplier;
}

export async function updateSupplier(
  user: AuthUser,
  supplierId: string,
  input: UpdateSupplierInput,
) {
  const supplier = await getSupplierForAccess(supplierId);
  assertCanManageSupplier(user, supplier);

  if (
    supplier.status === SupplierStatus.APPROVED ||
    supplier.status === SupplierStatus.IN_REVIEW
  ) {
    throw new AppError(409, 'Supplier profile cannot be edited while in review or approved');
  }

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
      ...(input.tradingName !== undefined ? { tradingName: input.tradingName || null } : {}),
      ...(input.registrationNumber !== undefined
        ? { registrationNumber: input.registrationNumber || null }
        : {}),
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.contactEmail !== undefined
        ? { contactEmail: input.contactEmail.toLowerCase() }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
    include: supplierInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'SUPPLIER_UPDATED',
    entityType: 'Supplier',
    entityId: updated.id,
  });

  return updated;
}

export async function submitSupplier(user: AuthUser, supplierId: string) {
  const supplier = await getSupplierForAccess(supplierId);
  assertCanManageSupplier(user, supplier);

  if (
    supplier.status !== SupplierStatus.DRAFT &&
    supplier.status !== SupplierStatus.NEEDS_INFORMATION
  ) {
    throw new AppError(409, 'Only draft or needs-information packets can be submitted');
  }

  const requiredTypes = await prisma.documentType.findMany({
    where: { required: true, active: true },
  });

  const activeDocuments = await prisma.supplierDocument.findMany({
    where: { supplierId, status: 'ACTIVE' },
  });

  const activeTypeIds = new Set(activeDocuments.map((doc) => doc.documentTypeId));
  const missing = requiredTypes.filter((type) => !activeTypeIds.has(type.id));

  if (missing.length > 0) {
    throw new AppError(
      400,
      `Missing required documents: ${missing.map((type) => type.code).join(', ')}`,
    );
  }

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: { status: SupplierStatus.SUBMITTED },
    include: supplierInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'SUPPLIER_SUBMITTED',
    entityType: 'Supplier',
    entityId: updated.id,
  });

  return updated;
}

export async function listSupplierRequests(user: AuthUser, supplierId: string) {
  const supplier = await getSupplierForAccess(supplierId);
  assertCanViewSupplier(user, supplier);

  return prisma.documentRequest.findMany({
    where: { supplierId },
    include: {
      documentType: true,
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
