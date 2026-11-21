import { Router } from 'express';
import { paramId } from '../lib/params';
import { authenticate } from '../middleware/authenticate';
import { uploadDocument } from '../middleware/upload';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { uploadSupplierDocument, listSupplierDocuments } from '../services/documentService';
import {
  createSupplier,
  getSupplierById,
  listSupplierRequests,
  listSuppliers,
  submitSupplier,
  updateSupplier,
} from '../services/supplierService';
import {
  createSupplierSchema,
  updateSupplierSchema,
  uploadDocumentSchema,
} from '../validators/supplier';

export const suppliersRouter = Router();

suppliersRouter.use(authenticate);

suppliersRouter.post('/', validateBody(createSupplierSchema), async (req, res, next) => {
  try {
    const supplier = await createSupplier(req.user!, req.body);
    res.status(201).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.get('/', async (req, res, next) => {
  try {
    const suppliers = await listSuppliers(req.user!);
    res.status(200).json({ success: true, data: { suppliers } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.get('/:id', async (req, res, next) => {
  try {
    const supplier = await getSupplierById(req.user!, paramId(req.params.id));
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.patch('/:id', validateBody(updateSupplierSchema), async (req, res, next) => {
  try {
    const supplier = await updateSupplier(req.user!, paramId(req.params.id), req.body);
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.post('/:id/submit', async (req, res, next) => {
  try {
    const supplier = await submitSupplier(req.user!, paramId(req.params.id));
    res.status(200).json({ success: true, data: { supplier } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.get('/:id/requests', async (req, res, next) => {
  try {
    const requests = await listSupplierRequests(req.user!, paramId(req.params.id));
    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.get('/:id/documents', async (req, res, next) => {
  try {
    const documents = await listSupplierDocuments(req.user!, paramId(req.params.id));
    res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    next(error);
  }
});

suppliersRouter.post('/:id/documents', (req, res, next) => {
  uploadDocument(req, res, (error) => {
    if (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      if (error instanceof Error && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(400, 'File exceeds the 10 MB upload limit'));
        return;
      }
      next(error);
      return;
    }

    const parsed = uploadDocumentSchema.safeParse({
      documentTypeId: req.body.documentTypeId,
      replaceDocumentId: req.body.replaceDocumentId || undefined,
    });

    if (!parsed.success) {
      next(
        new AppError(
          400,
          parsed.error.issues.map((issue) => issue.message).join('; '),
        ),
      );
      return;
    }

    uploadSupplierDocument(req.user!, paramId(req.params.id), parsed.data, req.file)
      .then((document) => {
        res.status(201).json({ success: true, data: { document } });
      })
      .catch(next);
  });
});
