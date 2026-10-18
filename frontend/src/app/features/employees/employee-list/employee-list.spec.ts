import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatSortHarness } from '@angular/material/sort/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Employee } from '../../../core/models';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { employeeFixture, META_FIXTURE } from '../../../../testing/fixtures';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { EmployeeFilterBar } from '../employee-filter-bar/employee-filter-bar';
import { EmployeeFormDialog } from '../employee-form-dialog/employee-form-dialog';
import { EmployeeList } from './employee-list';

const listUrl = `${environment.apiUrl}/employees`;

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let http: HttpTestingController;
  let loader: HarnessLoader;
  const dialogOpen = jest.fn();
  const snackBarOpen = jest.fn();

  /** The next dialog opened closes with `result`. */
  function nextDialogResult(result: unknown): void {
    dialogOpen.mockReturnValueOnce({ afterClosed: () => of(result) });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: dialogOpen } },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    dialogOpen.mockReset();
    snackBarOpen.mockReset();
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

  describe('actions', () => {
    const ada = employeeFixture({ id: 5 });

    beforeEach(async () => {
      await respond(expectList(), [ada]);
    });

    async function clickButton(text: string | RegExp): Promise<void> {
      await (await loader.getHarness(MatButtonHarness.with({ text }))).click();
    }

    async function clickIcon(ariaLabel: string): Promise<void> {
      const selector = `[aria-label="${ariaLabel}"]`;
      await (await loader.getHarness(MatButtonHarness.with({ selector }))).click();
    }

    it('opens the create dialog and reloads after a save', async () => {
      nextDialogResult(employeeFixture({ id: 99 }));
      await clickButton(/Add employee/);

      expect(dialogOpen).toHaveBeenCalledWith(
        EmployeeFormDialog,
        expect.objectContaining({ data: { employee: undefined } }),
      );
      expect(snackBarOpen).toHaveBeenCalledWith('Employee added', 'Dismiss', expect.any(Object));
      await respond(expectList(), [ada]);
    });

    it('opens the edit dialog with the row and does nothing when cancelled', async () => {
      nextDialogResult(undefined);
      await clickIcon('Edit Ada Lovelace');

      expect(dialogOpen).toHaveBeenCalledWith(
        EmployeeFormDialog,
        expect.objectContaining({ data: { employee: ada } }),
      );
      expect(snackBarOpen).not.toHaveBeenCalled();
      http.expectNone((r) => r.url === listUrl);
    });

    it('deletes after confirmation, then notifies and reloads', async () => {
      nextDialogResult(true);
      await clickIcon('Delete Ada Lovelace');

      expect(dialogOpen).toHaveBeenCalledWith(
        ConfirmDialog,
        expect.objectContaining({ data: expect.objectContaining({ confirmLabel: 'Delete' }) }),
      );
      const req = http.expectOne(`${listUrl}/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      expect(snackBarOpen).toHaveBeenCalledWith('Employee deleted', 'Dismiss', expect.any(Object));
      await respond(expectList());
    });

    it('does not delete when the confirmation is cancelled', async () => {
      nextDialogResult(false);
      await clickIcon('Delete Ada Lovelace');
      http.expectNone(`${listUrl}/5`);
    });

    it('exports the filtered list as employees.csv', async () => {
      const createObjectURL = jest.fn(() => 'blob:csv');
      const revokeObjectURL = jest.fn();
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
        /* no navigation in jsdom */
      });

      const bar = fixture.debugElement.query(By.directive(EmployeeFilterBar))
        .componentInstance as EmployeeFilterBar;
      bar.filtersChange.emit({ department: 'Sales' });
      await fixture.whenStable();
      await respond(expectList());

      await clickButton(/Export CSV/);
      const req = http.expectOne((r) => r.url === `${listUrl}/export.csv`);
      expect(req.request.params.toString()).toBe('department=Sales');
      const blob = new Blob(['employeeCode\n'], { type: 'text/csv' });
      req.flush(blob);
      await new Promise((resolve) => setTimeout(resolve));

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      const anchor = click.mock.contexts[0] as HTMLAnchorElement;
      expect(anchor.download).toBe('employees.csv');
      expect(anchor.href).toBe('blob:csv');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
      click.mockRestore();
    });
  });
});
