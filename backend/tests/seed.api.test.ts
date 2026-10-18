import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/testDb.js';

let app: Express;

beforeEach(() => {
  app = createTestApp();
});

describe('GET /api/seed/status', () => {
  it('reports an empty database', async () => {
    const res = await request(app).get('/api/seed/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ employeeCount: 0, isEmpty: true });
  });
});

describe('POST /api/seed', () => {
  it('seeds 100 employees into an empty database', async () => {
    const res = await request(app).post('/api/seed').send({ count: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 100 });
    expect((await request(app).get('/api/seed/status')).body).toEqual({
      employeeCount: 100,
      isEmpty: false,
    });
    expect((await request(app).get('/api/employees')).body.total).toBe(100);
  });

  it('seeds the full 10,000 employees', async () => {
    const res = await request(app).post('/api/seed').send({ count: 10_000 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 10_000 });
  });

  it('refuses with 409 when employees already exist', async () => {
    await request(app).post('/api/seed').send({ count: 100 }).expect(201);

    const res = await request(app).post('/api/seed').send({ count: 100 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect((await request(app).get('/api/seed/status')).body.employeeCount).toBe(100);
  });

  it.each([{ count: 50 }, { count: '100' }, { count: 10_001 }, {}])(
    'rejects %o with 400',
    async (body) => {
      const res = await request(app).post('/api/seed').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].path).toBe('count');
    },
  );

  it('rejects a request without a body with 400', async () => {
    expect((await request(app).post('/api/seed')).status).toBe(400);
  });
});
