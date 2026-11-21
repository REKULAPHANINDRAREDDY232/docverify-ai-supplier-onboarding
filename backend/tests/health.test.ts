import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('GET /api/health', () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('uses the dedicated test database', async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ db: string }>>(
      'SELECT current_database() AS db',
    );
    expect(rows[0]?.db).toBe('docverify_ai_test');
  });

  it('returns service health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('docverify-ai-backend');
  });
});
