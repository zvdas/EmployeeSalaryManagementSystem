import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  {
    path: 'employees',
    title: 'Employees | ACME Salary Management',
    loadComponent: () =>
      import('./features/employees/employee-list/employee-list').then((m) => m.EmployeeList),
  },
  {
    path: 'insights',
    title: 'Insights | ACME Salary Management',
    loadComponent: () =>
      import('./features/insights/insights-page/insights-page').then((m) => m.InsightsPage),
  },
  { path: '**', redirectTo: 'employees' },
];
