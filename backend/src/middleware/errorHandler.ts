import type { ErrorRequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorDetail } from '../lib/errors.js';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}

/** Errors raised by express.json() (body-parser) carry a string `type` and an HTTP `status`. */
function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { type?: unknown }).type === 'string' &&
    typeof (err as { status?: unknown }).status === 'number'
  );
}

export function zodIssuesToDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', zodIssuesToDetails(err));
    return;
  }

  if (isBodyParserError(err) && err.status >= 400 && err.status < 500) {
    const message =
      err.type === 'entity.parse.failed'
        ? 'Malformed JSON in request body'
        : err.type === 'entity.too.large'
          ? 'Request body too large'
          : 'Invalid request body';
    const status = err.type === 'entity.parse.failed' ? 400 : err.status;
    sendError(res, status, 'VALIDATION_ERROR', message);
    return;
  }

  console.error('Unhandled error:', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
};
