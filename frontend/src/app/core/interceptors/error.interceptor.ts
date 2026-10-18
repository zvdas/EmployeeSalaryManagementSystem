import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { ApiError } from '../models';

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong';
export const OFFLINE_ERROR_MESSAGE = 'Cannot reach the server';

/**
 * Statuses the caller already shows inline (e.g. form field errors), so the interceptor skips its
 * snackbar for them instead of reporting the same problem twice.
 */
export const INLINE_ERROR_STATUSES = new HttpContextToken<readonly number[]>(() => []);

/** Request context for callers that render the given error statuses themselves. */
export function inlineErrors(...statuses: number[]): HttpContext {
  return new HttpContext().set(INLINE_ERROR_STATUSES, statuses);
}

function isApiError(body: unknown): body is ApiError {
  const error = (body as Partial<ApiError> | null)?.error;
  return typeof error?.message === 'string' && error.message !== '';
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The user-facing message for a failed request whose body has already been parsed. */
export function errorMessageFromBody(status: number, body: unknown): string {
  if (status === 0) return OFFLINE_ERROR_MESSAGE;
  return isApiError(body) ? body.error.message : FALLBACK_ERROR_MESSAGE;
}

/**
 * Like `errorMessageFromBody`, but also handles blob responses (e.g. the CSV export), which
 * carry their JSON error body as a Blob that must be read first.
 */
export async function errorMessageFor(err: HttpErrorResponse): Promise<string> {
  const body: unknown = err.error instanceof Blob ? parseJson(await err.error.text()) : err.error;
  return errorMessageFromBody(err.status, body);
}

/** Shows HTTP failures in a snackbar (unless the caller handles them inline), then rethrows. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      if (req.context.get(INLINE_ERROR_STATUSES).includes(err.status)) {
        return throwError(() => err);
      }
      return from(errorMessageFor(err)).pipe(
        switchMap((message) => {
          snackBar.open(message, 'Dismiss', { duration: 5000 });
          return throwError(() => err);
        }),
      );
    }),
  );
};
