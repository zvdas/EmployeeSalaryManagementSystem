import { toCsvRow } from '../../lib/csv.js';
import type { Employee } from './employee.schemas.js';

/** Export columns, in order (design notes §4). */
export const EXPORT_COLUMNS = [
  'employeeCode',
  'fullName',
  'email',
  'jobTitle',
  'department',
  'countryCode',
  'currency',
  'annualSalary',
  'annualSalaryUsd',
  'employmentType',
  'hireDate',
] as const satisfies readonly (keyof Employee)[];

export const EXPORT_HEADER = toCsvRow(EXPORT_COLUMNS);

export function employeeToCsvRow(employee: Employee): string {
  return toCsvRow(EXPORT_COLUMNS.map((column) => employee[column]));
}
