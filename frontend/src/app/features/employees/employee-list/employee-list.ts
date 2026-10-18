import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder; the employee directory is implemented in Phase 2. */
@Component({
  selector: 'app-employee-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Employees</h1>
    <p>Coming soon.</p>
  `,
})
export class EmployeeList {}
