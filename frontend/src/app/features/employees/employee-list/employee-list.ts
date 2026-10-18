import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { catchError, EMPTY, finalize, switchMap } from 'rxjs';

import { EmployeeFilters, EmployeeQuery, EmployeeSortBy, SortDir } from '../../../core/models';
import { DataRefreshService } from '../../../core/services/data-refresh.service';
import { EmployeeApiService } from '../../../core/services/employee-api.service';
import { MetaService } from '../../../core/services/meta.service';
import { MoneyPipe } from '../../../shared/money';
import { EmployeeFilterBar } from '../employee-filter-bar/employee-filter-bar';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT: { sortBy: EmployeeSortBy; sortDir: SortDir } = {
  sortBy: 'fullName',
  sortDir: 'asc',
};

/** Server-side paginated, sortable and filterable employee directory. */
@Component({
  selector: 'app-employee-list',
  imports: [
    DatePipe,
    MatCardModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
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

  protected readonly loading = signal(false);

  /** Re-runs on every query or refresh change; switchMap cancels the superseded request. */
  private readonly result = toSignal(
    toObservable(computed(() => ({ query: this.query(), version: this.refresh.version() }))).pipe(
      switchMap(({ query }) => {
        this.loading.set(true);
        return this.api.list(query).pipe(
          catchError(() => EMPTY),
          finalize(() => this.loading.set(false)),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly rows = computed(() => this.result()?.items ?? []);
  protected readonly total = computed(() => this.result()?.total ?? 0);

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
}
