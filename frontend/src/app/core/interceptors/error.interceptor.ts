import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { ApiError } from '../models';

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong';
export const OFFLINE_ERROR_MESSAGE = 'Cannot reach the server';

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

/** Shows every HTTP failure in a snackbar, then rethrows it for callers to handle. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      return from(errorMessageFor(err)).pipe(
        switchMap((message) => {
          snackBar.open(message, 'Dismiss', { duration: 5000 });
          return throwError(() => err);
        }),
      );
    }),
  );
};
