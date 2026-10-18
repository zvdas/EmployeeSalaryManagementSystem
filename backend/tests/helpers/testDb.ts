import type { Database } from 'better-sqlite3';
import { createApp } from '../../src/app.js';
import { openInMemoryDatabase } from '../../src/db/connection.js';
import { runMigrations } from '../../src/db/migrator.js';

/** A fresh, fully migrated in-memory database. */
export function createTestDb(): Database {
  const db = openInMemoryDatabase();
  runMigrations(db);
  return db;
}

/** The real app wired to a fresh in-memory database. */
export function createTestApp(db: Database = createTestDb()) {
  return createApp({ db });
}
