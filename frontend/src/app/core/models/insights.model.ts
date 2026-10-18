/** All monetary averages and medians are rounded to integers. */

/** `GET /insights/summary` */
export interface InsightsSummary {
  headcount: number;
  totalPayrollUsd: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
  countryCount: number;
  departmentCount: number;
}

/** Row of `GET /insights/by-country` (local amounts; sorted by headcount desc). */
export interface CountryStats {
  countryCode: string;
  countryName: string;
  currency: string;
  headcount: number;
  minSalary: number;
  maxSalary: number;
  avgSalary: number;
  medianSalary: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
  totalPayrollUsd: number;
}

/** Row of `GET /insights/by-job-title?country=XX` (local currency; sorted by avgSalary desc). */
export interface JobTitleStats {
  jobTitle: string;
  department: string;
  currency: string;
  headcount: number;
  minSalary: number;
  maxSalary: number;
  avgSalary: number;
  medianSalary: number;
}

/** Row of `GET /insights/by-department[?country=XX]` (sorted by totalPayrollUsd desc). */
export interface DepartmentStats {
  department: string;
  headcount: number;
  totalPayrollUsd: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
}

export interface DistributionBucket {
  min: number;
  max: number;
  count: number;
}

/** Outlier counts using the 1.5×IQR rule. */
export interface DistributionOutliers {
  lowThreshold: number;
  highThreshold: number;
  lowCount: number;
  highCount: number;
}

/** `GET /insights/distribution[?country=XX&buckets=10]` */
export interface Distribution {
  currency: 'USD';
  buckets: DistributionBucket[];
  outliers: DistributionOutliers;
}
