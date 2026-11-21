import { config as loadEnv } from 'dotenv';

loadEnv({ quiet: true });

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5434/docverify_ai?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-value';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
process.env.MAX_UPLOAD_BYTES = process.env.MAX_UPLOAD_BYTES ?? '10485760';
process.env.QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
