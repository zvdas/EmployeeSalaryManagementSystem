import type { Database } from 'better-sqlite3';

const FROM_EMPLOYEES = 'FROM employees e JOIN countries c ON c.code = e.country_code';
const USD_SALARY = 'e.annual_salary * c.usd_rate';

/** Columns salaries can be grouped by. Internal constants only, never user input. */
const GROUP_COLUMNS = {
  country: 'e.country_code',
  jobTitle: 'e.job_title',
  department: 'e.department',
} as const;

const SALARY_COLUMNS = { local: 'e.annual_salary', usd: USD_SALARY } as const;

export type SalaryGroup = keyof typeof GROUP_COLUMNS;
export type SalaryCurrency = keyof typeof SALARY_COLUMNS;

/** Optional country filter as a WHERE clause plus its named parameters. */
function countryFilter(country: string | undefined): { sql: string; params: object } {
  return country
    ? { sql: 'WHERE e.country_code = @country', params: { country } }
    : { sql: '', params: {} };
}

export interface SummaryTotals {
  headcount: number;
  totalPayrollUsd: number;
  countryCount: number;
  departmentCount: number;
}

export interface CountryTotals {
  countryCode: string;
  countryName: string;
  currency: string;
  usdRate: number;
  headcount: number;
  minSalary: number;
  maxSalary: number;
  totalSalary: number;
  totalPayrollUsd: number;
}

export interface JobTitleTotals {
  jobTitle: string;
  department: string;
  currency: string;
  headcount: number;
  minSalary: number;
  maxSalary: number;
  totalSalary: number;
}

export interface DepartmentTotals {
  department: string;
  headcount: number;
  totalPayrollUsd: number;
}

/** SQL aggregates (count/min/max/sum) and sorted salary lists; medians are computed in TS. */
export class InsightsRepository {
  constructor(private readonly db: Database) {}

  summaryTotals(): SummaryTotals {
    return this.db
      .prepare(
        `SELECT COUNT(*) AS headcount,
           COALESCE(SUM(${USD_SALARY}), 0) AS totalPayrollUsd,
           COUNT(DISTINCT e.country_code) AS countryCount,
           COUNT(DISTINCT e.department) AS departmentCount
         ${FROM_EMPLOYEES}`,
      )
      .get() as SummaryTotals;
  }

  /** Sorted by headcount, largest first. */
  countryTotals(): CountryTotals[] {
    return this.db
      .prepare(
        `SELECT e.country_code AS countryCode, c.name AS countryName, c.currency,
           c.usd_rate AS usdRate, COUNT(*) AS headcount,
           MIN(e.annual_salary) AS minSalary, MAX(e.annual_salary) AS maxSalary,
           SUM(e.annual_salary) AS totalSalary, SUM(${USD_SALARY}) AS totalPayrollUsd
         ${FROM_EMPLOYEES}
         GROUP BY e.country_code
         ORDER BY headcount DESC, e.country_code ASC`,
      )
      .all() as CountryTotals[];
  }

  /** Job titles within one country, sorted by average local salary, highest first. */
  jobTitleTotals(country: string): JobTitleTotals[] {
    return this.db
      .prepare(
        `SELECT e.job_title AS jobTitle, e.department, c.currency, COUNT(*) AS headcount,
           MIN(e.annual_salary) AS minSalary, MAX(e.annual_salary) AS maxSalary,
           SUM(e.annual_salary) AS totalSalary
         ${FROM_EMPLOYEES}
         WHERE e.country_code = @country
         GROUP BY e.job_title, e.department
         ORDER BY AVG(e.annual_salary) DESC, e.job_title ASC`,
      )
      .all({ country }) as JobTitleTotals[];
  }

  /** Sorted by USD payroll, highest first. */
  departmentTotals(country?: string): DepartmentTotals[] {
    const where = countryFilter(country);
    return this.db
      .prepare(
        `SELECT e.department, COUNT(*) AS headcount, SUM(${USD_SALARY}) AS totalPayrollUsd
         ${FROM_EMPLOYEES} ${where.sql}
         GROUP BY e.department
         ORDER BY totalPayrollUsd DESC, e.department ASC`,
      )
      .all(where.params) as DepartmentTotals[];
  }

  /** All USD salaries (unrounded), ascending. */
  sortedUsdSalaries(country?: string): number[] {
    const where = countryFilter(country);
    return this.db
      .prepare(`SELECT ${USD_SALARY} AS salary ${FROM_EMPLOYEES} ${where.sql} ORDER BY salary`)
      .pluck()
      .all(where.params) as number[];
  }

  /** Salaries per group (e.g. per country), each list ascending. */
  sortedSalariesBy(
    group: SalaryGroup,
    currency: SalaryCurrency,
    country?: string,
  ): Map<string, number[]> {
    const where = countryFilter(country);
    const rows = this.db
      .prepare(
        `SELECT ${GROUP_COLUMNS[group]} AS key, ${SALARY_COLUMNS[currency]} AS salary
         ${FROM_EMPLOYEES} ${where.sql}
         ORDER BY key, salary`,
      )
      .all(where.params) as { key: string; salary: number }[];

    const byGroup = new Map<string, number[]>();
    for (const { key, salary } of rows) {
      const salaries = byGroup.get(key);
      if (salaries) salaries.push(salary);
      else byGroup.set(key, [salary]);
    }
    return byGroup;
  }
}
