import { Router } from 'express';
import { COUNTRIES, DEPARTMENTS, EMPLOYMENT_TYPES, JOB_TITLES } from '../../domain/reference.js';
import { z } from '../../lib/zod.js';

export const metaSchema = z
  .object({
    countries: z.array(
      z.object({ code: z.string(), name: z.string(), currency: z.string(), usdRate: z.number() }),
    ),
    departments: z.array(z.string()),
    jobTitles: z.array(z.object({ title: z.string(), department: z.string() })),
    employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)),
  })
  .openapi('Meta');

export type Meta = z.output<typeof metaSchema>;

/** Reference data the UI needs for selects and labels. */
export function buildMeta(): Meta {
  return {
    countries: COUNTRIES.map(({ code, name, currency, usdRate }) => ({
      code,
      name,
      currency,
      usdRate,
    })),
    departments: [...DEPARTMENTS],
    jobTitles: JOB_TITLES.map(({ title, department }) => ({ title, department })),
    employmentTypes: [...EMPLOYMENT_TYPES],
  };
}

export function createMetaRouter(): Router {
  const router = Router();
  const meta = buildMeta();

  router.get('/', (_req, res) => {
    res.json(meta);
  });

  return router;
}
