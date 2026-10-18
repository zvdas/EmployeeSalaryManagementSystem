import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors.js';
import { EmployeeRepository } from '../src/modules/employees/employee.repository.js';
import type { EmployeeInput } from '../src/modules/employees/employee.schemas.js';
import { EmployeeService } from '../src/modules/employees/employee.service.js';
import { insertFixture } from './helpers/fixtures.js';
import { createTestDb, FIXED_NOW } from './helpers/testDb.js';

const validInput: EmployeeInput = {
  fullName: 'Katherine Johnson',
  email: 'katherine@acme.example',
  jobTitle: 'QA Engineer',
  department: 'Engineering',
  countryCode: 'CA',
  annualSalary: 95_000,
  employmentType: 'FULL_TIME',
  hireDate: '2025-05-05',
};

/** Runs `fn` and returns the AppError it throws (failing the test if it does not throw one). */
function errorFrom(fn: () => unknown): AppError {
  try {
    fn();
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error('Expected an AppError to be thrown');
}

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    const db = createTestDb();
    insertFixture(db);
    service = new EmployeeService(new EmployeeRepository(db), () => FIXED_NOW);
  });

  it('creates an employee with a server-generated code and derived USD salary', () => {
    const created = service.create(validInput);

    expect(created).toMatchObject({ ...validInput, id: 9, employeeCode: 'EMP-000009' });
    expect(created.currency).toBe('CAD');
    expect(created.annualSalaryUsd).toBe(69_350); // 95,000 × 0.73
  });

  it('rejects an unknown country with a countryCode detail', () => {
    const err = errorFrom(() => service.create({ ...validInput, countryCode: 'FR' }));

    expect(err.status).toBe(400);
    expect(err.details).toEqual([{ path: 'countryCode', message: expect.any(String) }]);
  });

  it('rejects a job title from another department with a jobTitle detail', () => {
    const err = errorFrom(() => service.create({ ...validInput, department: 'Sales' }));

    expect(err.status).toBe(400);
    expect(err.details).toEqual([{ path: 'jobTitle', message: expect.any(String) }]);
  });

  it('rejects hire dates after today (in the earliest time zone)', () => {
    // FIXED_NOW is 2026-10-18T12:00Z, which is already 2026-10-19 in UTC+14.
    expect(service.create({ ...validInput, hireDate: '2026-10-19' }).hireDate).toBe('2026-10-19');

    const err = errorFrom(() =>
      service.create({ ...validInput, email: 'x@acme.example', hireDate: '2026-10-20' }),
    );
    expect(err.status).toBe(400);
    expect(err.details).toEqual([
      { path: 'hireDate', message: 'Hire date cannot be in the future' },
    ]);
  });

  it('reports every broken rule at once', () => {
    const err = errorFrom(() =>
      service.create({ ...validInput, countryCode: 'FR', department: 'Legal' }),
    );

    expect((err.details as { path: string }[]).map((d) => d.path)).toEqual([
      'countryCode',
      'jobTitle',
    ]);
  });

  it('rejects a duplicate email case-insensitively with 409', () => {
    const err = errorFrom(() => service.create({ ...validInput, email: 'ADA@acme.example' }));

    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('lets an employee keep their own email on update', () => {
    const updated = service.update(1, {
      ...validInput,
      email: 'ada@acme.example',
      fullName: 'Ada King',
    });

    expect(updated).toMatchObject({ id: 1, employeeCode: 'EMP-000001', fullName: 'Ada King' });
  });

  it('rejects taking another employee’s email on update', () => {
    expect(
      errorFrom(() => service.update(1, { ...validInput, email: 'grace@acme.example' })).status,
    ).toBe(409);
  });

  it('throws 404 for missing ids on get, update and remove', () => {
    expect(errorFrom(() => service.get(999)).status).toBe(404);
    expect(errorFrom(() => service.update(999, validInput)).status).toBe(404);
    expect(errorFrom(() => service.remove(999)).status).toBe(404);
  });
});
