import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { INLINE_ERROR_STATUSES } from '../interceptors/error.interceptor';
import { EmployeeInput } from '../models';
import { EmployeeApiService } from './employee-api.service';

const base = `${environment.apiUrl}/employees`;

const input: EmployeeInput = {
  fullName: 'Ada Lovelace',
  email: 'ada@acme.test',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  countryCode: 'GB',
  annualSalary: 90000,
  employmentType: 'FULL_TIME',
  hireDate: '2024-01-15',
};

describe('EmployeeApiService', () => {
  let service: EmployeeApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists employees with every defined query param', () => {
    let total = 0;
    service
      .list({
        search: 'ada',
        country: 'GB',
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        page: 2,
        pageSize: 50,
        sortBy: 'annualSalaryUsd',
        sortDir: 'desc',
      })
      .subscribe((res) => (total = res.total));

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.toString()).toBe(
      'search=ada&country=GB&department=Engineering&jobTitle=Software%20Engineer' +
        '&page=2&pageSize=50&sortBy=annualSalaryUsd&sortDir=desc',
    );
    req.flush({ items: [], total: 7, page: 2, pageSize: 50 });
    expect(total).toBe(7);
  });

  it('omits undefined and blank filters', () => {
    service.list({ search: '   ', country: '', department: undefined, page: 1 }).subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.keys()).toEqual(['page']);
    req.flush({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it('gets one employee', () => {
    service.get(5).subscribe();
    const req = http.expectOne(`${base}/5`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates with POST and updates with PUT', () => {
    service.create(input).subscribe();
    const post = http.expectOne(base);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush({});

    service.update(9, input).subscribe();
    const put = http.expectOne(`${base}/9`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(input);
    put.flush({});
  });

  it('marks form submissions so 400/409 are shown on the form instead of a snackbar', () => {
    service.create(input).subscribe();
    const post = http.expectOne(base);
    expect(post.request.context.get(INLINE_ERROR_STATUSES)).toEqual([400, 409]);
    post.flush({});

    service.update(9, input).subscribe();
    const put = http.expectOne(`${base}/9`);
    expect(put.request.context.get(INLINE_ERROR_STATUSES)).toEqual([400, 409]);
    put.flush({});
  });

  it('deletes with DELETE', () => {
    service.delete(3).subscribe();
    const req = http.expectOne(`${base}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('exports CSV as a blob using only the filters given', () => {
    let blob: Blob | undefined;
    service.exportCsv({ country: 'IN', search: '' }).subscribe((b) => (blob = b));

    const req = http.expectOne((r) => r.url === `${base}/export.csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.toString()).toBe('country=IN');
    req.flush(new Blob(['employeeCode\n'], { type: 'text/csv' }));
    expect(blob).toBeInstanceOf(Blob);
  });
});
