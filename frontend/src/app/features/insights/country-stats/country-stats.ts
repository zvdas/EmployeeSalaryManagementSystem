import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';

import { CountryStats } from '../../../core/models';
import { MoneyPipe } from '../../../shared/money';
import { barOptions, countryAvgMedianChart } from '../chart-data';

/** Salary statistics per country: local-currency table plus an avg-vs-median USD chart. */
@Component({
  selector: 'app-country-stats',
  imports: [BaseChartDirective, DecimalPipe, MatCardModule, MatTableModule, MoneyPipe],
  templateUrl: './country-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryStatsSection {
  readonly rows = input.required<readonly CountryStats[]>();

  protected readonly columns = [
    'country',
    'headcount',
    'min',
    'avg',
    'median',
    'max',
    'avgUsd',
    'payrollUsd',
  ] as const;
  protected readonly chartData = computed(() => countryAvgMedianChart(this.rows()));
  protected readonly chartOptions = barOptions({ values: 'usd', legend: true });
}
