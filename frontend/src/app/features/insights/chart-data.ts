import { ChartData, ChartOptions, TooltipItem } from 'chart.js';

import { CountryStats, DepartmentStats, Distribution, DistributionBucket } from '../../core/models';
import { formatMoney } from '../../shared/money';

/** Azure-family colours matching the Material theme. */
export const CHART_COLORS = { primary: '#005cbb', secondary: '#7cabff' } as const;

const UNITS: readonly [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
];

/** Short USD amounts for axes and labels: 40000 → "$40k", 1250000 → "$1.3M". */
export function formatCompactUsd(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  for (const [size, suffix] of UNITS) {
    if (abs >= size) return `${sign}$${Number((abs / size).toFixed(1))}${suffix}`;
  }
  return `${sign}$${Math.round(abs)}`;
}

/** Histogram label, e.g. "$40k–$60k". */
export function bucketLabel({ min, max }: DistributionBucket): string {
  return `${formatCompactUsd(min)}–${formatCompactUsd(max)}`;
}

export function countryAvgMedianChart(rows: readonly CountryStats[]): ChartData<'bar'> {
  return {
    labels: rows.map((r) => r.countryName),
    datasets: [
      {
        label: 'Average (USD)',
        data: rows.map((r) => r.avgSalaryUsd),
        backgroundColor: CHART_COLORS.primary,
      },
      {
        label: 'Median (USD)',
        data: rows.map((r) => r.medianSalaryUsd),
        backgroundColor: CHART_COLORS.secondary,
      },
    ],
  };
}

export function departmentPayrollChart(rows: readonly DepartmentStats[]): ChartData<'bar'> {
  return {
    labels: rows.map((r) => r.department),
    datasets: [
      {
        label: 'Total payroll (USD)',
        data: rows.map((r) => r.totalPayrollUsd),
        backgroundColor: CHART_COLORS.primary,
      },
    ],
  };
}

export function distributionChart(distribution: Distribution): ChartData<'bar'> {
  return {
    labels: distribution.buckets.map(bucketLabel),
    datasets: [
      {
        label: 'Employees',
        data: distribution.buckets.map((b) => b.count),
        backgroundColor: CHART_COLORS.primary,
        barPercentage: 1,
        categoryPercentage: 0.95,
      },
    ],
  };
}

export interface BarOptionsConfig {
  /** How values are formatted on the axis and in tooltips. */
  values: 'usd' | 'count';
  /** Horizontal bars suit long category labels. */
  horizontal?: boolean;
  legend?: boolean;
}

/** Responsive bar chart options that fill their (fixed-height) container. */
export function barOptions({
  values,
  horizontal = false,
  legend = false,
}: BarOptionsConfig): ChartOptions<'bar'> {
  const axisLabel = (v: number) =>
    values === 'usd' ? formatCompactUsd(v) : v.toLocaleString('en-US');
  const valueScale = {
    beginAtZero: true,
    ticks: { callback: (v: string | number) => axisLabel(Number(v)) },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: legend, position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const value = (horizontal ? item.parsed.x : item.parsed.y) ?? 0;
            const text = values === 'usd' ? formatMoney(value) : value.toLocaleString('en-US');
            return `${item.dataset.label}: ${text}`;
          },
        },
      },
    },
    scales: horizontal ? { x: valueScale } : { y: valueScale },
  };
}
