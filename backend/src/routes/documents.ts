import { Router } from 'express';
import { paramId } from '../lib/params';
import { authenticate } from '../middleware/authenticate';
import { getDocumentForDownload } from '../services/documentService';

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get('/:id/download', async (req, res, next) => {
  try {
    const { document, absolutePath } = await getDocumentForDownload(
      req.user!,
      paramId(req.params.id),
    );

    res.download(absolutePath, document.originalFilename, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});
