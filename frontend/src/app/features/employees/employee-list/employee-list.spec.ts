import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatSortHarness } from '@angular/material/sort/testing';
import { By } from '@angular/platform-browser';

import { environment } from '../../../../environments/environment';
import { Employee } from '../../../core/models';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { employeeFixture, META_FIXTURE } from '../../../../testing/fixtures';
import { EmployeeFilterBar } from '../employee-filter-bar/employee-filter-bar';
import { EmployeeList } from './employee-list';

const listUrl = `${environment.apiUrl}/employees`;

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let http: HttpTestingController;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmployeeList);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);
  });

  afterEach(() => http.verify());

  function expectList(): TestRequest {
    return http.expectOne((r) => r.url === listUrl);
  }

  async function respond(req: TestRequest, items: Employee[] = [], total = items.length) {
    const page = Number(req.request.params.get('page'));
    const pageSize = Number(req.request.params.get('pageSize'));
    req.flush({ items, total, page, pageSize });
    await fixture.whenStable();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the first page with default sort and page size', async () => {
    const req = expectList();
    expect(req.request.params.toString()).toBe('sortBy=fullName&sortDir=asc&page=1&pageSize=25');
    await respond(req, [employeeFixture()]);
  });

  it('renders rows with local and USD salary, country name and total', async () => {
    await respond(expectList(), [employeeFixture()], 120);

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tr.mat-mdc-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('EMP-000001');
    expect(rows[0].textContent).toContain('ada@acme.test');
    expect(rows[0].textContent).toContain('India');
    expect(rows[0].textContent).toContain('₹3,000,000');
    expect(rows[0].textContent).toContain('$36,000');
    expect(rows[0].textContent).toContain('Mar 1, 2022');
    expect(await (await loader.getHarness(MatPaginatorHarness)).getRangeLabel()).toBe(
      '1 – 25 of 120',
    );
  });

  it('shows an empty state when nothing matches', async () => {
    await respond(expectList());
    expect(text()).toContain('No employees match your filters.');
  });

  it('requests the next page and a new page size', async () => {
    await respond(expectList(), [employeeFixture()], 120);
    const paginator = await loader.getHarness(MatPaginatorHarness);

    await paginator.goToNextPage();
    const next = expectList();
    expect(next.request.params.get('page')).toBe('2');
    await respond(next, [employeeFixture()], 120);

    await paginator.setPageSize(50);
    const resized = expectList();
    expect(resized.request.params.get('pageSize')).toBe('50');
    await respond(resized, [employeeFixture()], 120);
  });

  it('sorts server-side, mapping the salary column to annualSalaryUsd', async () => {
    await respond(expectList(), [employeeFixture()], 120);
    const sort = await loader.getHarness(MatSortHarness);
    const [salary] = await sort.getSortHeaders({ label: 'Salary' });

    await salary.click();
    const asc = expectList();
    expect(asc.request.params.get('sortBy')).toBe('annualSalaryUsd');
    expect(asc.request.params.get('sortDir')).toBe('asc');
    await respond(asc, [employeeFixture()], 120);

    await salary.click();
    expect(expectList().request.params.get('sortDir')).toBe('desc');
  });

  it('applies filters and resets to the first page', async () => {
    await respond(expectList(), [employeeFixture()], 120);
    await (await loader.getHarness(MatPaginatorHarness)).goToNextPage();
    await respond(expectList(), [employeeFixture()], 120);

    const bar = fixture.debugElement.query(By.directive(EmployeeFilterBar))
      .componentInstance as EmployeeFilterBar;
    bar.filtersChange.emit({ country: 'IN', search: 'ada' });
    await fixture.whenStable();

    const params = expectList().request.params;
    expect(params.get('country')).toBe('IN');
    expect(params.get('search')).toBe('ada');
    expect(params.get('page')).toBe('1');
  });

  it('cancels a superseded request', async () => {
    const first = expectList();
    TestBed.inject(DataRefreshService).bump();
    await fixture.whenStable();

    expect(first.cancelled).toBe(true);
    await respond(expectList());
  });
});
