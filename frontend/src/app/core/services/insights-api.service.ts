import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CountryStats,
  DepartmentStats,
  Distribution,
  InsightsSummary,
  JobTitleStats,
} from '../models';
import { toHttpParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class InsightsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/insights`;

  summary(): Observable<InsightsSummary> {
    return this.http.get<InsightsSummary>(`${this.baseUrl}/summary`);
  }

  byCountry(): Observable<CountryStats[]> {
    return this.http.get<CountryStats[]>(`${this.baseUrl}/by-country`);
  }

  byJobTitle(country: string): Observable<JobTitleStats[]> {
    return this.http.get<JobTitleStats[]>(`${this.baseUrl}/by-job-title`, {
      params: toHttpParams({ country }),
    });
  }

  /** Omit `country` for the whole organisation. */
  byDepartment(country?: string): Observable<DepartmentStats[]> {
    return this.http.get<DepartmentStats[]>(`${this.baseUrl}/by-department`, {
      params: toHttpParams({ country }),
    });
  }

  /** Omit `country` for the whole organisation; `buckets` defaults to 10 on the server. */
  distribution(country?: string, buckets?: number): Observable<Distribution> {
    return this.http.get<Distribution>(`${this.baseUrl}/distribution`, {
      params: toHttpParams({ country, buckets }),
    });
  }
}
