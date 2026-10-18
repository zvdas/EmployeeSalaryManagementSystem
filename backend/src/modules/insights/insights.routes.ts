import { Router } from 'express';
import { validate, validated } from '../../middleware/validate.js';
import type { InsightsService } from './insights.service.js';
import {
  distributionQuerySchema,
  optionalCountryQuerySchema,
  requiredCountryQuerySchema,
  type DistributionQuery,
} from './insights.schemas.js';

export function createInsightsRouter(service: InsightsService): Router {
  const router = Router();

  router.get('/summary', (_req, res) => {
    res.json(service.summary());
  });

  router.get('/by-country', (_req, res) => {
    res.json(service.byCountry());
  });

  router.get('/by-job-title', validate({ query: requiredCountryQuerySchema }), (_req, res) => {
    res.json(service.byJobTitle(validated<{ country: string }>(res, 'query').country));
  });

  router.get('/by-department', validate({ query: optionalCountryQuerySchema }), (_req, res) => {
    res.json(service.byDepartment(validated<{ country?: string }>(res, 'query').country));
  });

  router.get('/distribution', validate({ query: distributionQuerySchema }), (_req, res) => {
    const { country, buckets } = validated<DistributionQuery>(res, 'query');
    res.json(service.distribution(country, buckets));
  });

  return router;
}
