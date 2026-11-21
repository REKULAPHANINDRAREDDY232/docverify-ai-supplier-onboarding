import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
