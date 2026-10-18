import { Router } from 'express';
import { validate, validated } from '../../middleware/validate.js';
import type { EmployeeService } from './employee.service.js';
import {
  employeeIdParamsSchema,
  employeeInputSchema,
  employeeListQuerySchema,
  type EmployeeInput,
  type EmployeeListQuery,
} from './employee.schemas.js';

type IdParams = { id: number };

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', validate({ query: employeeListQuerySchema }), (_req, res) => {
    res.json(service.list(validated<EmployeeListQuery>(res, 'query')));
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
