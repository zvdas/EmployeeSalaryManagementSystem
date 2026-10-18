import { Employee, Meta } from '../app/core/models';

/** Shared test data. Excluded from the app build (see tsconfig.app.json). */
export const META_FIXTURE: Meta = {
  countries: [
    { code: 'US', name: 'United States', currency: 'USD', usdRate: 1 },
    { code: 'IN', name: 'India', currency: 'INR', usdRate: 0.012 },
  ],
  departments: ['Engineering', 'Sales'],
  jobTitles: [
    { title: 'Software Engineer', department: 'Engineering' },
    { title: 'QA Engineer', department: 'Engineering' },
    { title: 'Account Executive', department: 'Sales' },
  ],
  employmentTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
};

export function employeeFixture(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    employeeCode: 'EMP-000001',
    fullName: 'Ada Lovelace',
    email: 'ada@acme.test',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'IN',
    currency: 'INR',
    annualSalary: 3000000,
    annualSalaryUsd: 36000,
    employmentType: 'FULL_TIME',
    hireDate: '2022-03-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
