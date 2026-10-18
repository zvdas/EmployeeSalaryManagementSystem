import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { By } from '@angular/platform-browser';

import { environment } from '../../../../environments/environment';
import { CountryStats, Distribution, InsightsSummary } from '../../../core/models';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { ChartStub, stubCharts } from '../../../../testing/chart-stub';
import { CountryStatsSection } from '../country-stats/country-stats';
import { DepartmentStatsSection } from '../department-stats/department-stats';
import { SalaryDistributionSection } from '../salary-distribution/salary-distribution';
import { InsightsPage } from './insights-page';

const base = `${environment.apiUrl}/insights`;

const summary: InsightsSummary = {
  headcount: 10000,
  totalPayrollUsd: 987654321,
  avgSalaryUsd: 98765,
  medianSalaryUsd: 87654,
  countryCount: 8,
  departmentCount: 10,
};

const countryRow = (code: string, name: string, currency: string): CountryStats => ({
  countryCode: code,
  countryName: name,
  currency,
  headcount: 100,
  minSalary: 1000,
  maxSalary: 9000,
  avgSalary: 5000,
  medianSalary: 4800,
  avgSalaryUsd: 60000,
  medianSalaryUsd: 58000,
  totalPayrollUsd: 6000000,
});

const byCountry = [countryRow('US', 'United States', 'USD'), countryRow('IN', 'India', 'INR')];

const distribution: Distribution = {
  currency: 'USD',
  buckets: [{ min: 20000, max: 40000, count: 12 }],
  outliers: { lowThreshold: 5000, highThreshold: 250000, lowCount: 2, highCount: 7 },
};

describe('InsightsPage', () => {
  let fixture: ComponentFixture<InsightsPage>;
  let http: HttpTestingController;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [InsightsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    stubCharts(CountryStatsSection, DepartmentStatsSection, SalaryDistributionSection);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InsightsPage);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function loadPage(): Promise<void> {
    http.expectOne(`${base}/summary`).flush(summary);
    http.expectOne(`${base}/by-country`).flush(byCountry);
    await fixture.whenStable();
  }

  /** Answers the requests the child sections make, asserting their params. */
  async function flushSections(jobTitleCountry = 'US'): Promise<void> {
    const jobTitles = http.expectOne((r) => r.url === `${base}/by-job-title`);
    expect(jobTitles.request.params.get('country')).toBe(jobTitleCountry);
    jobTitles.flush([]);
    const departments = http.expectOne((r) => r.url === `${base}/by-department`);
    expect(departments.request.params.keys()).toEqual([]);
    departments.flush([]);
    http.expectOne((r) => r.url === `${base}/distribution`).flush(distribution);
    await fixture.whenStable();
  }

  it('requests the summary and by-country stats and renders the KPIs', async () => {
    await loadPage();
    await flushSections();

    expect(text()).toContain('10,000');
    expect(text()).toContain('$987,654,321');
    expect(text()).toContain('$98,765');
    expect(text()).toContain('$87,654');
    expect(text()).toContain('8 countries · 10 departments');
  });

  it('renders the by-country table in local currency and feeds the chart', async () => {
    await loadPage();
    await flushSections();

    const countryTable = (fixture.nativeElement as HTMLElement).querySelector(
      'app-country-stats table',
    );
    expect(countryTable?.textContent).toContain('India');
    expect(countryTable?.textContent).toContain('₹5,000');
    const chart = fixture.debugElement
      .query(By.css('app-country-stats'))
      .query(By.directive(ChartStub))
      .injector.get(ChartStub);
    expect(chart.data()).toMatchObject({ labels: ['United States', 'India'] });
  });

  it('loads job titles for the top country, then for the selected one', async () => {
    await loadPage();
    await flushSections('US');

    const select = await loader.getHarness(
      MatSelectHarness.with({ ancestor: 'app-job-title-stats' }),
    );
    expect(await select.getValueText()).toBe('United States');
    await select.open();
    await select.clickOptions({ text: 'India' });

    const req = http.expectOne((r) => r.url === `${base}/by-job-title`);
    expect(req.request.params.get('country')).toBe('IN');
    req.flush([]);
  });

  it('filters departments and distribution by country when one is chosen', async () => {
    await loadPage();
    await flushSections();

    for (const [section, path] of [
      ['app-department-stats', 'by-department'],
      ['app-salary-distribution', 'distribution'],
    ]) {
      const select = await loader.getHarness(MatSelectHarness.with({ ancestor: section }));
      expect(await select.getValueText()).toBe('All countries');
      await select.open();
      await select.clickOptions({ text: 'India' });
      const req = http.expectOne((r) => r.url === `${base}/${path}`);
      expect(req.request.params.get('country')).toBe('IN');
      req.flush(path === 'distribution' ? distribution : []);
    }
  });

  it('shows outlier thresholds and counts', async () => {
    await loadPage();
    await flushSections();
    expect(text()).toContain('2 below $5,000');
    expect(text()).toContain('7 above $250,000');
  });

  it('shows an empty state without loading sections when there are no employees', async () => {
    http.expectOne(`${base}/summary`).flush({ ...summary, headcount: 0 });
    http.expectOne(`${base}/by-country`).flush([]);
    await fixture.whenStable();

    expect(text()).toContain('No employees yet');
    http.expectNone((r) => r.url.startsWith(`${base}/by-job-title`));
  });

  it('reloads when the data is refreshed', async () => {
    await loadPage();
    await flushSections();

    TestBed.inject(DataRefreshService).bump();
    await fixture.whenStable();
    await loadPage();
    await flushSections();
  });
});
