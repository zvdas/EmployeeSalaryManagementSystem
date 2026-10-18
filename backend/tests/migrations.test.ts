import { describe, expect, it } from 'vitest';
import { openInMemoryDatabase } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrator.js';
import { MIGRATIONS } from '../src/db/schema.js';
import { COUNTRIES } from '../src/domain/reference.js';

function namesOf(db: ReturnType<typeof openInMemoryDatabase>, type: 'table' | 'index'): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%'")
    .all(type) as { name: string }[];
  return rows.map((r) => r.name).sort();
}

describe('runMigrations', () => {
  it('creates the tables and indexes from the design notes', () => {
    const db = openInMemoryDatabase();

    const applied = runMigrations(db);

    expect(applied.map((m) => m.version)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(namesOf(db, 'table')).toEqual(['countries', 'employees', 'schema_migrations']);
    expect(namesOf(db, 'index')).toEqual([
      'idx_emp_country_title',
      'idx_emp_department',
      'idx_emp_full_name',
    ]);
  });

  it('is idempotent', () => {
    const db = openInMemoryDatabase();
    runMigrations(db);

    expect(runMigrations(db)).toEqual([]);
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number };
    expect(n).toBe(MIGRATIONS.length);
  });

  it('populates countries from the reference data', () => {
    const db = openInMemoryDatabase();
    runMigrations(db);

    const rows = db
      .prepare('SELECT code, name, currency, usd_rate AS usdRate FROM countries ORDER BY code')
      .all();

    const expected = COUNTRIES.map(({ code, name, currency, usdRate }) => ({
      code,
      name,
      currency,
      usdRate,
    })).sort((a, b) => a.code.localeCompare(b.code));
    expect(rows).toEqual(expected);
  });

  it('enforces the schema CHECK and foreign-key constraints', () => {
    const db = openInMemoryDatabase();
    runMigrations(db);
    const insert = db.prepare(`
      INSERT INTO employees (employee_code, full_name, email, job_title, department,
        country_code, annual_salary, employment_type, hire_date)
      VALUES (?, 'Ada', ?, 'QA Engineer', 'Engineering', ?, ?, 'FULL_TIME', '2020-01-01')
    `);

    expect(() => insert.run('EMP-1', 'a@x.io', 'US', 0)).toThrow(/CHECK/);
    expect(() => insert.run('EMP-2', 'b@x.io', 'XX', 100)).toThrow(/FOREIGN KEY/);
    insert.run('EMP-3', 'c@x.io', 'US', 100);
    expect(() => insert.run('EMP-4', 'C@X.IO', 'US', 100)).toThrow(/UNIQUE/);
  });
});
