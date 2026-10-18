import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { insertFixture } from './helpers/fixtures.js';
import { createTestApp, createTestDb } from './helpers/testDb.js';

const validBody = {
  fullName: '  Katherine Johnson  ',
  email: 'Katherine@ACME.example',
  jobTitle: 'QA Engineer',
  department: 'Engineering',
  countryCode: 'CA',
  annualSalary: 95_000,
  employmentType: 'FULL_TIME',
  hireDate: '2025-05-05',
};

let app: Express;

beforeEach(() => {
  const db = createTestDb();
  insertFixture(db);
  app = createTestApp(db);
});

async function listNames(query: Record<string, string | number>): Promise<string[]> {
  const res = await request(app).get('/api/employees').query(query);
  expect(res.status).toBe(200);
  return (res.body.items as { fullName: string }[]).map((e) => e.fullName);
}

describe('GET /api/employees', () => {
  it('returns the first page sorted by fullName with defaults', async () => {
    const res = await request(app).get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 8, page: 1, pageSize: 25 });
    expect(res.body.items).toHaveLength(8);
    expect(res.body.items[0]).toEqual({
      id: 1,
      employeeCode: 'EMP-000001',
      fullName: 'Ada Lovelace',
      email: 'ada@acme.example',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      countryCode: 'US',
      currency: 'USD',
      annualSalary: 100_000,
      annualSalaryUsd: 100_000,
      employmentType: 'FULL_TIME',
      hireDate: '2020-01-15',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
    });
  });

  it('paginates', async () => {
    const res = await request(app).get('/api/employees').query({ page: 2, pageSize: 3 });

    expect(res.body).toMatchObject({ total: 8, page: 2, pageSize: 3 });
    expect(res.body.items.map((e: { fullName: string }) => e.fullName)).toEqual([
      'Hans Muller',
      'Priya Sharma',
      'Rahul Gupta',
    ]);
  });

  it('returns an empty page past the end', async () => {
    const res = await request(app).get('/api/employees').query({ page: 5, pageSize: 3 });

    expect(res.body).toMatchObject({ items: [], total: 8, page: 5 });
  });

  it.each([
    [{ country: 'IN' }, ['Priya Sharma', 'Rahul Gupta', 'Ravi Iyer']],
    [{ country: 'in' }, ['Priya Sharma', 'Rahul Gupta', 'Ravi Iyer']],
    [{ department: 'Sales' }, ['Hans Muller', 'Sam Taylor']],
    [
      { jobTitle: 'Software Engineer' },
      ['Ada Lovelace', 'Alan Turing', 'Priya Sharma', 'Rahul Gupta'],
    ],
    [{ country: 'IN', jobTitle: 'Software Engineer' }, ['Priya Sharma', 'Rahul Gupta']],
    [{ country: '' }, expect.arrayContaining(['Ada Lovelace', 'Sam Taylor'])],
  ])('filters by %o', async (query, expected) => {
    expect(await listNames(query)).toEqual(expected);
  });

  it.each([
    ['RA', ['Grace Hopper', 'Rahul Gupta', 'Ravi Iyer']], // name or email, any case
    ['ADA@', ['Ada Lovelace']], // email
    ['emp-000007', ['Hans Muller']], // employee code
    ['%', []], // LIKE wildcards are matched literally
  ])('searches name/email/code case-insensitively for "%s"', async (search, expected) => {
    expect(await listNames({ search })).toEqual(expected);
  });

  it('sorts by annualSalaryUsd across currencies, both directions', async () => {
    const desc = await listNames({ sortBy: 'annualSalaryUsd', sortDir: 'desc' });
    const asc = await listNames({ sortBy: 'annualSalaryUsd', sortDir: 'asc' });

    expect(desc).toEqual([
      'Grace Hopper', // $200,000
      'Alan Turing', // £80,000 = $101,600
      'Ada Lovelace', // $100,000
      'Sam Taylor', // $60,000
      'Hans Muller', // €50,000 = $54,000
      'Ravi Iyer', // ₹4,000,000 = $48,000
      'Rahul Gupta', // ₹3,000,000 = $36,000
      'Priya Sharma', // ₹2,000,000 = $24,000
    ]);
    expect(asc).toEqual([...desc].reverse());
  });

  it('sorts by other whitelisted fields', async () => {
    expect(await listNames({ sortBy: 'hireDate', pageSize: 2 })).toEqual([
      'Hans Muller',
      'Grace Hopper',
    ]);
    expect(await listNames({ sortBy: 'employeeCode', sortDir: 'desc', pageSize: 1 })).toEqual([
      'Sam Taylor',
    ]);
  });

  it.each([
    [{ pageSize: 101 }, 'pageSize'],
    [{ pageSize: 0 }, 'pageSize'],
    [{ page: 0 }, 'page'],
    [{ page: 'two' }, 'page'],
    [{ sortBy: 'email' }, 'sortBy'],
    [{ sortDir: 'up' }, 'sortDir'],
  ])('rejects invalid query %o with 400', async (query, path) => {
    const res = await request(app).get('/api/employees').query(query);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ path, message: expect.any(String) }]);
  });

  it('accepts the maximum pageSize of 100', async () => {
    const res = await request(app).get('/api/employees').query({ pageSize: 100 });

    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(100);
  });
});

