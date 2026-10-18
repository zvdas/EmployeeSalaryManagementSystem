import { Router } from 'express';
import type { AppDeps } from './app.js';
import { EmployeeRepository } from './modules/employees/employee.repository.js';
import { createEmployeeRouter } from './modules/employees/employee.routes.js';
import { EmployeeService } from './modules/employees/employee.service.js';
import { createMetaRouter } from './modules/meta/meta.routes.js';

/** Builds the `/api` router, wiring each module's repository → service → routes. */
export function createApiRouter({ db, now }: AppDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/meta', createMetaRouter());
  router.use(
    '/employees',
    createEmployeeRouter(new EmployeeService(new EmployeeRepository(db), now)),
  );

  return router;
}
