import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

export const documentTypesRouter = Router();

documentTypesRouter.use(authenticate);

documentTypesRouter.get('/', async (_req, res, next) => {
  try {
    const documentTypes = await prisma.documentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: { documentTypes },
    });
  } catch (error) {
    next(error);
  }
});
