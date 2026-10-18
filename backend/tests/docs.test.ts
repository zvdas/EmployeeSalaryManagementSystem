import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/testDb.js';

const app = createTestApp();

const EXPECTED_OPERATIONS = [
  'GET /health',
  'GET /meta',
  'GET /seed/status',
  'POST /seed',
  'GET /employees',
  'POST /employees',
  'GET /employees/export.csv',
  'GET /employees/{id}',
  'PUT /employees/{id}',
  'DELETE /employees/{id}',
  'GET /insights/summary',
  'GET /insights/by-country',
  'GET /insights/by-job-title',
  'GET /insights/by-department',
  'GET /insights/distribution',
];

describe('GET /api/openapi.json', () => {
  it('documents every API operation', async () => {
    const res = await request(app).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.servers).toEqual([{ url: '/api' }]);
    const operations = Object.entries(res.body.paths as Record<string, object>).flatMap(
      ([path, item]) => Object.keys(item).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(operations.sort()).toEqual([...EXPECTED_OPERATIONS].sort());
  });

  it('describes request validation from the same zod schemas', async () => {
    const { body } = await request(app).get('/api/openapi.json');

    const pageSize = body.paths['/employees'].get.parameters.find(
      (p: { name: string }) => p.name === 'pageSize',
    );
    expect(pageSize.schema).toMatchObject({ type: 'integer', maximum: 100, default: 25 });
    expect(body.components.schemas.EmployeeInput.required).toEqual(
      expect.arrayContaining(['fullName', 'email', 'annualSalary', 'hireDate']),
    );
    expect(body.components.schemas.Error).toBeDefined();
    expect(body.paths['/employees'].post.responses['409']).toBeDefined();
  });
});

describe('GET /api/docs', () => {
  it('serves the Swagger UI page', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('serves the Swagger UI assets the page references', async () => {
    const page = await request(app).get('/api/docs/');
    const assets = [...page.text.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1]);

    expect(assets).toEqual(expect.arrayContaining(['swagger-ui-bundle.js', 'swagger-ui.css']));
    for (const asset of assets) {
      expect((await request(app).get(`/api/docs/${asset}`)).status).toBe(200);
    }
  });

  it('relaxes the CSP for the docs only', async () => {
    const docs = await request(app).get('/api/docs/');
    const api = await request(app).get('/api/health');

    expect(docs.headers['content-security-policy']).toContain("img-src 'self' data: https:");
    expect(docs.headers['content-security-policy']).toContain("script-src 'self'");
    expect(docs.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(api.headers['content-security-policy']).toContain('upgrade-insecure-requests');
  });
});
