import type { Database } from 'better-sqlite3';
import { ConflictError } from '../../lib/errors.js';
import { countEmployees, seedDatabase } from '../../seed/seedDatabase.js';
import type { SeedResult, SeedStatus } from './seed.schemas.js';

/** Seeding from the UI. The SQL lives in `seed/seedDatabase.ts`, shared with the CLI. */
export class SeedService {
  constructor(private readonly db: Database) {}

  status(): SeedStatus {
    const employeeCount = countEmployees(this.db);
    return { employeeCount, isEmpty: employeeCount === 0 };
  }

  /** Only seeds an empty database, so real data can never be overwritten from the UI. */
  seed(count: number): SeedResult {
    const existing = countEmployees(this.db);
    if (existing > 0) {
      throw new ConflictError(`The database already has ${existing} employees`);
    }
    return { inserted: seedDatabase(this.db, count) };
  }
}
