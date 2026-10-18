/**
 * Ordered schema migrations (design notes §3). Kept as TS modules so they ship inside `dist/`
 * with no extra build step. Never edit an applied migration; append a new one instead.
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create countries and employees',
    sql: `
      CREATE TABLE countries (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT NOT NULL,
        usd_rate REAL NOT NULL CHECK (usd_rate > 0)
      );

      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        job_title TEXT NOT NULL,
        department TEXT NOT NULL,
        country_code TEXT NOT NULL REFERENCES countries(code),
        annual_salary INTEGER NOT NULL CHECK (annual_salary > 0),
        employment_type TEXT NOT NULL,
        hire_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_emp_country_title ON employees(country_code, job_title);
      CREATE INDEX idx_emp_department ON employees(department);
      CREATE INDEX idx_emp_full_name ON employees(full_name);
    `,
  },
];
