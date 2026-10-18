import type { Database } from 'better-sqlite3';
import type { GeneratedEmployee } from '../../src/seed/generator.js';
import { insertEmployees } from '../../src/seed/seedDatabase.js';

/**
 * A small, hand-built staff list. USD values (rate × local) are noted so tests can state
 * expected numbers by hand: GBP 1.27, EUR 1.08, INR 0.012.
 */
export const FIXTURE_EMPLOYEES: readonly GeneratedEmployee[] = [
  // prettier-ignore
  { employeeCode: 'EMP-000001', fullName: 'Ada Lovelace', email: 'ada@acme.example', jobTitle: 'Software Engineer', department: 'Engineering', countryCode: 'US', annualSalary: 100_000, employmentType: 'FULL_TIME', hireDate: '2020-01-15' }, // $100,000
  // prettier-ignore
  { employeeCode: 'EMP-000002', fullName: 'Grace Hopper', email: 'grace@acme.example', jobTitle: 'Engineering Manager', department: 'Engineering', countryCode: 'US', annualSalary: 200_000, employmentType: 'FULL_TIME', hireDate: '2018-03-01' }, // $200,000
  // prettier-ignore
  { employeeCode: 'EMP-000003', fullName: 'Alan Turing', email: 'alan@acme.example', jobTitle: 'Software Engineer', department: 'Engineering', countryCode: 'GB', annualSalary: 80_000, employmentType: 'FULL_TIME', hireDate: '2021-06-01' }, // $101,600
  // prettier-ignore
  { employeeCode: 'EMP-000004', fullName: 'Priya Sharma', email: 'priya@acme.example', jobTitle: 'Software Engineer', department: 'Engineering', countryCode: 'IN', annualSalary: 2_000_000, employmentType: 'FULL_TIME', hireDate: '2022-02-01' }, // $24,000
  // prettier-ignore
  { employeeCode: 'EMP-000005', fullName: 'Rahul Gupta', email: 'rahul@acme.example', jobTitle: 'Software Engineer', department: 'Engineering', countryCode: 'IN', annualSalary: 3_000_000, employmentType: 'CONTRACT', hireDate: '2023-07-10' }, // $36,000
  // prettier-ignore
  { employeeCode: 'EMP-000006', fullName: 'Ravi Iyer', email: 'ravi@acme.example', jobTitle: 'Product Manager', department: 'Product', countryCode: 'IN', annualSalary: 4_000_000, employmentType: 'FULL_TIME', hireDate: '2019-09-09' }, // $48,000
  // prettier-ignore
  { employeeCode: 'EMP-000007', fullName: 'Hans Muller', email: 'hans@acme.example', jobTitle: 'Account Executive', department: 'Sales', countryCode: 'DE', annualSalary: 50_000, employmentType: 'PART_TIME', hireDate: '2017-11-20' }, // $54,000
  // prettier-ignore
  { employeeCode: 'EMP-000008', fullName: 'Sam Taylor', email: 'sam@acme.example', jobTitle: 'Account Executive', department: 'Sales', countryCode: 'US', annualSalary: 60_000, employmentType: 'FULL_TIME', hireDate: '2024-01-02' }, // $60,000
];

/** Inserts the fixture into a fresh DB, so its rows get ids 1..8 in order. */
export function insertFixture(db: Database): void {
  insertEmployees(db, FIXTURE_EMPLOYEES);
}
