import { isKnownCountry, isValidTitleForDepartment } from '../../domain/reference.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../lib/errors.js';
import type { EmployeeRepository } from './employee.repository.js';
import type {
  Employee,
  EmployeeInput,
  EmployeeList,
  EmployeeListQuery,
} from './employee.schemas.js';

export type Clock = () => Date;

/** UTC+14 is the earliest time zone, so this is the latest calendar date anywhere right now. */
const LATEST_UTC_OFFSET_MS = 14 * 60 * 60 * 1000;

function latestTodayIso(now: Date): string {
  return new Date(now.getTime() + LATEST_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export class EmployeeService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  list({ page, pageSize, sortBy, sortDir, ...filters }: EmployeeListQuery): EmployeeList {
    const items = this.repo.list({
      filters,
      sortBy,
      sortDir,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { items, total: this.repo.count(filters), page, pageSize };
  }

  get(id: number): Employee {
    const employee = this.repo.findById(id);
    if (!employee) throw new NotFoundError(`Employee ${id} not found`);
    return employee;
  }

  create(input: EmployeeInput): Employee {
    this.assertValid(input);
    this.assertEmailAvailable(input.email);
    return this.get(this.repo.insert(input));
  }

  update(id: number, input: EmployeeInput): Employee {
    this.get(id);
    this.assertValid(input);
    this.assertEmailAvailable(input.email, id);
    this.repo.update(id, input);
    return this.get(id);
  }

  remove(id: number): void {
    if (!this.repo.delete(id)) throw new NotFoundError(`Employee ${id} not found`);
  }

  /** Business rules that need reference data or the clock (shape is checked by zod). */
  private assertValid(input: EmployeeInput): void {
    const details: ErrorDetail[] = [];

    if (!isKnownCountry(input.countryCode)) {
      details.push({ path: 'countryCode', message: `Unknown country "${input.countryCode}"` });
    }
    if (!isValidTitleForDepartment(input.jobTitle, input.department)) {
      details.push({
        path: 'jobTitle',
        message: `"${input.jobTitle}" is not a job title in ${input.department}`,
      });
    }
    if (input.hireDate > latestTodayIso(this.now())) {
      details.push({ path: 'hireDate', message: 'Hire date cannot be in the future' });
    }

    if (details.length > 0) throw new ValidationError('Request validation failed', details);
  }

  private assertEmailAvailable(email: string, ownId?: number): void {
    const existingId = this.repo.findIdByEmail(email);
    if (existingId !== undefined && existingId !== ownId) {
      throw new ConflictError('An employee with this email already exists', [
        { path: 'email', message: 'Email is already in use' },
      ]);
    }
  }
}
