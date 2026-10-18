import cors from 'cors';
import express, { type Express } from 'express';
import type { Database } from 'better-sqlite3';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { serveSpa } from './middleware/serveSpa.js';
import { createApiRouter } from './routes.js';

export interface AppDeps {
  /** Injected SQLite connection (a `:memory:` DB in tests). */
  db: Database;
  /** Clock used for date rules such as "hire date not in the future"; defaults to real time. */
  now?: () => Date;
  /** Directory of the built Angular app to serve next to the API (production only). */
  staticDir?: string;
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  // Expose Content-Disposition so the UI can read the CSV export's file name.
  app.use(cors({ origin: [...config.CORS_ORIGIN], exposedHeaders: ['Content-Disposition'] }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', createApiRouter(deps));
  if (deps.staticDir) app.use(serveSpa(deps.staticDir));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
