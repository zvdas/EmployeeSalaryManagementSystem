import { describe, expect, it } from 'vitest';
import {
  EMPLOYMENT_TYPES,
  isKnownCountry,
  isValidTitleForDepartment,
} from '../src/domain/reference.js';
import { generateEmployees } from '../src/seed/generator.js';
import { mulberry32 } from '../src/seed/prng.js';
import { countEmployees, deleteAllEmployees, seedDatabase } from '../src/seed/seedDatabase.js';
import { createTestDb } from './helpers/testDb.js';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed, within [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const values = Array.from({ length: 1000 }, () => a());

    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('generateEmployees', () => {
  const employees = generateEmployees(2000);

  it('is deterministic for a given seed', () => {
    expect(generateEmployees(2000)).toEqual(employees);
    expect(generateEmployees(50, 42)).toEqual(employees.slice(0, 50));
  });

  it('differs for a different seed', () => {
    expect(generateEmployees(50, 43)).not.toEqual(employees.slice(0, 50));
  });

  it('generates the requested count with sequential employee codes', () => {
    expect(employees).toHaveLength(2000);
    expect(employees[0]?.employeeCode).toBe('EMP-000001');
    expect(employees[1999]?.employeeCode).toBe('EMP-002000');
    expect(generateEmployees(0)).toEqual([]);
  });

  it('generates unique codes and unique lowercase ascii emails', () => {
    expect(new Set(employees.map((e) => e.employeeCode)).size).toBe(employees.length);
    expect(new Set(employees.map((e) => e.email)).size).toBe(employees.length);
    for (const { email } of employees) {
      expect(email).toMatch(/^[a-z0-9]+\.[a-z0-9]+\.\d+@acme\.example$/);
    }
  });

  it('pairs every job title with its own department and uses known reference values', () => {
    for (const e of employees) {
      expect(isValidTitleForDepartment(e.jobTitle, e.department)).toBe(true);
      expect(isKnownCountry(e.countryCode)).toBe(true);
      expect(EMPLOYMENT_TYPES).toContain(e.employmentType);
    }
  });

  it('generates positive salaries rounded to the nearest 100', () => {
    for (const { annualSalary } of employees) {
      expect(annualSalary).toBeGreaterThan(0);
      expect(annualSalary % 100).toBe(0);
    }
  });

  it('generates hire dates between 2012-01-01 and 2026-09-30', () => {
    for (const { hireDate } of employees) {
      expect(hireDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(hireDate >= '2012-01-01' && hireDate <= '2026-09-30').toBe(true);
    }
  });

  it('roughly follows the country and employment-type weights', () => {
    const share = (predicate: (e: (typeof employees)[number]) => boolean) =>
      employees.filter(predicate).length / employees.length;

    expect(share((e) => e.countryCode === 'US')).toBeCloseTo(0.3, 1);
    expect(share((e) => e.countryCode === 'IN')).toBeCloseTo(0.2, 1);
    expect(share((e) => e.employmentType === 'FULL_TIME')).toBeCloseTo(0.85, 1);
  });
});

describe('seedDatabase', () => {
  it('inserts exactly N employees', () => {
    const db = createTestDb();

    expect(seedDatabase(db, 250)).toBe(250);
    expect(countEmployees(db)).toBe(250);
  });

  it('can re-seed after deleteAllEmployees with the same ids and codes', () => {
    const db = createTestDb();
    seedDatabase(db, 10);
    deleteAllEmployees(db);

    seedDatabase(db, 10);

    const first = db.prepare('SELECT id, employee_code AS code FROM employees ORDER BY id').get();
    expect(first).toEqual({ id: 1, code: 'EMP-000001' });
    expect(countEmployees(db)).toBe(10);
  });
});
