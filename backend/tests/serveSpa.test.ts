import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createTestDb } from './helpers/testDb.js';

describe('serving the built frontend (STATIC_DIR)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'esms-spa-'));
  writeFileSync(path.join(dir, 'index.html'), '<app-root></app-root>');
  writeFileSync(path.join(dir, 'main-ABC123.js'), 'console.log(1);');
  const app = createApp({ db: createTestDb(), staticDir: dir });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('serves index.html at the root', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<app-root>');
  });

  it('serves index.html for client-side routes so deep links work, without caching it', async () => {
    const res = await request(app).get('/insights');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<app-root>');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves built assets as files', async () => {
    const res = await request(app).get('/main-ABC123.js');

    expect(res.status).toBe(200);
    expect(res.text).toBe('console.log(1);');
  });

  it('still answers the API, and unknown API paths stay JSON 404s', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });

    const missing = await request(app).get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a missing asset instead of index.html', async () => {
    const res = await request(app).get('/missing.js');

    expect(res.status).toBe(404);
  });

  it('refuses to start when the directory has no index.html', () => {
    expect(() =>
      createApp({ db: createTestDb(), staticDir: tmpdir() + '/does-not-exist' }),
    ).toThrow(/no index\.html/);
  });
});
