import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { of } from 'rxjs';

import { InsightsApiService } from '../../../core/services/insights-api.service';
import { refreshableLoad } from '../../../core/services/refreshable-load';
import { MoneyPipe } from '../../../shared/money';
import { CountryOption, CountrySelect } from '../country-select/country-select';

/** Pay per job title within one country (local currency). */
@Component({
  selector: 'app-job-title-stats',
  imports: [
    CountrySelect,
    DecimalPipe,
    MatCardModule,
    MatProgressBarModule,
    MatTableModule,
    MoneyPipe,
  ],
  templateUrl: './job-title-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobTitleStatsSection {
  private readonly api = inject(InsightsApiService);

  /** Ordered by headcount; the first one is selected by default. */
  readonly countries = input.required<readonly CountryOption[]>();

  /** Keeps the user's choice across reloads while that country still exists. */
  protected readonly country = linkedSignal<readonly CountryOption[], string>({
    source: this.countries,
    computation: (countries, previous) =>
      previous && countries.some((c) => c.code === previous.value)
        ? previous.value
        : (countries[0]?.code ?? ''),
  });

  private readonly stats = refreshableLoad(this.country, (country) =>
    country ? this.api.byJobTitle(country) : of([]),
  );
  protected readonly rows = computed(() => this.stats.value() ?? []);
  protected readonly loading = this.stats.loading;

  protected readonly columns = [
    'jobTitle',
    'department',
    'headcount',
    'min',
    'avg',
    'median',
    'max',
  ] as const;
}
