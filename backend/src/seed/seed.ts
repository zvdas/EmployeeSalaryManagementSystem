// CLI: `npm run seed -- --count=10000` seeds an empty DB; `npm run seed:reset` wipes and re-seeds.
import { parseArgs } from 'node:util';
import type { Database } from 'better-sqlite3';
import { config } from '../config.js';
import { openDatabase } from '../db/connection.js';
import { runMigrations } from '../db/migrator.js';
import { countEmployees, deleteAllEmployees, seedDatabase } from './seedDatabase.js';

const DEFAULT_COUNT = 10_000;

function parseCount(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_COUNT;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--count must be a positive integer, got "${raw}"`);
  }
  return count;
}

/** Returns the process exit code. */
function run(db: Database, count: number, reset: boolean): number {
  runMigrations(db);

  if (reset) {
    deleteAllEmployees(db);
  } else {
    const existing = countEmployees(db);
    if (existing > 0) {
      console.error(
        `Refusing to seed: ${config.DB_PATH} already has ${existing} employees. ` +
          'Use `npm run seed:reset` to wipe and re-seed.',
      );
      return 1;
    }
  }

  const started = performance.now();
  const inserted = seedDatabase(db, count);
  const elapsedMs = Math.round(performance.now() - started);
  console.log(`Seeded ${inserted} employees into ${config.DB_PATH} in ${elapsedMs} ms`);
  return 0;
}

const { values } = parseArgs({
  options: { count: { type: 'string' }, reset: { type: 'boolean', default: false } },
});

const db = openDatabase(config.DB_PATH);
try {
  process.exitCode = run(db, parseCount(values.count), values.reset);
} finally {
  db.close();
}
