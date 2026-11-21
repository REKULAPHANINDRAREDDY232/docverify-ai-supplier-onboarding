import { Router } from 'express';
import { SupplierStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { paramId } from '../lib/params';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createAdminUser,
  createChecklistItem,
  createDocumentType,
  createReferenceSource,
  getAdminDashboard,
  listAdminAuditLogs,
  listAdminSuppliers,
  listAdminUsers,
  listChecklistItemsAdmin,
  listDocumentTypesAdmin,
  listReferenceSourcesAdmin,
  updateAdminUser,
  updateChecklistItem,
  updateDocumentType,
  updateReferenceSource,
} from '../services/adminService';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminUserQuerySchema,
  auditLogQuerySchema,
  checklistItemCreateSchema,
  checklistItemUpdateSchema,
  documentTypeCreateSchema,
  documentTypeUpdateSchema,
  referenceSourceCreateSchema,
  referenceSourceUpdateSchema,
} from '../validators/admin';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize(UserRole.ADMIN));

adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const data = await getAdminDashboard(req.user!);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const query = adminUserQuerySchema.parse(req.query);
    const users = await listAdminUsers(query);
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const input = adminCreateUserSchema.parse(req.body);
    const user = await createAdminUser(req.user!, input);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const input = adminUpdateUserSchema.parse(req.body);
    const user = await updateAdminUser(req.user!, paramId(req.params.id), input);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/suppliers', async (req, res, next) => {
  try {
    const query = z
      .object({
        q: z.string().trim().max(200).optional(),
        status: z.nativeEnum(SupplierStatus).optional(),
      })
      .parse(req.query);
    const suppliers = await listAdminSuppliers(query);
    res.status(200).json({ success: true, data: { suppliers } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/document-types', async (_req, res, next) => {
  try {
    const documentTypes = await listDocumentTypesAdmin();
    res.status(200).json({ success: true, data: { documentTypes } });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/document-types', async (req, res, next) => {
  try {
    const input = documentTypeCreateSchema.parse(req.body);
    const documentType = await createDocumentType(req.user!, input);
    res.status(201).json({ success: true, data: { documentType } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/document-types/:id', async (req, res, next) => {
  try {
    const input = documentTypeUpdateSchema.parse(req.body);
    const documentType = await updateDocumentType(req.user!, paramId(req.params.id), input);
    res.status(200).json({ success: true, data: { documentType } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/checklists', async (_req, res, next) => {
  try {
    const checklistItems = await listChecklistItemsAdmin();
    res.status(200).json({ success: true, data: { checklistItems } });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/checklists', async (req, res, next) => {
  try {
    const input = checklistItemCreateSchema.parse(req.body);
    const checklistItem = await createChecklistItem(req.user!, input);
    res.status(201).json({ success: true, data: { checklistItem } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/checklists/:id', async (req, res, next) => {
  try {
    const input = checklistItemUpdateSchema.parse(req.body);
    const checklistItem = await updateChecklistItem(req.user!, paramId(req.params.id), input);
    res.status(200).json({ success: true, data: { checklistItem } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/reference-sources', async (_req, res, next) => {
  try {
    const referenceSources = await listReferenceSourcesAdmin();
    res.status(200).json({ success: true, data: { referenceSources } });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/reference-sources', async (req, res, next) => {
  try {
    const input = referenceSourceCreateSchema.parse(req.body);
    const referenceSource = await createReferenceSource(req.user!, input);
    res.status(201).json({ success: true, data: { referenceSource } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/reference-sources/:id', async (req, res, next) => {
  try {
    const input = referenceSourceUpdateSchema.parse(req.body);
    const referenceSource = await updateReferenceSource(req.user!, paramId(req.params.id), input);
    res.status(200).json({ success: true, data: { referenceSource } });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const query = auditLogQuerySchema.parse(req.query);
    const auditLogs = await listAdminAuditLogs(query);
    res.status(200).json({ success: true, data: { auditLogs } });
  } catch (error) {
    next(error);
  }
});
