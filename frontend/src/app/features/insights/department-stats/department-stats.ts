import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';

import { InsightsApiService } from '../../../core/services/insights-api.service';
import { refreshableLoad } from '../../../core/services/refreshable-load';
import { MoneyPipe } from '../../../shared/money';
import { barOptions, departmentPayrollChart } from '../chart-data';
import { CountryOption, CountrySelect } from '../country-select/country-select';

/** Department headcount and payroll (USD), organisation-wide or for one country. */
@Component({
  selector: 'app-department-stats',
  imports: [
    BaseChartDirective,
    CountrySelect,
    DecimalPipe,
    MatCardModule,
    MatProgressBarModule,
    MatTableModule,
    MoneyPipe,
  ],
  templateUrl: './department-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentStatsSection {
  private readonly api = inject(InsightsApiService);

  readonly countries = input.required<readonly CountryOption[]>();
  /** `''` means the whole organisation. */
  protected readonly country = signal('');

  private readonly stats = refreshableLoad(this.country, (country) =>
    this.api.byDepartment(country || undefined),
  );
  protected readonly rows = computed(() => this.stats.value() ?? []);
  protected readonly loading = this.stats.loading;

  protected readonly columns = [
    'department',
    'headcount',
    'payrollUsd',
    'avgUsd',
    'medianUsd',
  ] as const;
  protected readonly chartData = computed(() => departmentPayrollChart(this.rows()));
  protected readonly chartOptions = barOptions({ values: 'usd', horizontal: true });
}
