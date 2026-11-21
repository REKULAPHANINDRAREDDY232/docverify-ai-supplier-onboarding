import { Router } from 'express';
import { paramId } from '../lib/params';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import {
  correctSupplierDetails,
  createDocumentRequest,
  getReviewerDashboard,
  getReviewerSupplierDetail,
  listActiveChecklistItems,
  listReviewerSuppliers,
  recordReviewDecision,
  upsertChecklistCheck,
} from '../services/reviewerService';
import {
  checklistCheckSchema,
  documentRequestSchema,
  reviewDecisionSchema,
  reviewerSupplierQuerySchema,
  supplierCorrectionSchema,
} from '../validators/reviewer';

export const reviewerRouter = Router();

reviewerRouter.use(authenticate);

reviewerRouter.get('/dashboard', async (req, res, next) => {
  try {
    const data = await getReviewerDashboard(req.user!);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

reviewerRouter.get('/checklist-items', async (req, res, next) => {
  try {
    const checklistItems = await listActiveChecklistItems(req.user!);
    res.status(200).json({ success: true, data: { checklistItems } });
  } catch (error) {
    next(error);
  }
});

reviewerRouter.get('/suppliers', async (req, res, next) => {
  try {
    const parsed = reviewerSupplierQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(
        400,
        parsed.error.issues.map((issue) => issue.message).join('; '),
      );
    }

    const suppliers = await listReviewerSuppliers(req.user!, parsed.data);
    res.status(200).json({ success: true, data: { suppliers } });
  } catch (error) {
    next(error);
  }
});

reviewerRouter.get('/suppliers/:id', async (req, res, next) => {
  try {
    const data = await getReviewerSupplierDetail(req.user!, paramId(req.params.id));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

reviewerRouter.put(
  '/suppliers/:id/checklist/:itemId',
  validateBody(checklistCheckSchema),
  async (req, res, next) => {
    try {
      const check = await upsertChecklistCheck(
        req.user!,
        paramId(req.params.id),
        paramId(req.params.itemId, 'itemId'),
        req.body,
      );
      res.status(200).json({ success: true, data: { check } });
    } catch (error) {
      next(error);
    }
  },
);

reviewerRouter.post(
  '/suppliers/:id/decisions',
  validateBody(reviewDecisionSchema),
  async (req, res, next) => {
    try {
      const result = await recordReviewDecision(req.user!, paramId(req.params.id), req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

reviewerRouter.post(
  '/suppliers/:id/document-requests',
  validateBody(documentRequestSchema),
  async (req, res, next) => {
    try {
      const result = await createDocumentRequest(req.user!, paramId(req.params.id), req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

reviewerRouter.patch(
  '/suppliers/:id/corrections',
  validateBody(supplierCorrectionSchema),
  async (req, res, next) => {
    try {
      const supplier = await correctSupplierDetails(req.user!, paramId(req.params.id), req.body);
      res.status(200).json({ success: true, data: { supplier } });
    } catch (error) {
      next(error);
    }
  },
);
