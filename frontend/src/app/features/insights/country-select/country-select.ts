import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface CountryOption {
  code: string;
  name: string;
}

/** Compact country picker for insight sections; `''` means "all countries" when allowed. */
@Component({
  selector: 'app-country-select',
  imports: [MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      <mat-label>Country</mat-label>
      <mat-select [value]="value()" (selectionChange)="value.set($event.value)">
        @if (allowAll()) {
          <mat-option value="">All countries</mat-option>
        }
        @for (country of countries(); track country.code) {
          <mat-option [value]="country.code">{{ country.name }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `
    mat-form-field {
      width: 220px;
      max-width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountrySelect {
  readonly countries = input.required<readonly CountryOption[]>();
  readonly allowAll = input(false);
  readonly value = model('');
}
