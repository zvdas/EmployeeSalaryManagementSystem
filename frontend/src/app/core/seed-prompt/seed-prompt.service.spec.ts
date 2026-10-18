import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { environment } from '../../../environments/environment';
import { SeedPromptDialog } from './seed-prompt-dialog';
import { SeedPromptService } from './seed-prompt.service';

describe('SeedPromptService', () => {
  let http: HttpTestingController;
  const open = jest.fn();

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SeedPromptService).promptIfEmpty();
  });

  afterEach(() => http.verify());

  const statusUrl = `${environment.apiUrl}/seed/status`;

  it('opens a non-dismissible dialog when the database is empty', () => {
    http.expectOne(statusUrl).flush({ employeeCount: 0, isEmpty: true });
    expect(open).toHaveBeenCalledWith(
      SeedPromptDialog,
      expect.objectContaining({ disableClose: true }),
    );
  });

  it('does nothing when employees exist', () => {
    http.expectOne(statusUrl).flush({ employeeCount: 100, isEmpty: false });
    expect(open).not.toHaveBeenCalled();
  });

  it('does nothing when the status check fails', () => {
    http.expectOne(statusUrl).flush(null, { status: 500, statusText: 'Server Error' });
    expect(open).not.toHaveBeenCalled();
  });
});
