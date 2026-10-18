import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type ErrorDetail } from '../lib/errors.js';
import { zodIssuesToDetails } from './errorHandler.js';

export type RequestPart = 'body' | 'query' | 'params';

export type RequestSchemas = Partial<Record<RequestPart, ZodType>>;

type ValidatedLocals = Partial<Record<RequestPart, unknown>>;

/**
 * Parses the given request parts with zod and stores the parsed values on `res.locals.validated`
 * (Express 5 exposes `req.query` as a read-only getter, so it cannot be replaced). All failures
 * across parts are reported together as one 400 VALIDATION_ERROR.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  const parts = Object.entries(schemas) as [RequestPart, ZodType][];

  return (req, res, next) => {
    const validated: ValidatedLocals = {};
    const details: ErrorDetail[] = [];

    for (const [part, schema] of parts) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) validated[part] = result.data;
      else details.push(...zodIssuesToDetails(result.error));
    }

    if (details.length > 0) throw new ValidationError('Request validation failed', details);
    res.locals.validated = validated;
    next();
  };
}

/** Reads a value parsed by `validate()`. The caller states the type its schema produces. */
export function validated<T>(res: Response, part: RequestPart): T {
  const values = res.locals.validated as ValidatedLocals | undefined;
  if (!values || !(part in values)) {
    throw new Error(`No validated "${part}" on this request; is validate() mounted?`);
  }
  return values[part] as T;
}
