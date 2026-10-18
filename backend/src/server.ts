import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db/connection.js';
import { runMigrations } from './db/migrator.js';

// Seeding is explicit (CLI or POST /api/seed), never automatic on start-up.
const db = openDatabase(config.DB_PATH);
runMigrations(db);

const app = createApp({ db });

const server = app.listen(config.PORT, () => {
  console.log(`ESMS API listening on http://localhost:${config.PORT}/api (${config.NODE_ENV})`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down...`);
  server.close((err) => {
    db.close();
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    process.exit(0);
  });
  // Force-exit if open connections keep the server alive too long.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
