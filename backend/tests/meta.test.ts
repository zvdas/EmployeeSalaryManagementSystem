import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/testDb.js';

describe('GET /api/meta', () => {
  it('returns countries, departments, job titles and employment types', async () => {
    const res = await request(createTestApp()).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body.countries).toHaveLength(8);
    expect(res.body.countries).toContainEqual({
      code: 'IN',
      name: 'India',
      currency: 'INR',
      usdRate: 0.012,
    });
    expect(res.body.departments).toHaveLength(10);
    expect(res.body.departments).toContain('Customer Support');
    expect(res.body.jobTitles).toHaveLength(23);
    expect(res.body.jobTitles).toContainEqual({ title: 'Legal Counsel', department: 'Legal' });
    expect(res.body.employmentTypes).toEqual(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
  });
});
