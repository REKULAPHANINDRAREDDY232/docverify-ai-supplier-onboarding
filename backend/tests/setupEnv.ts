import { config as loadEnv } from 'dotenv';

// Load local .env for shared non-secret defaults, then force test isolation.
loadEnv({ quiet: true });

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4000';

// Dedicated test database — never reuse the development/production DATABASE_URL.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5434/docverify_ai_test?schema=public';

process.env.JWT_SECRET = process.env.TEST_JWT_SECRET ?? 'test-only-jwt-secret-value';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'false';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads-test';
process.env.MAX_UPLOAD_BYTES = process.env.MAX_UPLOAD_BYTES ?? '10485760';
process.env.QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';

// Ensure seed accounts from development .env are never required by tests.
process.env.SEED_ENABLED = 'false';
