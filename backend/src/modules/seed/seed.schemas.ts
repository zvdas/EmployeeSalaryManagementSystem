import { z } from 'zod';

/** The UI offers a quick 100-row sample or the full 10,000-employee dataset. */
export const seedRequestSchema = z.object({
  count: z.union([z.literal(100), z.literal(10_000)]),
});

export const seedStatusSchema = z.object({
  employeeCount: z.number().int(),
  isEmpty: z.boolean(),
});

export const seedResultSchema = z.object({
  inserted: z.number().int(),
});

export type SeedRequest = z.output<typeof seedRequestSchema>;
export type SeedStatus = z.output<typeof seedStatusSchema>;
export type SeedResult = z.output<typeof seedResultSchema>;
