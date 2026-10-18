import { COUNTRIES, JOB_TITLES, type Country, type EmploymentType } from '../domain/reference.js';
import { FIRST_NAMES, LAST_NAMES } from './names.js';
import { mulberry32, pick, pickWeighted, randomInt, type Random } from './prng.js';

export interface GeneratedEmployee {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  annualSalary: number;
  employmentType: EmploymentType;
  hireDate: string;
}

export const DEFAULT_SEED = 42;

const COUNTRY_WEIGHTS: Record<string, number> = {
  US: 30,
  IN: 20,
  GB: 12,
  DE: 10,
  CA: 8,
  AU: 7,
  SG: 7,
  BR: 6,
};

const WEIGHTED_COUNTRIES = COUNTRIES.map((c) => [c, COUNTRY_WEIGHTS[c.code] ?? 0] as const);

const WEIGHTED_EMPLOYMENT_TYPES: readonly (readonly [EmploymentType, number])[] = [
  ['FULL_TIME', 85],
  ['PART_TIME', 8],
  ['CONTRACT', 7],
];

const DAY_MS = 86_400_000;
const FIRST_HIRE_DAY = Date.UTC(2012, 0, 1) / DAY_MS;
const LAST_HIRE_DAY = Date.UTC(2026, 8, 30) / DAY_MS;

export function formatEmployeeCode(sequence: number): string {
  return `EMP-${String(sequence).padStart(6, '0')}`;
}

function emailLocalPart(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** base(title) × factor(country) × jitter(0.85–1.20) ÷ usdRate, rounded to the nearest 100. */
function localSalary(random: Random, baseUsd: number, country: Country): number {
  const jitter = 0.85 + random() * 0.35;
  const local = (baseUsd * country.salaryFactor * jitter) / country.usdRate;
  return Math.max(100, Math.round(local / 100) * 100);
}

function randomHireDate(random: Random): string {
  const day = randomInt(random, FIRST_HIRE_DAY, LAST_HIRE_DAY);
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function generateEmployee(random: Random, sequence: number): GeneratedEmployee {
  const firstName = pick(random, FIRST_NAMES);
  const lastName = pick(random, LAST_NAMES);
  const title = pick(random, JOB_TITLES);
  const country = pickWeighted(random, WEIGHTED_COUNTRIES);

  return {
    employeeCode: formatEmployeeCode(sequence),
    fullName: `${firstName} ${lastName}`,
    email: `${emailLocalPart(firstName)}.${emailLocalPart(lastName)}.${sequence}@acme.example`,
    jobTitle: title.title,
    department: title.department,
    countryCode: country.code,
    annualSalary: localSalary(random, title.baseUsd, country),
    employmentType: pickWeighted(random, WEIGHTED_EMPLOYMENT_TYPES),
    hireDate: randomHireDate(random),
  };
}

/** Pure and deterministic: the same `(count, seed)` always yields the same employees. */
export function generateEmployees(count: number, seed = DEFAULT_SEED): GeneratedEmployee[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => generateEmployee(random, i + 1));
}
