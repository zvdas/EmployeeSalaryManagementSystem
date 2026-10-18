import type { Database } from 'better-sqlite3';
import { DEFAULT_SEED, generateEmployees } from './generator.js';

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

/** Inserts `count` generated employees in a single transaction. Returns the number inserted. */
export function seedDatabase(db: Database, count: number, seed = DEFAULT_SEED): number {
  const insert = db.prepare(`
    INSERT INTO employees (employee_code, full_name, email, job_title, department,
      country_code, annual_salary, employment_type, hire_date)
    VALUES (@employeeCode, @fullName, @email, @jobTitle, @department,
      @countryCode, @annualSalary, @employmentType, @hireDate)
  `);
  const employees = generateEmployees(count, seed);

  db.transaction(() => {
    for (const employee of employees) insert.run(employee);
  })();

  return employees.length;
}
