import { Router } from 'express';
import type { AppDeps } from './app.js';
import { createDocsRouter } from './docs/docs.routes.js';
import { EmployeeRepository } from './modules/employees/employee.repository.js';
import { createEmployeeRouter } from './modules/employees/employee.routes.js';
import { EmployeeService } from './modules/employees/employee.service.js';
import { InsightsRepository } from './modules/insights/insights.repository.js';
import { createInsightsRouter } from './modules/insights/insights.routes.js';
import { InsightsService } from './modules/insights/insights.service.js';
import { createMetaRouter } from './modules/meta/meta.routes.js';
import { createSeedRouter } from './modules/seed/seed.routes.js';
import { SeedService } from './modules/seed/seed.service.js';

/** Builds the `/api` router, wiring each module's repository → service → routes. */
export function createApiRouter({ db, now }: AppDeps): Router {
  const employees = new EmployeeService(new EmployeeRepository(db), now);
  const insights = new InsightsService(new InsightsRepository(db));
  const seed = new SeedService(db);

  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/meta', createMetaRouter());
  router.use('/seed', createSeedRouter(seed));
  router.use('/employees', createEmployeeRouter(employees));
  router.use('/insights', createInsightsRouter(insights));
  router.use(createDocsRouter()); // /openapi.json and /docs

  return router;
}
