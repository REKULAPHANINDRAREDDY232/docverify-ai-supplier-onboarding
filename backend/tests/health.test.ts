import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  const app = createApp();

  it('returns service health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('docverify-ai-backend');
  });
});
