import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { insertFixture } from './helpers/fixtures.js';
import { createTestApp, createTestDb } from './helpers/testDb.js';

// Expected numbers below are worked out by hand from tests/helpers/fixtures.ts. In USD:
//   US: Ada 100,000 · Grace 200,000 · Sam 60,000
//   GB: Alan £80,000 = 101,600     DE: Hans €50,000 = 54,000
//   IN: Priya ₹2M = 24,000 · Rahul ₹3M = 36,000 · Ravi ₹4M = 48,000
// Sorted: 24,000 36,000 48,000 54,000 60,000 100,000 101,600 200,000 (sum 623,600)

let app: Express;
let emptyApp: Express;

beforeAll(() => {
  const db = createTestDb();
  insertFixture(db);
  app = createTestApp(db);
  emptyApp = createTestApp();
});

async function get(path: string, target: Express = app) {
  const res = await request(target).get(path);
  expect(res.status).toBe(200);
  return res.body;
}

describe('GET /api/insights/summary', () => {
  it('summarises the organisation in USD', async () => {
    expect(await get('/api/insights/summary')).toEqual({
      headcount: 8,
      totalPayrollUsd: 623_600,
      avgSalaryUsd: 77_950, // 623,600 / 8
      medianSalaryUsd: 57_000, // (54,000 + 60,000) / 2
      countryCount: 4, // US, GB, IN, DE
      departmentCount: 3, // Engineering, Product, Sales
    });
  });

  it('returns zeros for an empty database', async () => {
    expect(await get('/api/insights/summary', emptyApp)).toEqual({
      headcount: 0,
      totalPayrollUsd: 0,
      avgSalaryUsd: 0,
      medianSalaryUsd: 0,
      countryCount: 0,
      departmentCount: 0,
    });
  });
});

describe('GET /api/insights/by-country', () => {
  it('returns local and USD stats per country, by headcount (ties by code)', async () => {
    expect(await get('/api/insights/by-country')).toEqual([
      {
        countryCode: 'IN',
        countryName: 'India',
        currency: 'INR',
        headcount: 3,
        minSalary: 2_000_000,
        maxSalary: 4_000_000,
        avgSalary: 3_000_000,
        medianSalary: 3_000_000,
        avgSalaryUsd: 36_000,
        medianSalaryUsd: 36_000,
        totalPayrollUsd: 108_000,
      },
      {
        countryCode: 'US',
        countryName: 'United States',
        currency: 'USD',
        headcount: 3,
        minSalary: 60_000,
        maxSalary: 200_000,
        avgSalary: 120_000,
        medianSalary: 100_000,
        avgSalaryUsd: 120_000,
        medianSalaryUsd: 100_000,
        totalPayrollUsd: 360_000,
      },
      {
        countryCode: 'DE',
        countryName: 'Germany',
        currency: 'EUR',
        headcount: 1,
        minSalary: 50_000,
        maxSalary: 50_000,
        avgSalary: 50_000,
        medianSalary: 50_000,
        avgSalaryUsd: 54_000,
        medianSalaryUsd: 54_000,
        totalPayrollUsd: 54_000,
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        currency: 'GBP',
        headcount: 1,
        minSalary: 80_000,
        maxSalary: 80_000,
        avgSalary: 80_000,
        medianSalary: 80_000,
        avgSalaryUsd: 101_600,
        medianSalaryUsd: 101_600,
        totalPayrollUsd: 101_600,
      },
    ]);
  });

  it('returns an empty list for an empty database', async () => {
    expect(await get('/api/insights/by-country', emptyApp)).toEqual([]);
  });
});

describe('GET /api/insights/by-job-title', () => {
  it('returns local stats per title in the country, by average salary', async () => {
    expect(await get('/api/insights/by-job-title?country=IN')).toEqual([
      {
        jobTitle: 'Product Manager',
        department: 'Product',
        currency: 'INR',
        headcount: 1,
        minSalary: 4_000_000,
        maxSalary: 4_000_000,
        avgSalary: 4_000_000,
        medianSalary: 4_000_000,
      },
      {
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        currency: 'INR',
        headcount: 2,
        minSalary: 2_000_000,
        maxSalary: 3_000_000,
        avgSalary: 2_500_000,
        medianSalary: 2_500_000,
      },
    ]);
  });

  it('accepts a lowercase country code', async () => {
    const titles = (await get('/api/insights/by-job-title?country=us')) as { jobTitle: string }[];

    expect(titles.map((t) => t.jobTitle)).toEqual([
      'Engineering Manager', // 200,000
      'Software Engineer', // 100,000
      'Account Executive', // 60,000
    ]);
  });

  it('returns an empty list for a known country without employees', async () => {
    expect(await get('/api/insights/by-job-title?country=SG')).toEqual([]);
  });

  it.each(['', '?country=FR', '?country=USA'])('rejects country query "%s" with 400', async (q) => {
    const res = await request(app).get(`/api/insights/by-job-title${q}`);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('country');
  });
});

