import { z } from 'zod';
import { DEPARTMENTS, EMPLOYMENT_TYPES, JOB_TITLES } from '../../domain/reference.js';

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
  .regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO country code');

/** Optional query text: trimmed, and an empty value counts as absent. */
const optionalText = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

export const employeeInputSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  jobTitle: z.enum(JOB_TITLE_NAMES),
  department: z.enum(DEPARTMENTS),
  countryCode,
  annualSalary: z.number().int().min(1).max(100_000_000),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hireDate: z.iso.date(),
});

export const employeeSchema = z.object({
  id: z.number().int(),
  employeeCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  jobTitle: z.string(),
  department: z.string(),
  countryCode: z.string(),
  currency: z.string(),
  annualSalary: z.number().int(),
  annualSalaryUsd: z.number().int(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hireDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const employeeFiltersSchema = z.object({
  search: optionalText,
  country: optionalText.transform((value) => value?.toUpperCase()),
  department: optionalText,
  jobTitle: optionalText,
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

export const employeeListSchema = z.object({
  items: z.array(employeeSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const employeeIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type EmployeeInput = z.output<typeof employeeInputSchema>;
export type Employee = z.output<typeof employeeSchema>;
export type EmployeeFilters = z.output<typeof employeeFiltersSchema>;
export type EmployeeExportQuery = z.output<typeof employeeExportQuerySchema>;
export type EmployeeListQuery = z.output<typeof employeeListQuerySchema>;
export type EmployeeList = z.output<typeof employeeListSchema>;
export type SortField = (typeof SORTABLE_FIELDS)[number];
export type SortDirection = EmployeeListQuery['sortDir'];
