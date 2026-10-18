import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/lib/errors.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

/** A tiny app whose routes throw specific errors, finished by the real error handler. */
function buildThrowingApp() {
  const app = express();
  app.use(express.json());
  app.get('/not-found', () => {
    throw new NotFoundError('Employee 42 not found');
  });
  app.get('/validation', () => {
    throw new ValidationError('Request validation failed', [
      { path: 'email', message: 'Invalid email' },
    ]);
  });
  app.get('/conflict', () => {
    throw new ConflictError('Email already exists');
  });
  app.get('/zod', () => {
    z.object({ email: z.email(), address: z.object({ city: z.string() }) }).parse({
      email: 'nope',
      address: {},
    });
  });
  app.get('/async-boom', async () => {
    throw new Error('secret internal detail');
  });
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  const app = buildThrowingApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['/not-found', 404, 'NOT_FOUND', 'Employee 42 not found'],
    ['/conflict', 409, 'CONFLICT', 'Email already exists'],
  ])('maps AppError subclass at %s to %i %s', async (path, status, code, message) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { code, message } });
  });

  it('maps ValidationError to 400 including details', async () => {
    const res = await request(app).get('/validation');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ path: 'email', message: 'Invalid email' }],
      },
    });
  });

  it('maps ZodError to 400 VALIDATION_ERROR with {path, message} details', async () => {
    const res = await request(app).get('/zod');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = (res.body.error.details as { path: string; message: string }[]).map(
      (d) => d.path,
    );
    expect(paths).toEqual(expect.arrayContaining(['email', 'address.city']));
    for (const detail of res.body.error.details) {
      expect(typeof detail.message).toBe('string');
    }
  });

  it('maps an unexpected (async) Error to 500 INTERNAL_ERROR without leaking details', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(res.text).not.toContain('secret internal detail');
    expect(res.text).not.toMatch(/at .+\.ts/);
    expect(consoleSpy).toHaveBeenCalledOnce();
  });

  it('maps malformed JSON bodies to 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"fullName": "Ada",');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON in request body' },
    });
  });

  it('maps malformed JSON to 400 on the real app too', async () => {
    const res = await request(createApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
