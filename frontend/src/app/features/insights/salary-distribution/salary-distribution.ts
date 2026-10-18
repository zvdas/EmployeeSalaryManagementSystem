import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';

import { InsightsApiService } from '../../../core/services/insights-api.service';
import { refreshableLoad } from '../../../core/services/refreshable-load';
import { MoneyPipe } from '../../../shared/money';
import { barOptions, distributionChart } from '../chart-data';
import { CountryOption, CountrySelect } from '../country-select/country-select';

/** Histogram of salaries in USD, with 1.5×IQR outlier counts. */
@Component({
  selector: 'app-salary-distribution',
  imports: [
    BaseChartDirective,
    CountrySelect,
    DecimalPipe,
    MatCardModule,
    MatProgressBarModule,
    MoneyPipe,
  ],
  templateUrl: './salary-distribution.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryDistributionSection {
  private readonly api = inject(InsightsApiService);

  readonly countries = input.required<readonly CountryOption[]>();
  /** `''` means the whole organisation. */
  protected readonly country = signal('');

  private readonly result = refreshableLoad(this.country, (country) =>
    this.api.distribution(country || undefined),
  );
  protected readonly distribution = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly chartData = computed(() => {
    const distribution = this.distribution();
    return distribution ? distributionChart(distribution) : null;
  });
  protected readonly chartOptions = barOptions({ values: 'count' });
}
