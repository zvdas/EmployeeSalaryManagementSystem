import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Database } from 'better-sqlite3';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createApiRouter } from './routes.js';

export interface AppDeps {
  /** Injected SQLite connection (a `:memory:` DB in tests). */
  db: Database;
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: [...config.CORS_ORIGIN] }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', createApiRouter(deps));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
