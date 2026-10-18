import { roundMoney, toUsd } from '../../lib/currency.js';
import { histogram, iqrOutliers, median } from '../../lib/stats.js';
import type { InsightsRepository } from './insights.repository.js';
import type {
  CountryStats,
  DepartmentStats,
  Distribution,
  JobTitleStats,
  Summary,
} from './insights.schemas.js';

/** Rounded average that is 0 (not NaN) for an empty group. */
function average(total: number, count: number): number {
  return count === 0 ? 0 : roundMoney(total / count);
}

export class InsightsService {
  constructor(private readonly repo: InsightsRepository) {}

  summary(): Summary {
    const totals = this.repo.summaryTotals();
    return {
      ...totals,
      totalPayrollUsd: roundMoney(totals.totalPayrollUsd),
      avgSalaryUsd: average(totals.totalPayrollUsd, totals.headcount),
      medianSalaryUsd: roundMoney(median(this.repo.sortedUsdSalaries())),
    };
  }

  byCountry(): CountryStats[] {
    const salaries = this.repo.sortedSalariesBy('country', 'local');

    return this.repo.countryTotals().map(({ usdRate, totalSalary, ...row }) => {
      const medianSalary = median(salaries.get(row.countryCode) ?? []);
      return {
        ...row,
        avgSalary: average(totalSalary, row.headcount),
        medianSalary: roundMoney(medianSalary),
        avgSalaryUsd: average(row.totalPayrollUsd, row.headcount),
        medianSalaryUsd: toUsd(medianSalary, usdRate),
        totalPayrollUsd: roundMoney(row.totalPayrollUsd),
      };
    });
  }

  /** Local-currency pay per job title in one country. */
  byJobTitle(country: string): JobTitleStats[] {
    const salaries = this.repo.sortedSalariesBy('jobTitle', 'local', country);

    return this.repo.jobTitleTotals(country).map(({ totalSalary, ...row }) => ({
      ...row,
      avgSalary: average(totalSalary, row.headcount),
      medianSalary: roundMoney(median(salaries.get(row.jobTitle) ?? [])),
    }));
  }

  /** USD headcount and payroll per department, for one country or the whole org. */
  byDepartment(country?: string): DepartmentStats[] {
    const salaries = this.repo.sortedSalariesBy('department', 'usd', country);

    return this.repo.departmentTotals(country).map((row) => ({
      ...row,
      totalPayrollUsd: roundMoney(row.totalPayrollUsd),
      avgSalaryUsd: average(row.totalPayrollUsd, row.headcount),
      medianSalaryUsd: roundMoney(median(salaries.get(row.department) ?? [])),
    }));
  }

  /** USD salary histogram plus 1.5 × IQR outlier thresholds. */
  distribution(country: string | undefined, bucketCount: number): Distribution {
    const salaries = this.repo.sortedUsdSalaries(country);
    const outliers = iqrOutliers(salaries);

    return {
      currency: 'USD',
      buckets: histogram(salaries, bucketCount).map((b) => ({
        min: roundMoney(b.min),
        max: roundMoney(b.max),
        count: b.count,
      })),
      outliers: {
        ...outliers,
        lowThreshold: roundMoney(outliers.lowThreshold),
        highThreshold: roundMoney(outliers.highThreshold),
      },
    };
  }
}
