/**
 * Reference data (design notes §3). This module is the single source of truth:
 * countries are mirrored into the `countries` table by the migration runner.
 */

export interface Country {
  code: string;
  name: string;
  currency: string;
  /** USD value of one unit of local currency (static, dated 2026-10). */
  usdRate: number;
  /** Share of the US base salary paid in this country, before FX. Used by the seed only. */
  salaryFactor: number;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', currency: 'USD', usdRate: 1.0, salaryFactor: 1.0 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', usdRate: 1.27, salaryFactor: 0.8 },
  { code: 'DE', name: 'Germany', currency: 'EUR', usdRate: 1.08, salaryFactor: 0.8 },
  { code: 'IN', name: 'India', currency: 'INR', usdRate: 0.012, salaryFactor: 0.3 },
  { code: 'CA', name: 'Canada', currency: 'CAD', usdRate: 0.73, salaryFactor: 0.8 },
  { code: 'AU', name: 'Australia', currency: 'AUD', usdRate: 0.66, salaryFactor: 0.85 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', usdRate: 0.74, salaryFactor: 0.8 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', usdRate: 0.18, salaryFactor: 0.35 },
];

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Finance',
  'Human Resources',
  'Operations',
  'Customer Support',
  'Legal',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface JobTitle {
  title: string;
  department: Department;
  /** US base salary in USD used by the seed generator. */
  baseUsd: number;
}

export const JOB_TITLES: readonly JobTitle[] = [
  { title: 'Software Engineer', department: 'Engineering', baseUsd: 110_000 },
  { title: 'Senior Software Engineer', department: 'Engineering', baseUsd: 145_000 },
  { title: 'Engineering Manager', department: 'Engineering', baseUsd: 175_000 },
  { title: 'QA Engineer', department: 'Engineering', baseUsd: 90_000 },
  { title: 'DevOps Engineer', department: 'Engineering', baseUsd: 120_000 },
  { title: 'Product Manager', department: 'Product', baseUsd: 130_000 },
  { title: 'Senior Product Manager', department: 'Product', baseUsd: 160_000 },
  { title: 'Product Designer', department: 'Design', baseUsd: 105_000 },
  { title: 'UX Researcher', department: 'Design', baseUsd: 100_000 },
  { title: 'Account Executive', department: 'Sales', baseUsd: 85_000 },
  { title: 'Sales Manager', department: 'Sales', baseUsd: 120_000 },
  { title: 'Sales Development Rep', department: 'Sales', baseUsd: 60_000 },
  { title: 'Marketing Specialist', department: 'Marketing', baseUsd: 70_000 },
  { title: 'Marketing Manager', department: 'Marketing', baseUsd: 110_000 },
  { title: 'Financial Analyst', department: 'Finance', baseUsd: 80_000 },
  { title: 'Finance Manager', department: 'Finance', baseUsd: 125_000 },
  { title: 'HR Generalist', department: 'Human Resources', baseUsd: 65_000 },
  { title: 'HR Business Partner', department: 'Human Resources', baseUsd: 95_000 },
  { title: 'Operations Analyst', department: 'Operations', baseUsd: 70_000 },
  { title: 'Operations Manager', department: 'Operations', baseUsd: 105_000 },
  { title: 'Support Specialist', department: 'Customer Support', baseUsd: 50_000 },
  { title: 'Support Team Lead', department: 'Customer Support', baseUsd: 70_000 },
  { title: 'Legal Counsel', department: 'Legal', baseUsd: 150_000 },
];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

const countriesByCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const titlesByName = new Map(JOB_TITLES.map((t) => [t.title, t]));

export function findCountry(code: string): Country | undefined {
  return countriesByCode.get(code);
}

export function isKnownCountry(code: string): boolean {
  return countriesByCode.has(code);
}

export function isKnownDepartment(name: string): name is Department {
  return (DEPARTMENTS as readonly string[]).includes(name);
}

export function isKnownJobTitle(title: string): boolean {
  return titlesByName.has(title);
}

export function isValidTitleForDepartment(title: string, department: string): boolean {
  return titlesByName.get(title)?.department === department;
}
