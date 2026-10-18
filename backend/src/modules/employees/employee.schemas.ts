import { DEPARTMENTS, EMPLOYMENT_TYPES, JOB_TITLES } from '../../domain/reference.js';
import { z } from '../../lib/zod.js';

const JOB_TITLE_NAMES = JOB_TITLES.map((t) => t.title) as [string, ...string[]];

export const SORTABLE_FIELDS = [
  'fullName',
  'employeeCode',
  'jobTitle',
  'department',
  'countryCode',
  'annualSalaryUsd',
  'hireDate',
] as const;

export const MAX_PAGE_SIZE = 100;

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO country code')
  .openapi({ description: 'ISO 3166-1 alpha-2 code of a known country', example: 'IN' });

/** Optional query text: trimmed, and an empty value counts as absent. */
const optionalText = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

export const employeeInputSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).openapi({ example: 'Priya Sharma' }),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()).openapi({
      format: 'email',
      description: 'Unique (case-insensitive)',
      example: 'priya.sharma@acme.example',
    }),
    jobTitle: z
      .enum(JOB_TITLE_NAMES)
      .openapi({ description: 'Must belong to `department`', example: 'Software Engineer' }),
    department: z.enum(DEPARTMENTS).openapi({ example: 'Engineering' }),
    countryCode,
    annualSalary: z
      .number()
      .int()
      .min(1)
      .max(100_000_000)
      .openapi({ description: 'Whole units of the local currency', example: 2_400_000 }),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    hireDate: z.iso.date().openapi({ description: 'Not in the future', example: '2023-04-01' }),
  })
  .openapi('EmployeeInput');

export const employeeSchema = z
  .object({
    id: z.number().int(),
    employeeCode: z.string().openapi({ example: 'EMP-000123' }),
    fullName: z.string(),
    email: z.string(),
    jobTitle: z.string(),
    department: z.string(),
    countryCode: z.string(),
    currency: z.string().openapi({ description: 'Derived from the country', example: 'INR' }),
    annualSalary: z.number().int().openapi({ description: 'Local currency' }),
    annualSalaryUsd: z.number().int().openapi({ description: 'Derived; rounded to whole USD' }),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    hireDate: z.string().openapi({ example: '2023-04-01' }),
    createdAt: z.string().openapi({ example: '2026-10-18T09:30:00Z' }),
    updatedAt: z.string().openapi({ example: '2026-10-18T09:30:00Z' }),
  })
  .openapi('Employee');

export const employeeFiltersSchema = z.object({
  search: optionalText.openapi({
    description: 'Case-insensitive match on name, email or employee code',
  }),
  country: optionalText
    .transform((value) => value?.toUpperCase())
    .openapi({ description: 'Country code', example: 'IN' }),
  department: optionalText.openapi({ example: 'Engineering' }),
  jobTitle: optionalText.openapi({ example: 'Software Engineer' }),
});

/** Filters plus sort order: the CSV export query. */
export const employeeExportQuerySchema = employeeFiltersSchema.extend({
  sortBy: z.enum(SORTABLE_FIELDS).default('fullName'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const employeeListQuerySchema = employeeExportQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

export const employeeListSchema = z
  .object({
    items: z.array(employeeSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .openapi('EmployeePage');

export const employeeIdParamsSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ example: 1 }),
});

export type EmployeeInput = z.output<typeof employeeInputSchema>;
export type Employee = z.output<typeof employeeSchema>;
export type EmployeeFilters = z.output<typeof employeeFiltersSchema>;
export type EmployeeExportQuery = z.output<typeof employeeExportQuerySchema>;
export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>;
export type EmployeeList = z.output<typeof employeeListSchema>;
export type SortField = (typeof SORTABLE_FIELDS)[number];
export type SortDirection = EmployeeListQuery['sortDir'];
