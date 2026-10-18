/** Mirrors §4 "Types" of docs/02-design-notes.md. */
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

export interface Employee {
  id: number;
  /** e.g. "EMP-000123" */
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  /** ISO 3166-1 alpha-2, e.g. "IN" */
  countryCode: string;
  /** Derived from the country, e.g. "INR" */
  currency: string;
  /** Local currency, integer */
  annualSalary: number;
  /** Derived, rounded to integer */
  annualSalaryUsd: number;
  employmentType: EmploymentType;
  /** "YYYY-MM-DD" */
  hireDate: string;
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601 */
  updatedAt: string;
}

/** POST body (all required) and PUT body (all required, full replace). */
export interface EmployeeInput {
  /** 2..100 chars, trimmed */
  fullName: string;
  /** Valid email, unique (case-insensitive) */
  email: string;
  /** Must be a known title AND belong to `department` */
  jobTitle: string;
  /** Must be a known department */
  department: string;
  /** Must exist in countries */
  countryCode: string;
  /** Integer, 1..100,000,000 */
  annualSalary: number;
  employmentType: EmploymentType;
  /** YYYY-MM-DD, not in the future */
  hireDate: string;
}

/** Sortable columns accepted by `GET /employees?sortBy=`. */
export type EmployeeSortBy =
  | 'fullName'
  | 'employeeCode'
  | 'jobTitle'
  | 'department'
  | 'countryCode'
  | 'annualSalaryUsd'
  | 'hireDate';

export type SortDir = 'asc' | 'desc';

/** Query parameters for `GET /employees` (and the same filters for `GET /employees/export.csv`). */
export interface EmployeeQuery {
  /** name/email/code, case-insensitive contains */
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  /** default 1 */
  page?: number;
  /** default 25, max 100 */
  pageSize?: number;
  /** default 'fullName' */
  sortBy?: EmployeeSortBy;
  sortDir?: SortDir;
}