describe('GET /api/insights/by-department', () => {
  it('returns USD payroll per department for the whole org, largest first', async () => {
    expect(await get('/api/insights/by-department')).toEqual([
      {
        department: 'Engineering', // Ada, Grace, Alan, Priya, Rahul
        headcount: 5,
        totalPayrollUsd: 461_600,
        avgSalaryUsd: 92_320,
        medianSalaryUsd: 100_000, // 24,000 36,000 [100,000] 101,600 200,000
      },
      {
        department: 'Sales', // Hans, Sam
        headcount: 2,
        totalPayrollUsd: 114_000,
        avgSalaryUsd: 57_000,
        medianSalaryUsd: 57_000,
      },
      {
        department: 'Product', // Ravi
        headcount: 1,
        totalPayrollUsd: 48_000,
        avgSalaryUsd: 48_000,
        medianSalaryUsd: 48_000,
      },
    ]);
  });

  it('can be limited to one country', async () => {
    expect(await get('/api/insights/by-department?country=IN')).toEqual([
      {
        department: 'Engineering', // Priya, Rahul
        headcount: 2,
        totalPayrollUsd: 60_000,
        avgSalaryUsd: 30_000,
        medianSalaryUsd: 30_000,
      },
      {
        department: 'Product',
        headcount: 1,
        totalPayrollUsd: 48_000,
        avgSalaryUsd: 48_000,
        medianSalaryUsd: 48_000,
      },
    ]);
  });

  it('rejects an unknown country with 400', async () => {
    expect((await request(app).get('/api/insights/by-department?country=XX')).status).toBe(400);
  });
});

describe('GET /api/insights/distribution', () => {
  it('builds a USD histogram and 1.5 × IQR outlier thresholds', async () => {
    // Range 24,000..200,000 in 4 buckets of 44,000.
    // q1 = 36,000 + 0.75 × 12,000 = 45,000 (rank 1.75); q3 = 100,000 + 0.25 × 1,600 = 100,400
    // (rank 5.25); IQR = 55,400; fences at 45,000 - 83,100 and 100,400 + 83,100.
    expect(await get('/api/insights/distribution?buckets=4')).toEqual({
      currency: 'USD',
      buckets: [
        { min: 24_000, max: 68_000, count: 5 },
        { min: 68_000, max: 112_000, count: 2 },
        { min: 112_000, max: 156_000, count: 0 },
        { min: 156_000, max: 200_000, count: 1 },
      ],
      outliers: { lowThreshold: -38_100, highThreshold: 183_500, lowCount: 0, highCount: 1 },
    });
  });

  it('defaults to 10 buckets', async () => {
    const body = await get('/api/insights/distribution');

    expect(body.buckets).toHaveLength(10);
    expect(body.buckets.reduce((sum: number, b: { count: number }) => sum + b.count, 0)).toBe(8);
  });

  it('can be limited to one country', async () => {
    // India: 24,000 36,000 48,000 in 2 buckets of 12,000.
    const body = await get('/api/insights/distribution?country=IN&buckets=2');

    expect(body.buckets).toEqual([
      { min: 24_000, max: 36_000, count: 1 },
      { min: 36_000, max: 48_000, count: 2 },
    ]);
  });

  it.each(['buckets=1', 'buckets=51', 'buckets=ten', 'country=XX'])(
    'rejects %s with 400',
    async (query) => {
      const res = await request(app).get(`/api/insights/distribution?${query}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('returns empty buckets and zero outliers for an empty database', async () => {
    expect(await get('/api/insights/distribution', emptyApp)).toEqual({
      currency: 'USD',
      buckets: [],
      outliers: { lowThreshold: 0, highThreshold: 0, lowCount: 0, highCount: 0 },
    });
  });
});
