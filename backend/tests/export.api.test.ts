import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { UTF8_BOM } from '../src/lib/csv.js';
import { insertFixture } from './helpers/fixtures.js';
import { createTestApp, createTestDb } from './helpers/testDb.js';

const HEADER =
  'employeeCode,fullName,email,jobTitle,department,countryCode,currency,' +
  'annualSalary,annualSalaryUsd,employmentType,hireDate';

let app: Express;

beforeEach(() => {
  const db = createTestDb();
  insertFixture(db);
  app = createTestApp(db);
});

async function exportLines(query: Record<string, string> = {}): Promise<string[]> {
  const res = await request(app).get('/api/employees/export.csv').query(query);
  expect(res.status).toBe(200);
  expect(res.text.startsWith(UTF8_BOM)).toBe(true);
  return res.text.slice(UTF8_BOM.length).split('\r\n');
}

describe('GET /api/employees/export.csv', () => {
  it('sends a UTF-8 CSV attachment', async () => {
    const res = await request(app).get('/api/employees/export.csv');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="employees.csv"');
    expect(res.text.codePointAt(0)).toBe(0xfeff); // BOM so Excel detects UTF-8
  });

  it('exports every employee (no paging) with the contract columns, sorted by name', async () => {
    const lines = await exportLines();

    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe(
      'EMP-000001,Ada Lovelace,ada@acme.example,Software Engineer,Engineering,US,USD,' +
        '100000,100000,FULL_TIME,2020-01-15',
    );
    expect(lines[2]).toBe(
      'EMP-000003,Alan Turing,alan@acme.example,Software Engineer,Engineering,GB,GBP,' +
        '80000,101600,FULL_TIME,2021-06-01',
    );
    expect(lines).toHaveLength(1 + 8 + 1); // header, 8 rows, trailing empty after the last CRLF
    expect(lines.at(-1)).toBe('');
  });

  it('applies the same filters and sort as the list', async () => {
    const lines = await exportLines({ country: 'IN', sortBy: 'annualSalaryUsd', sortDir: 'desc' });

    expect(lines.slice(1, -1).map((line) => line.split(',')[1])).toEqual([
      'Ravi Iyer',
      'Rahul Gupta',
      'Priya Sharma',
    ]);
  });

  it('exports only the header when nothing matches', async () => {
    expect(await exportLines({ search: 'nobody' })).toEqual([HEADER, '']);
  });

  it('escapes quotes and commas and neutralises formulas', async () => {
    await request(app)
      .post('/api/employees')
      .send({
        fullName: '=HYPERLINK("http://evil.example", "Click, me")',
        email: 'evil@acme.example',
        jobTitle: 'Legal Counsel',
        department: 'Legal',
        countryCode: 'US',
        annualSalary: 150_000,
        employmentType: 'CONTRACT',
        hireDate: '2025-01-01',
      })
      .expect(201);

    const lines = await exportLines({ search: 'evil' });

    expect(lines[1]).toBe(
      `EMP-000009,"'=HYPERLINK(""http://evil.example"", ""Click, me"")",evil@acme.example,` +
        'Legal Counsel,Legal,US,USD,150000,150000,CONTRACT,2025-01-01',
    );
  });

  it('rejects an invalid sort with 400', async () => {
    const res = await request(app).get('/api/employees/export.csv?sortBy=salary');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
