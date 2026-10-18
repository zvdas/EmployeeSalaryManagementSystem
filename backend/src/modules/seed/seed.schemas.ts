import { z } from '../../lib/zod.js';

/** The UI offers a quick 100-row sample or the full 10,000-employee dataset. */
export const seedRequestSchema = z
  .object({
    count: z.union([z.literal(100), z.literal(10_000)]),
  })
  .openapi('SeedRequest');

export const seedStatusSchema = z
  .object({
    employeeCount: z.number().int(),
    isEmpty: z.boolean(),
  })
  .openapi('SeedStatus');

export const seedResultSchema = z
  .object({
    inserted: z.number().int(),
  })
  .openapi('SeedResult');

export type SeedRequest = z.output<typeof seedRequestSchema>;
export type SeedStatus = z.output<typeof seedStatusSchema>;
export type SeedResult = z.output<typeof seedResultSchema>;
