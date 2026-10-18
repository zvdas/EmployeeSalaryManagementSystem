import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { META_FIXTURE } from '../../../testing/fixtures';
import { MetaService } from './meta.service';

describe('MetaService', () => {
  let service: MetaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches /meta once and exposes it as signals', () => {
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);

    service.meta$.subscribe();
    service.meta$.subscribe();
    http.expectNone(`${environment.apiUrl}/meta`);

    expect(service.countries()).toHaveLength(2);
    expect(service.departments()).toEqual(['Engineering', 'Sales']);
    expect(service.employmentTypes()).toEqual(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
  });

  it('starts empty before the response arrives', () => {
    expect(service.countries()).toEqual([]);
    expect(service.titlesFor(null)).toEqual([]);
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);
  });

  it('resolves currencies and country names', () => {
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);

    expect(service.currencyFor('IN')).toBe('INR');
    expect(service.currencyFor('XX')).toBeUndefined();
    expect(service.currencyFor(null)).toBeUndefined();
    expect(service.countryName('US')).toBe('United States');
    expect(service.countryName('XX')).toBe('XX');
  });

  it('filters job titles by department', () => {
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);

    expect(service.titlesFor('Engineering')).toEqual(['Software Engineer', 'QA Engineer']);
    expect(service.titlesFor('')).toHaveLength(3);
  });
});
