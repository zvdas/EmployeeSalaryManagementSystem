import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/testDb.js';

describe('GET /api/health', () => {
  const app = createTestApp();

  it('returns 200 { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 NOT_FOUND in the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });
});
