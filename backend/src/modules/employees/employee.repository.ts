import type { Database } from 'better-sqlite3';
import type {
  Employee,
  EmployeeFilters,
  EmployeeInput,
  SortDirection,
  SortField,
} from './employee.schemas.js';

/** Whitelisted ORDER BY expressions; user input only ever selects a key of this map. */
const SORT_COLUMNS: Record<SortField, string> = {
  fullName: 'e.full_name',
  employeeCode: 'e.employee_code',
  jobTitle: 'e.job_title',
  department: 'e.department',
  countryCode: 'e.country_code',
  annualSalaryUsd: 'e.annual_salary * c.usd_rate',
  hireDate: 'e.hire_date',
};

const ISO_TIMESTAMP = "'%Y-%m-%dT%H:%M:%SZ'";

const EMPLOYEE_COLUMNS = `
  e.id,
  e.employee_code AS employeeCode,
  e.full_name AS fullName,
  e.email,
  e.job_title AS jobTitle,
  e.department,
  e.country_code AS countryCode,
  c.currency,
  e.annual_salary AS annualSalary,
  CAST(ROUND(e.annual_salary * c.usd_rate) AS INTEGER) AS annualSalaryUsd,
  e.employment_type AS employmentType,
  e.hire_date AS hireDate,
  strftime(${ISO_TIMESTAMP}, e.created_at) AS createdAt,
  strftime(${ISO_TIMESTAMP}, e.updated_at) AS updatedAt
`;

const FROM_EMPLOYEES = 'FROM employees e JOIN countries c ON c.code = e.country_code';

type SqlParams = Record<string, string | number>;

interface WhereClause {
  sql: string;
  params: SqlParams;
}

/** Escapes LIKE wildcards so user text is matched literally. */
function likeContains(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function buildWhere(filters: EmployeeFilters): WhereClause {
  const conditions: string[] = [];
  const params: SqlParams = {};

  if (filters.search) {
    // SQLite LIKE is case-insensitive for ASCII.
    conditions.push(
      `(e.full_name LIKE @search ESCAPE '\\' OR e.email LIKE @search ESCAPE '\\'` +
        ` OR e.employee_code LIKE @search ESCAPE '\\')`,
    );
    params.search = likeContains(filters.search);
  }
  if (filters.country) {
    conditions.push('e.country_code = @country');
    params.country = filters.country;
  }
  if (filters.department) {
    conditions.push('e.department = @department');
    params.department = filters.department;
  }
  if (filters.jobTitle) {
    conditions.push('e.job_title = @jobTitle');
    params.jobTitle = filters.jobTitle;
  }

  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function orderBy(sortBy: SortField, sortDir: SortDirection): string {
  const direction = sortDir === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${SORT_COLUMNS[sortBy]} ${direction}, e.id ASC`;
}

export interface SortedFilters {
  filters: EmployeeFilters;
  sortBy: SortField;
  sortDir: SortDirection;
}

export interface ListOptions extends SortedFilters {
  limit: number;
  offset: number;
}

export class EmployeeRepository {
  constructor(private readonly db: Database) {}

  list({ filters, sortBy, sortDir, limit, offset }: ListOptions): Employee[] {
    const where = buildWhere(filters);
    return this.db
      .prepare(
        `SELECT ${EMPLOYEE_COLUMNS} ${FROM_EMPLOYEES} ${where.sql}
         ${orderBy(sortBy, sortDir)} LIMIT @limit OFFSET @offset`,
      )
      .all({ ...where.params, limit, offset }) as Employee[];
  }

  /** Every matching employee, one row at a time (the connection is busy until it finishes). */
  iterate({ filters, sortBy, sortDir }: SortedFilters): IterableIterator<Employee> {
    const where = buildWhere(filters);
    return this.db
      .prepare(
        `SELECT ${EMPLOYEE_COLUMNS} ${FROM_EMPLOYEES} ${where.sql} ${orderBy(sortBy, sortDir)}`,
      )
      .iterate(where.params) as IterableIterator<Employee>;
  }

  count(filters: EmployeeFilters): number {
    const where = buildWhere(filters);
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count ${FROM_EMPLOYEES} ${where.sql}`)
      .get(where.params) as { count: number };
    return row.count;
  }

  findById(id: number): Employee | undefined {
    return this.db
      .prepare(`SELECT ${EMPLOYEE_COLUMNS} ${FROM_EMPLOYEES} WHERE e.id = ?`)
      .get(id) as Employee | undefined;
  }

  /** Case-insensitive, thanks to the column's NOCASE collation. */
  findIdByEmail(email: string): number | undefined {
    const row = this.db.prepare('SELECT id FROM employees WHERE email = ?').get(email) as
      { id: number } | undefined;
    return row?.id;
  }

  /** Inserts the employee and derives its code from the new id (`EMP-000123`). */
  insert(input: EmployeeInput): number {
    const insertRow = this.db.prepare(`
      INSERT INTO employees (employee_code, full_name, email, job_title, department,
        country_code, annual_salary, employment_type, hire_date)
      VALUES ('PENDING-' || hex(randomblob(8)), @fullName, @email, @jobTitle, @department,
        @countryCode, @annualSalary, @employmentType, @hireDate)
    `);
    const assignCode = this.db.prepare(
      "UPDATE employees SET employee_code = printf('EMP-%06d', id) WHERE id = ?",
    );

    return this.db.transaction(() => {
      const id = Number(insertRow.run(input).lastInsertRowid);
      assignCode.run(id);
      return id;
    })();
  }

  /** Returns false when no employee has this id. */
  update(id: number, input: EmployeeInput): boolean {
    const result = this.db
      .prepare(
        `UPDATE employees SET full_name = @fullName, email = @email, job_title = @jobTitle,
           department = @department, country_code = @countryCode,
           annual_salary = @annualSalary, employment_type = @employmentType,
           hire_date = @hireDate, updated_at = datetime('now')
         WHERE id = @id`,
      )
      .run({ ...input, id });
    return result.changes > 0;
  }

  /** Returns false when no employee has this id. */
  delete(id: number): boolean {
    return this.db.prepare('DELETE FROM employees WHERE id = ?').run(id).changes > 0;
  }
}
