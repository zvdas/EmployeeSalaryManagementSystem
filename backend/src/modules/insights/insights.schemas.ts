import { COUNTRIES } from '../../domain/reference.js';
import { z } from '../../lib/zod.js';

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

/** A known country code, accepted in any case. */
const knownCountry = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(COUNTRY_CODES))
  .openapi({ description: `Country code, one of ${COUNTRY_CODES.join(', ')}`, example: 'IN' });

export const MIN_BUCKETS = 2;
export const MAX_BUCKETS = 50;

export const requiredCountryQuerySchema = z.object({ country: knownCountry });

export const optionalCountryQuerySchema = z.object({ country: knownCountry.optional() });

export const distributionQuerySchema = optionalCountryQuerySchema.extend({
  buckets: z.coerce.number().int().min(MIN_BUCKETS).max(MAX_BUCKETS).default(10),
});

const money = z.number().int();
const count = z.number().int();

export const summarySchema = z
  .object({
    headcount: count,
    totalPayrollUsd: money,
    avgSalaryUsd: money,
    medianSalaryUsd: money,
    countryCount: count,
    departmentCount: count,
  })
  .openapi('InsightsSummary');

export const countryStatsSchema = z
  .object({
    countryCode: z.string(),
    countryName: z.string(),
    currency: z.string(),
    headcount: count,
    minSalary: money,
    maxSalary: money,
    avgSalary: money,
    medianSalary: money,
    avgSalaryUsd: money,
    medianSalaryUsd: money,
    totalPayrollUsd: money,
  })
  .openapi('CountryStats');

export const jobTitleStatsSchema = z
  .object({
    jobTitle: z.string(),
    department: z.string(),
    currency: z.string(),
    headcount: count,
    minSalary: money,
    maxSalary: money,
    avgSalary: money,
    medianSalary: money,
  })
  .openapi('JobTitleStats');

export const departmentStatsSchema = z
  .object({
    department: z.string(),
    headcount: count,
    totalPayrollUsd: money,
    avgSalaryUsd: money,
    medianSalaryUsd: money,
  })
  .openapi('DepartmentStats');

export const distributionSchema = z
  .object({
    currency: z.literal('USD'),
    buckets: z.array(z.object({ min: money, max: money, count })),
    outliers: z.object({
      lowThreshold: money,
      highThreshold: money,
      lowCount: count,
      highCount: count,
    }),
  })
  .openapi('SalaryDistribution');

export type Summary = z.output<typeof summarySchema>;
export type CountryStats = z.output<typeof countryStatsSchema>;
export type JobTitleStats = z.output<typeof jobTitleStatsSchema>;
export type DepartmentStats = z.output<typeof departmentStatsSchema>;
export type Distribution = z.output<typeof distributionSchema>;
export type DistributionQuery = z.output<typeof distributionQuerySchema>;
