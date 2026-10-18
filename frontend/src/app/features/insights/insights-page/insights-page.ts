import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BarController, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js';
import { provideCharts } from 'ng2-charts';

import { InsightsApiService } from '../../../core/services/insights-api.service';
import { refreshableLoad } from '../../../core/services/refreshable-load';
import { CountryStatsSection } from '../country-stats/country-stats';
import { CountryOption } from '../country-select/country-select';
import { DepartmentStatsSection } from '../department-stats/department-stats';
import { JobTitleStatsSection } from '../job-title-stats/job-title-stats';
import { KpiCards } from '../kpi-cards/kpi-cards';
import { SalaryDistributionSection } from '../salary-distribution/salary-distribution';

/** Dashboard answering "how do we pay people?"; every section reloads on data refresh. */
@Component({
  selector: 'app-insights-page',
  imports: [
    CountryStatsSection,
    DepartmentStatsSection,
    JobTitleStatsSection,
    KpiCards,
    MatProgressBarModule,
    SalaryDistributionSection,
  ],
  // Registered here rather than app-wide so Chart.js stays in this lazy chunk; only the pieces
  // the bar charts use are included.
  providers: [
    provideCharts({
      registerables: [BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip],
    }),
  ],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  private readonly api = inject(InsightsApiService);

  private readonly summaryLoad = refreshableLoad(
    () => null,
    () => this.api.summary(),
  );
  private readonly countryLoad = refreshableLoad(
    () => null,
    () => this.api.byCountry(),
  );

  protected readonly summary = this.summaryLoad.value;
  protected readonly byCountry = computed(() => this.countryLoad.value() ?? []);
  protected readonly loading = computed(
    () => this.summaryLoad.loading() || this.countryLoad.loading(),
  );
  /** Countries that have employees, by headcount (the API's order). */
  protected readonly countries = computed<CountryOption[]>(() =>
    this.byCountry().map((c) => ({ code: c.countryCode, name: c.countryName })),
  );
}
