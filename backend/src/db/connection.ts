import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database, { type Database as DatabaseType } from 'better-sqlite3';

const IN_MEMORY = ':memory:';

function applyPragmas(db: DatabaseType, { wal }: { wal: boolean }): void {
  if (wal) db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
}

/** Opens (creating it and its folder if needed) a SQLite file; `:memory:` gives a throwaway DB. */
export function openDatabase(path: string): DatabaseType {
  if (path === IN_MEMORY) return openInMemoryDatabase();

  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  applyPragmas(db, { wal: true });
  return db;
}

export function openInMemoryDatabase(): DatabaseType {
  const db = new Database(IN_MEMORY);
  applyPragmas(db, { wal: false });
  return db;
}
