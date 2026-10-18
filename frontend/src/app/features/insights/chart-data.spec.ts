import { TooltipItem } from 'chart.js';

import { CountryStats, DepartmentStats, Distribution } from '../../core/models';
import {
  barOptions,
  bucketLabel,
  CHART_COLORS,
  countryAvgMedianChart,
  departmentPayrollChart,
  distributionChart,
  formatCompactUsd,
} from './chart-data';

describe('formatCompactUsd', () => {
  it.each([
    [0, '$0'],
    [950, '$950'],
    [40000, '$40k'],
    [42500, '$42.5k'],
    [1250000, '$1.3M'],
    [2000000000, '$2B'],
    [-15000, '-$15k'],
  ])('formats %p as %s', (amount, expected) => {
    expect(formatCompactUsd(amount)).toBe(expected);
  });
});

describe('bucketLabel', () => {
  it('joins the compact bounds with an en dash', () => {
    expect(bucketLabel({ min: 40000, max: 60000, count: 3 })).toBe('$40k–$60k');
  });
});

describe('chart data mapping', () => {
  const country = (code: string, name: string, avg: number, median: number): CountryStats => ({
    countryCode: code,
    countryName: name,
    currency: 'USD',
    headcount: 1,
    minSalary: 0,
    maxSalary: 0,
    avgSalary: 0,
    medianSalary: 0,
    avgSalaryUsd: avg,
    medianSalaryUsd: median,
    totalPayrollUsd: 0,
  });

  it('maps countries to average and median USD series', () => {
    const data = countryAvgMedianChart([
      country('US', 'United States', 120000, 110000),
      country('IN', 'India', 30000, 28000),
    ]);

    expect(data.labels).toEqual(['United States', 'India']);
    expect(data.datasets.map((d) => [d.label, d.data])).toEqual([
      ['Average (USD)', [120000, 30000]],
      ['Median (USD)', [110000, 28000]],
    ]);
    expect(data.datasets[0].backgroundColor).toBe(CHART_COLORS.primary);
  });

  it('maps departments to a payroll series', () => {
    const rows: DepartmentStats[] = [
      {
        department: 'Engineering',
        headcount: 2,
        totalPayrollUsd: 250000,
        avgSalaryUsd: 125000,
        medianSalaryUsd: 125000,
      },
    ];
    const data = departmentPayrollChart(rows);

    expect(data.labels).toEqual(['Engineering']);
    expect(data.datasets[0].data).toEqual([250000]);
  });

  it('maps distribution buckets to labelled counts', () => {
    const distribution: Distribution = {
      currency: 'USD',
      buckets: [
        { min: 20000, max: 40000, count: 5 },
        { min: 40000, max: 60000, count: 9 },
      ],
      outliers: { lowThreshold: 0, highThreshold: 200000, lowCount: 0, highCount: 1 },
    };
    const data = distributionChart(distribution);

    expect(data.labels).toEqual(['$20k–$40k', '$40k–$60k']);
    expect(data.datasets[0].data).toEqual([5, 9]);
  });
});

describe('barOptions', () => {
  type Tick = (value: string | number) => string;
  type Label = (item: TooltipItem<'bar'>) => string;

  const tooltipItem = (x: number, y: number) =>
    ({ parsed: { x, y }, dataset: { label: 'Series' } }) as unknown as TooltipItem<'bar'>;

  it('formats a vertical USD axis compactly and tooltips in full', () => {
    const options = barOptions({ values: 'usd', legend: true });
    const tick = options.scales?.['y']?.ticks?.callback as unknown as Tick;
    const label = options.plugins?.tooltip?.callbacks?.label as unknown as Label;

    expect(options.indexAxis).toBe('x');
    expect(options.plugins?.legend?.display).toBe(true);
    expect(options.responsive).toBe(true);
    expect(tick(50000)).toBe('$50k');
    expect(label(tooltipItem(0, 123456))).toBe('Series: $123,456');
  });

  it('uses the x axis for values on horizontal charts', () => {
    const options = barOptions({ values: 'usd', horizontal: true });
    const label = options.plugins?.tooltip?.callbacks?.label as unknown as Label;

    expect(options.indexAxis).toBe('y');
    expect(options.scales?.['x']).toBeDefined();
    expect(label(tooltipItem(98000, 2))).toBe('Series: $98,000');
  });

  it('formats counts with separators', () => {
    const options = barOptions({ values: 'count' });
    const tick = options.scales?.['y']?.ticks?.callback as unknown as Tick;
    const label = options.plugins?.tooltip?.callbacks?.label as unknown as Label;

    expect(tick(1500)).toBe('1,500');
    expect(label(tooltipItem(0, 1200))).toBe('Series: 1,200');
  });
});
