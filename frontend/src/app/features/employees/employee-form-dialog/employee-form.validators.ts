import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { toIsoDate } from '../../../shared/dates';

/** Mirrors the contract's `EmployeeInput` limits. */
export const FULL_NAME_MIN = 2;
export const FULL_NAME_MAX = 100;
export const SALARY_MIN = 1;
export const SALARY_MAX = 100_000_000;

/** Length bounds applied to the trimmed value, as the API trims before validating. */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null => {
    const length = (value ?? '').trim().length;
    if (length === 0) return null; // left to Validators.required
    if (length < min) return { minlength: { requiredLength: min, actualLength: length } };
    if (length > max) return { maxlength: { requiredLength: max, actualLength: length } };
    return null;
  };
}

export const integer: ValidatorFn = ({ value }: AbstractControl<number | null>) =>
  value === null || Number.isInteger(value) ? null : { integer: true };

/** Rejects dates after today, comparing local calendar days. */
export function notInFuture(today: () => Date = () => new Date()): ValidatorFn {
  return ({ value }: AbstractControl<Date | null>): ValidationErrors | null =>
    value && toIsoDate(value) > toIsoDate(today()) ? { futureDate: true } : null;
}
