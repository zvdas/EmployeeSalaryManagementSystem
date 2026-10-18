import type { Database } from 'better-sqlite3';
import { createApp } from '../../src/app.js';
import { openInMemoryDatabase } from '../../src/db/connection.js';
import { runMigrations } from '../../src/db/migrator.js';

/** "Today" for every test, so date rules are deterministic. */
export const FIXED_NOW = new Date('2026-10-18T12:00:00Z');

/** A fresh, fully migrated in-memory database. */
export function createTestDb(): Database {
  const db = openInMemoryDatabase();
  runMigrations(db);
  return db;
}

/** The real app wired to a fresh in-memory database and a fixed clock. */
export function createTestApp(db: Database = createTestDb()) {
  return createApp({ db, now: () => FIXED_NOW });
}
