import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, EMPTY, filter, finalize, switchMap } from 'rxjs';

import {
  Employee,
  EmployeeFilters,
  EmployeeQuery,
  EmployeeSortBy,
  SortDir,
} from '../../../core/models';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { EmployeeApiService } from '../../../core/services/employee-api.service';
import { refreshableLoad } from '../../../core/services/refreshable-load';
import { MetaService } from '../../../core/services/meta.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';
import { downloadBlob } from '../../../shared/download';
import { MoneyPipe } from '../../../shared/money';
import { EmployeeFilterBar } from '../employee-filter-bar/employee-filter-bar';
import {
  EmployeeFormDialog,
  EmployeeFormDialogData,
} from '../employee-form-dialog/employee-form-dialog';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
export const EXPORT_FILENAME = 'employees.csv';
const DEFAULT_SORT: { sortBy: EmployeeSortBy; sortDir: SortDir } = {
  sortBy: 'fullName',
  sortDir: 'asc',
};

/** Server-side paginated, sortable and filterable employee directory with CRUD and export. */
@Component({
  selector: 'app-employee-list',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    MoneyPipe,
    EmployeeFilterBar,
  ],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList {
  private readonly api = inject(EmployeeApiService);
  private readonly refresh = inject(DataRefreshService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  protected readonly meta = inject(MetaService);

  /** Column ids double as the API's `sortBy` values for sortable columns. */
  protected readonly columns = [
    'employeeCode',
    'fullName',
    'jobTitle',
    'department',
    'countryCode',
    'annualSalaryUsd',
    'hireDate',
    'actions',
  ] as const;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly defaultSort = DEFAULT_SORT;

  protected readonly filters = signal<EmployeeFilters>({});
  private readonly sort = signal(DEFAULT_SORT);
  /** 1-based, as the API expects. */
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  private readonly query = computed<EmployeeQuery>(() => ({
    ...this.filters(),
    ...this.sort(),
    page: this.page(),
    pageSize: this.pageSize(),
  }));

  protected readonly exporting = signal(false);

  /** Reloads on every query change and data refresh, cancelling superseded requests. */
  private readonly result = refreshableLoad(this.query, (query) => this.api.list(query));
  protected readonly loading = this.result.loading;
  protected readonly rows = computed(() => this.result.value()?.items ?? []);
  protected readonly total = computed(() => this.result.value()?.total ?? 0);

  protected onFiltersChange(filters: EmployeeFilters): void {
    this.filters.set(filters);
    this.page.set(1);
  }

  protected onSortChange({ active, direction }: Sort): void {
    this.sort.set(
      direction ? { sortBy: active as EmployeeSortBy, sortDir: direction } : DEFAULT_SORT,
    );
    this.page.set(1);
  }

  protected onPage({ pageIndex, pageSize }: PageEvent): void {
    this.page.set(pageIndex + 1);
    this.pageSize.set(pageSize);
  }

  /** Opens the create dialog, or the edit dialog when an employee is given. */
  protected openForm(employee?: Employee): void {
    this.dialog
      .open<EmployeeFormDialog, EmployeeFormDialogData, Employee>(EmployeeFormDialog, {
        data: { employee },
        width: '640px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(filter((saved) => !!saved))
      .subscribe(() => {
        this.snackBar.open(employee ? 'Employee updated' : 'Employee added', 'Dismiss', {
          duration: 3000,
        });
        this.refresh.bump();
      });
  }

  protected confirmDelete(employee: Employee): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete employee?',
          message: `${employee.fullName} (${employee.employeeCode}) will be permanently removed.`,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.api.delete(employee.id).pipe(catchError(() => EMPTY))),
      )
      .subscribe(() => {
        this.snackBar.open('Employee deleted', 'Dismiss', { duration: 3000 });
        // Deleting the only row of the last page would otherwise leave an empty page.
        if (this.rows().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.refresh.bump();
      });
  }

  protected exportCsv(): void {
    this.exporting.set(true);
    this.api
      .exportCsv(this.filters())
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.exporting.set(false)),
      )
      .subscribe((blob) => downloadBlob(blob, EXPORT_FILENAME, this.document));
  }
}
