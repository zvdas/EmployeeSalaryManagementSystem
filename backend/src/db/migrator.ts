import type { Database } from 'better-sqlite3';
import { COUNTRIES } from '../domain/reference.js';
import { MIGRATIONS, type Migration } from './schema.js';

function appliedVersions(db: Database): Set<number> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
  return new Set(rows.map((r) => r.version));
}

/** Mirrors the reference countries into the DB so `reference.ts` stays the single source. */
function upsertCountries(db: Database): void {
  const upsert = db.prepare(`
    INSERT INTO countries (code, name, currency, usd_rate)
    VALUES (@code, @name, @currency, @usdRate)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name, currency = excluded.currency, usd_rate = excluded.usd_rate
  `);
  for (const { code, name, currency, usdRate } of COUNTRIES) {
    upsert.run({ code, name, currency, usdRate });
  }
}

/** Applies pending migrations in order and refreshes reference data. Safe to run repeatedly. */
export function runMigrations(db: Database): Migration[] {
  const applied = appliedVersions(db);
  const pending = MIGRATIONS.filter((m) => !applied.has(m.version));
  const record = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');

  db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
      record.run(migration.version, migration.name);
    }
    upsertCountries(db);
  })();

  return pending;
}
