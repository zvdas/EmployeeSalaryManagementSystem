import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { SeedApiService } from './seed-api.service';

describe('SeedApiService', () => {
  let service: SeedApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeedApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the seed status', () => {
    let isEmpty: boolean | undefined;
    service.status().subscribe((s) => (isEmpty = s.isEmpty));

    const req = http.expectOne(`${environment.apiUrl}/seed/status`);
    expect(req.request.method).toBe('GET');
    req.flush({ employeeCount: 0, isEmpty: true });
    expect(isEmpty).toBe(true);
  });

  it('posts the requested count', () => {
    let inserted = 0;
    service.seed(10000).subscribe((r) => (inserted = r.inserted));

    const req = http.expectOne(`${environment.apiUrl}/seed`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ count: 10000 });
    req.flush({ inserted: 10000 }, { status: 201, statusText: 'Created' });
    expect(inserted).toBe(10000);
  });
});
