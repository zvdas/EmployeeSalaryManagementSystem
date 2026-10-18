import { EmploymentType } from './employee.model';

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  /** ISO 4217 */
  currency: string;
  /** USD value of 1 unit of local currency */
  usdRate: number;
}

export interface JobTitle {
  title: string;
  department: string;
}

/** `GET /meta` */
export interface Meta {
  countries: Country[];
  departments: string[];
  jobTitles: JobTitle[];
  employmentTypes: EmploymentType[];
}
