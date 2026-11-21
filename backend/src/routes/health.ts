import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'docverify-ai-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});
