import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { startWith } from 'rxjs';

import { ApiError, Employee, EmployeeInput, EmploymentType } from '../../../core/models';
import { EmployeeApiService } from '../../../core/services/employee-api.service';
import { MetaService } from '../../../core/services/meta.service';
import { fromIsoDate, toIsoDate } from '../../../shared/dates';
import {
  FULL_NAME_MAX,
  FULL_NAME_MIN,
  integer,
  notInFuture,
  SALARY_MAX,
  SALARY_MIN,
  trimmedLength,
} from './employee-form.validators';

export interface EmployeeFormDialogData {
  /** Present when editing; absent when creating. */
  employee?: Employee;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
};

interface LengthError {
  requiredLength: number;
}

const ERROR_MESSAGES: Record<string, (error: unknown) => string> = {
  required: () => 'Required',
  minlength: (e) => `At least ${(e as LengthError).requiredLength} characters`,
  maxlength: (e) => `At most ${(e as LengthError).requiredLength} characters`,
  email: () => 'Enter a valid email address',
  conflict: () => 'This email is already used by another employee',
  integer: () => 'Enter a whole number',
  min: () => `Must be at least ${SALARY_MIN}`,
  max: () => `Must be at most ${SALARY_MAX.toLocaleString('en-US')}`,
  futureDate: () => 'Hire date cannot be in the future',
  matDatepickerParse: () => 'Enter a valid date',
  matDatepickerMax: () => 'Hire date cannot be in the future',
};

function requiredText(value: string, ...validators: ValidatorFn[]): FormControl<string> {
  return new FormControl(value, {
    nonNullable: true,
    validators: [Validators.required, ...validators],
  });
}

function buildForm(employee: Employee | undefined) {
  return new FormGroup({
    fullName: requiredText(employee?.fullName ?? '', trimmedLength(FULL_NAME_MIN, FULL_NAME_MAX)),
    email: requiredText(employee?.email ?? '', Validators.email),
    department: requiredText(employee?.department ?? ''),
    jobTitle: requiredText(employee?.jobTitle ?? ''),
    countryCode: requiredText(employee?.countryCode ?? ''),
    annualSalary: new FormControl<number | null>(employee?.annualSalary ?? null, [
      Validators.required,
      integer,
      Validators.min(SALARY_MIN),
      Validators.max(SALARY_MAX),
    ]),
    employmentType: new FormControl<EmploymentType>(employee?.employmentType ?? 'FULL_TIME', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    hireDate: new FormControl<Date | null>(employee ? fromIsoDate(employee.hireDate) : null, [
      Validators.required,
      notInFuture(),
    ]),
  });
}

export type EmployeeForm = ReturnType<typeof buildForm>;

/** Create / edit dialog. Closes with the saved `Employee`, or `undefined` when cancelled. */
@Component({
  selector: 'app-employee-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './employee-form-dialog.html',
  styleUrl: './employee-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormDialog {
  private readonly api = inject(EmployeeApiService);
  private readonly dialogRef = inject<MatDialogRef<EmployeeFormDialog, Employee>>(MatDialogRef);
  private readonly employee = inject<EmployeeFormDialogData>(MAT_DIALOG_DATA).employee;
  protected readonly meta = inject(MetaService);

  readonly form: EmployeeForm = buildForm(this.employee);
  protected readonly isEdit = !!this.employee;
  protected readonly today = new Date();
  protected readonly employmentTypeLabels = EMPLOYMENT_TYPE_LABELS;
  protected readonly submitting = signal(false);

  private readonly department = toSignal(
    this.form.controls.department.valueChanges.pipe(startWith(this.form.controls.department.value)),
    { requireSync: true },
  );
  private readonly countryCode = toSignal(
    this.form.controls.countryCode.valueChanges.pipe(
      startWith(this.form.controls.countryCode.value),
    ),
    { requireSync: true },
  );

  protected readonly titles = computed(() =>
    this.department() ? this.meta.titlesFor(this.department()) : [],
  );
  protected readonly currency = computed(() => this.meta.currencyFor(this.countryCode()) ?? '');

  constructor() {
    // A title from another department is no longer valid once the department changes.
    this.form.controls.department.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((department) => {
        const { jobTitle } = this.form.controls;
        if (jobTitle.value && !this.meta.titlesFor(department).includes(jobTitle.value)) {
          jobTitle.setValue('');
        }
      });
  }

  protected errorFor(control: AbstractControl): string {
    const [key, value] = Object.entries(control.errors ?? {})[0] ?? [];
    if (!key) return '';
    if (key === 'server' && typeof value === 'string') return value;
    return ERROR_MESSAGES[key]?.(value) ?? 'Invalid value';
  }

  protected save(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const input = this.toInput();
    const request = this.employee
      ? this.api.update(this.employee.id, input)
      : this.api.create(input);
    request.subscribe({
      next: (saved) => this.dialogRef.close(saved),
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse) this.applyServerErrors(err);
      },
    });
  }

  private toInput(): EmployeeInput {
    const v = this.form.getRawValue();
    return {
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      department: v.department,
      jobTitle: v.jobTitle,
      countryCode: v.countryCode,
      annualSalary: v.annualSalary ?? 0,
      employmentType: v.employmentType,
      hireDate: v.hireDate ? toIsoDate(v.hireDate) : '',
    };
  }

  /** 409 means the email is taken; 400 details are mapped onto matching controls. */
  private applyServerErrors(err: HttpErrorResponse): void {
    if (err.status === 409) {
      this.form.controls.email.setErrors({ conflict: true });
      this.form.controls.email.markAsTouched();
      return;
    }
    if (err.status !== 400) return;
    const details = (err.error as Partial<ApiError> | null)?.error?.details ?? [];
    for (const { path, message } of details) {
      const control = this.form.get(path);
      control?.setErrors({ server: message });
      control?.markAsTouched();
    }
  }
}
