import { UserRole, type Supplier } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';

export async function getSupplierForAccess(supplierId: string): Promise<Supplier> {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    throw new AppError(404, 'Supplier not found');
  }
  return supplier;
}

export function assertCanViewSupplier(user: AuthUser, supplier: Supplier): void {
  if (user.role === UserRole.ADMIN || user.role === UserRole.REVIEWER) {
    return;
  }

  if (user.role === UserRole.SUPPLIER_CONTACT && supplier.contactUserId === user.id) {
    return;
  }

  throw new AppError(403, 'You do not have permission to view this supplier');
}

export function assertCanManageSupplier(user: AuthUser, supplier: Supplier): void {
  if (user.role === UserRole.SUPPLIER_CONTACT && supplier.contactUserId === user.id) {
    return;
  }

  throw new AppError(403, 'You do not have permission to modify this supplier');
}

export function assertCanDownloadDocument(
  user: AuthUser,
  supplier: Supplier,
): void {
  assertCanViewSupplier(user, supplier);
}

export function assertCanReview(user: AuthUser): void {
  if (user.role === UserRole.REVIEWER || user.role === UserRole.ADMIN) {
    return;
  }
  throw new AppError(403, 'Only reviewers can perform this action');
}
