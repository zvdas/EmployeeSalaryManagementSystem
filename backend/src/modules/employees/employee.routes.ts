import { Router } from 'express';
import { CSV_LINE_END, UTF8_BOM } from '../../lib/csv.js';
import { validate, validated } from '../../middleware/validate.js';
import { EXPORT_HEADER, employeeToCsvRow } from './employee.csv.js';
import type { EmployeeService } from './employee.service.js';
import {
  employeeExportQuerySchema,
  employeeIdParamsSchema,
  employeeInputSchema,
  employeeListQuerySchema,
  type EmployeeExportQuery,
  type EmployeeInput,
  type EmployeeListQuery,
} from './employee.schemas.js';

type IdParams = { id: number };

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', validate({ query: employeeListQuerySchema }), (_req, res) => {
    res.json(service.list(validated<EmployeeListQuery>(res, 'query')));
  });

  // Registered before `/:id` so "export.csv" is not taken for an id.
  router.get('/export.csv', validate({ query: employeeExportQuerySchema }), (_req, res) => {
    const rows = service.exportRows(validated<EmployeeExportQuery>(res, 'query'));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    // Rows are written synchronously on purpose: awaiting 'drain' mid-iteration would keep the
    // shared SQLite connection busy for other requests.
    res.write(UTF8_BOM + EXPORT_HEADER + CSV_LINE_END);
    for (const employee of rows) res.write(employeeToCsvRow(employee) + CSV_LINE_END);
    res.end();
  });

  router.get('/:id', validate({ params: employeeIdParamsSchema }), (_req, res) => {
    res.json(service.get(validated<IdParams>(res, 'params').id));
  });

  router.post('/', validate({ body: employeeInputSchema }), (_req, res) => {
    res.status(201).json(service.create(validated<EmployeeInput>(res, 'body')));
  });

  router.put(
    '/:id',
    validate({ params: employeeIdParamsSchema, body: employeeInputSchema }),
    (_req, res) => {
      const { id } = validated<IdParams>(res, 'params');
      res.json(service.update(id, validated<EmployeeInput>(res, 'body')));
    },
  );

  router.delete('/:id', validate({ params: employeeIdParamsSchema }), (_req, res) => {
    service.remove(validated<IdParams>(res, 'params').id);
    res.status(204).end();
  });

  return router;
}
