import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SeedCount, SeedRequest, SeedResult, SeedStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class SeedApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/seed`;

  status(): Observable<SeedStatus> {
    return this.http.get<SeedStatus>(`${this.baseUrl}/status`);
  }

  seed(count: SeedCount): Observable<SeedResult> {
    const body: SeedRequest = { count };
    return this.http.post<SeedResult>(this.baseUrl, body);
  }
}
