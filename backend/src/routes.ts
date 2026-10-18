import { Router } from 'express';
import type { AppDeps } from './app.js';

/**
 * Builds the `/api` router. Phase 2 module routers (meta, seed, employees, insights, docs)
 * are mounted here, each receiving the injected dependencies.
 */
export function createApiRouter(_deps: AppDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}
