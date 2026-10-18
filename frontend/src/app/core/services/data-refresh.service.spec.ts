import { TestBed } from '@angular/core/testing';

import { DataRefreshService } from './data-refresh.service';

describe('DataRefreshService', () => {
  it('increments the version on bump', () => {
    const service = TestBed.inject(DataRefreshService);
    expect(service.version()).toBe(0);
    service.bump();
    service.bump();
    expect(service.version()).toBe(2);
  });
});
