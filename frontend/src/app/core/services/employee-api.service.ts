import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Employee, EmployeeFilters, EmployeeInput, EmployeeQuery, Paginated } from '../models';
import { toHttpParams } from './http-params';

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

  create(input: EmployeeInput): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, input);
  }

  update(id: number, input: EmployeeInput): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, input);
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
