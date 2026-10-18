import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Country, Meta } from '../models';

/**
 * Reference data from `GET /meta`, fetched once per app session and exposed as signals.
 * A failed request is not cached, so a later subscriber to `meta$` retries.
 */
@Injectable({ providedIn: 'root' })
export class MetaService {
  readonly meta$: Observable<Meta> = inject(HttpClient)
    .get<Meta>(`${environment.apiUrl}/meta`)
    .pipe(shareReplay(1));

  private readonly meta = toSignal(this.meta$.pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  readonly countries = computed(() => this.meta()?.countries ?? []);
  readonly departments = computed(() => this.meta()?.departments ?? []);
  readonly jobTitles = computed(() => this.meta()?.jobTitles ?? []);
  readonly employmentTypes = computed(() => this.meta()?.employmentTypes ?? []);

  private readonly countriesByCode = computed(
    () => new Map(this.countries().map((c) => [c.code, c] as const)),
  );

  country(code: string | null | undefined): Country | undefined {
    return code ? this.countriesByCode().get(code) : undefined;
  }

  currencyFor(countryCode: string | null | undefined): string | undefined {
    return this.country(countryCode)?.currency;
  }

  countryName(countryCode: string): string {
    return this.country(countryCode)?.name ?? countryCode;
  }

  /** Job titles in `department`, or every title when no department is given. */
  titlesFor(department: string | null | undefined): string[] {
    return this.jobTitles()
      .filter((t) => !department || t.department === department)
      .map((t) => t.title);
  }
}
