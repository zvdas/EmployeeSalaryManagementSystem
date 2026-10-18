import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, map } from 'rxjs';

import { EmployeeFilters } from '../../../core/models';
import { MetaService } from '../../../core/services/meta.service';

export const SEARCH_DEBOUNCE_MS = 300;

/** Removes blank values so `{}` means "no filters". */
function compact(filters: EmployeeFilters): EmployeeFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => typeof v === 'string' && v !== ''),
  );
}

/** Search box plus country / department / job title selects for the employee directory. */
@Component({
  selector: 'app-employee-filter-bar',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './employee-filter-bar.html',
  styleUrl: './employee-filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFilterBar {
  readonly filters = input.required<EmployeeFilters>();
  readonly filtersChange = output<EmployeeFilters>();

  protected readonly meta = inject(MetaService);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly titles = computed(() => this.meta.titlesFor(this.filters().department));
  protected readonly hasFilters = computed(() => Object.keys(compact(this.filters())).length > 0);

  constructor() {
    this.search.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((v) => v.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        if (search !== (this.filters().search ?? '')) this.patch({ search });
      });
  }

  protected setCountry(country: string): void {
    this.patch({ country });
  }

  /** A selected job title is kept only if it belongs to the new department. */
  protected setDepartment(department: string): void {
    const { jobTitle } = this.filters();
    const keepTitle = !!jobTitle && this.meta.titlesFor(department).includes(jobTitle);
    this.patch({ department, jobTitle: keepTitle ? jobTitle : '' });
  }

  protected setJobTitle(jobTitle: string): void {
    this.patch({ jobTitle });
  }

  protected clear(): void {
    this.search.setValue('', { emitEvent: false });
    this.filtersChange.emit({});
  }

  private patch(change: EmployeeFilters): void {
    this.filtersChange.emit(compact({ ...this.filters(), ...change }));
  }
}