describe('GET /api/employees/:id', () => {
  it('returns the employee', async () => {
    const res = await request(app).get('/api/employees/3');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      fullName: 'Alan Turing',
      currency: 'GBP',
      annualSalary: 80_000,
      annualSalaryUsd: 101_600,
    });
  });

  it('returns 404 for a missing id', async () => {
    const res = await request(app).get('/api/employees/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/employees/abc');

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('id');
  });
});

describe('POST /api/employees', () => {
  it('creates an employee from normalised input', async () => {
    const res = await request(app).post('/api/employees').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 9,
      employeeCode: 'EMP-000009',
      fullName: 'Katherine Johnson',
      email: 'katherine@acme.example',
      currency: 'CAD',
      annualSalaryUsd: 69_350,
    });
    expect((await request(app).get('/api/employees/9')).body).toEqual(res.body);
  });

  it('reports every invalid field with its path', async () => {
    const res = await request(app).post('/api/employees').send({
      fullName: 'A',
      email: 'not-an-email',
      jobTitle: 'Astronaut',
      department: 'Space',
      countryCode: 'USA',
      annualSalary: 1.5,
      employmentType: 'INTERN',
      hireDate: '2024-02-30',
    });

    expect(res.status).toBe(400);
    const paths = (res.body.error.details as { path: string }[]).map((d) => d.path).sort();
    expect(paths).toEqual([
      'annualSalary',
      'countryCode',
      'department',
      'email',
      'employmentType',
      'fullName',
      'hireDate',
      'jobTitle',
    ]);
  });

  it.each([
    [{ annualSalary: 0 }, 'annualSalary'],
    [{ annualSalary: 100_000_001 }, 'annualSalary'],
    [{ annualSalary: '95000' }, 'annualSalary'],
    [{ fullName: 'x'.repeat(101) }, 'fullName'],
    [{ hireDate: '05/05/2025' }, 'hireDate'],
    [{ hireDate: '2027-01-01' }, 'hireDate'], // in the future
    [{ countryCode: 'FR' }, 'countryCode'], // well-formed but unknown
    [{ department: 'Sales' }, 'jobTitle'], // QA Engineer is not a Sales title
  ])('rejects %o with 400 at %s', async (override, path) => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validBody, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ path, message: expect.any(String) }]);
  });

  it('rejects a missing field', async () => {
    const { email: _omitted, ...body } = validBody;

    const res = await request(app).post('/api/employees').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('email');
  });

  it('returns 409 for an email that already exists (any case)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validBody, email: 'Grace@Acme.Example' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('PUT /api/employees/:id', () => {
  it('replaces the employee and keeps its id and code', async () => {
    const res = await request(app)
      .put('/api/employees/7')
      .send({ ...validBody, email: 'hans@acme.example' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 7,
      employeeCode: 'EMP-000007',
      fullName: 'Katherine Johnson',
      countryCode: 'CA',
    });
  });

  it('returns 404 for a missing id', async () => {
    expect((await request(app).put('/api/employees/999').send(validBody)).status).toBe(404);
  });

  it('returns 409 when taking another employee’s email', async () => {
    const res = await request(app)
      .put('/api/employees/7')
      .send({ ...validBody, email: 'ada@acme.example' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app)
      .put('/api/employees/7')
      .send({ ...validBody, annualSalary: -5 });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('deletes the employee', async () => {
    const res = await request(app).delete('/api/employees/2');

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get('/api/employees/2')).status).toBe(404);
  });

  it('returns 404 for a missing id', async () => {
    expect((await request(app).delete('/api/employees/999')).status).toBe(404);
  });
});
