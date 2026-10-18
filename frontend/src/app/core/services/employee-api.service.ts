import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Employee, EmployeeFilters, EmployeeInput, EmployeeQuery, Paginated } from '../models';
import { inlineErrors } from '../interceptors/error.interceptor';
import { toHttpParams } from './http-params';

const FORM_ERRORS = inlineErrors(400, 409);

@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/employees`;

  list(query: EmployeeQuery = {}): Observable<Paginated<Employee>> {
    return this.http.get<Paginated<Employee>>(this.baseUrl, { params: toHttpParams(query) });
  }

  get(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  /** Validation (400) and duplicate-email (409) errors are shown on the form, not in a snackbar. */
  create(input: EmployeeInput): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, input, { context: FORM_ERRORS });
  }

  update(id: number, input: EmployeeInput): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, input, { context: FORM_ERRORS });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Downloads the filtered list (no paging) as CSV. */
  exportCsv(filters: EmployeeFilters = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.csv`, {
      params: toHttpParams(filters),
      responseType: 'blob',
    });
  }
}
