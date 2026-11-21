import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { AppError } from '../middleware/errorHandler';

export const suppliersRouter = Router();

suppliersRouter.use(authenticate);

suppliersRouter.get(
  '/me',
  authorize(UserRole.SUPPLIER_CONTACT),
  async (req, res, next) => {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { contactUserId: req.user!.id },
        include: {
          documents: {
            include: { documentType: true },
            orderBy: { uploadedAt: 'desc' },
          },
        },
      });

      if (!supplier) {
        throw new AppError(404, 'Supplier profile not found');
      }

      res.status(200).json({
        success: true,
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  },
);

suppliersRouter.get('/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        documents: {
          include: { documentType: true },
          orderBy: { uploadedAt: 'desc' },
        },
        contactUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new AppError(404, 'Supplier not found');
    }

    const user = req.user!;
    const isOwner =
      user.role === UserRole.SUPPLIER_CONTACT && supplier.contactUserId === user.id;
    const isStaff = user.role === UserRole.REVIEWER || user.role === UserRole.ADMIN;

    if (!isOwner && !isStaff) {
      throw new AppError(403, 'You do not have permission to view this supplier');
    }

    res.status(200).json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    next(error);
  }
});
