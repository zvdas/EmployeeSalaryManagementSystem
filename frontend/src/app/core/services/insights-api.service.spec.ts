import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { InsightsApiService } from './insights-api.service';

const base = `${environment.apiUrl}/insights`;

describe('InsightsApiService', () => {
  let service: InsightsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InsightsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectGet(path: string, params: string): void {
    const req = http.expectOne((r) => r.url === `${base}/${path}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.toString()).toBe(params);
    req.flush([]);
  }

  it('gets the summary and by-country stats without params', () => {
    service.summary().subscribe();
    expectGet('summary', '');
    service.byCountry().subscribe();
    expectGet('by-country', '');
  });

  it('gets job-title stats for a country', () => {
    service.byJobTitle('IN').subscribe();
    expectGet('by-job-title', 'country=IN');
  });

  it('gets department stats with an optional country', () => {
    service.byDepartment().subscribe();
    expectGet('by-department', '');
    service.byDepartment('DE').subscribe();
    expectGet('by-department', 'country=DE');
  });

  it('gets the distribution with optional country and bucket count', () => {
    service.distribution().subscribe();
    expectGet('distribution', '');
    service.distribution('US', 20).subscribe();
    expectGet('distribution', 'country=US&buckets=20');
  });
});
