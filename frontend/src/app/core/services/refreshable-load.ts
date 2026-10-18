import { computed, inject, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Observable, switchMap } from 'rxjs';

import { DataRefreshService } from './data-refresh.service';

export interface LoadState<T> {
  /** The latest successful result; kept on error (the interceptor already reported it). */
  value: Signal<T | undefined>;
  loading: Signal<boolean>;
}

/**
 * Loads `load(params())` whenever the params signal or the DataRefreshService version changes,
 * cancelling any superseded request. Must run in an injection context (e.g. a field initializer).
 */
export function refreshableLoad<P, T>(
  params: () => P,
  load: (params: P) => Observable<T>,
): LoadState<T> {
  const refresh = inject(DataRefreshService);
  const loading = signal(false);
  const trigger = computed(() => ({ params: params(), version: refresh.version() }));

  const value = toSignal(
    toObservable(trigger).pipe(
      switchMap(({ params: current }) => {
        loading.set(true);
        return load(current).pipe(
          catchError(() => EMPTY),
          finalize(() => loading.set(false)),
        );
      }),
    ),
  );

  return { value, loading: loading.asReadonly() };
}
