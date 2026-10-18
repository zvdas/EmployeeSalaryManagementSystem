import type { Database } from 'better-sqlite3';
import { DEFAULT_SEED, generateEmployees, type GeneratedEmployee } from './generator.js';

export function countEmployees(db: Database): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number };
  return row.count;
}

/** Removes every employee and restarts the id sequence, so a re-seed gets the same ids. */
export function deleteAllEmployees(db: Database): void {
  db.transaction(() => {
    db.prepare('DELETE FROM employees').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'employees'").run();
  })();
}

/** Inserts employees (with their codes) in a single transaction. Returns the number inserted. */
export function insertEmployees(db: Database, employees: readonly GeneratedEmployee[]): number {
  const insert = db.prepare(`
    INSERT INTO employees (employee_code, full_name, email, job_title, department,
      country_code, annual_salary, employment_type, hire_date)
    VALUES (@employeeCode, @fullName, @email, @jobTitle, @department,
      @countryCode, @annualSalary, @employmentType, @hireDate)
  `);

  db.transaction(() => {
    for (const employee of employees) insert.run(employee);
  })();

  return employees.length;
}

export function seedDatabase(db: Database, count: number, seed = DEFAULT_SEED): number {
  return insertEmployees(db, generateEmployees(count, seed));
}
