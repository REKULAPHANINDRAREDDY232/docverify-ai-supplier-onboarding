import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { ensureUploadRoot } from './lib/storage';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { documentTypesRouter } from './routes/documentTypes';
import { documentsRouter } from './routes/documents';
import { healthRouter } from './routes/health';
import { suppliersRouter } from './routes/suppliers';

export function createApp() {
  void ensureUploadRoot();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: 'DocVerify AI Supplier Onboarding API',
        version: '1.0.0',
      },
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/document-types', documentTypesRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
