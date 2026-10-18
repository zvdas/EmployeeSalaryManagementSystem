// CLI: apply schema migrations to the database at DB_PATH (`npm run migrate`).
import { config } from '../config.js';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrator.js';

const db = openDatabase(config.DB_PATH);
try {
  const applied = runMigrations(db);
  const summary = applied.length
    ? applied.map((m) => `  ${m.version}: ${m.name}`).join('\n')
    : '  (none, schema is up to date)';
  console.log(`Migrations applied to ${config.DB_PATH}:\n${summary}`);
} finally {
  db.close();
}
