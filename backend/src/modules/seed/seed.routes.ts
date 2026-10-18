import { Router } from 'express';
import { validate, validated } from '../../middleware/validate.js';
import { seedRequestSchema, type SeedRequest } from './seed.schemas.js';
import type { SeedService } from './seed.service.js';

export function createSeedRouter(service: SeedService): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(service.status());
  });

  router.post('/', validate({ body: seedRequestSchema }), (_req, res) => {
    res.status(201).json(service.seed(validated<SeedRequest>(res, 'body').count));
  });

  return router;
}
