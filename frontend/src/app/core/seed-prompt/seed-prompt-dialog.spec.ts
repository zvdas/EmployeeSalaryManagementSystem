import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { environment } from '../../../environments/environment';
import { ApiError } from '../models';
import { DataRefreshService } from '../services/data-refresh.service';
import { SeedPromptDialog } from './seed-prompt-dialog';

const seedUrl = `${environment.apiUrl}/seed`;

describe('SeedPromptDialog', () => {
  let fixture: ComponentFixture<SeedPromptDialog>;
  let http: HttpTestingController;
  let loader: HarnessLoader;
  let refresh: DataRefreshService;
  const close = jest.fn();
  const snackBarOpen = jest.fn();

  beforeEach(async () => {
    close.mockReset();
    snackBarOpen.mockReset();
    TestBed.configureTestingModule({
      imports: [SeedPromptDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    refresh = TestBed.inject(DataRefreshService);
    fixture = TestBed.createComponent(SeedPromptDialog);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const button = (text: RegExp) => loader.getHarness(MatButtonHarness.with({ text }));
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('explains the choice', () => {
    expect(text()).toContain('Your database is empty');
  });

  it.each([
    [/Load 100 sample employees/, 100],
    [/Load full 10,000/, 10000],
  ])('%s posts count %p, then notifies, refreshes and closes', async (label, count) => {
    await (await button(label)).click();

    const req = http.expectOne(seedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ count });
    req.flush({ inserted: count }, { status: 201, statusText: 'Created' });

    expect(snackBarOpen).toHaveBeenCalledWith(
      `Loaded ${count.toLocaleString('en-US')} employees`,
      'OK',
      expect.any(Object),
    );
    expect(refresh.version()).toBe(1);
    expect(close).toHaveBeenCalledWith({ inserted: count });
  });

  it('shows a spinner and disables both buttons while seeding', async () => {
    await (await button(/Load full 10,000/)).click();

    expect(await (await button(/Load 100/)).isDisabled()).toBe(true);
    expect(await (await button(/Load full/)).isDisabled()).toBe(true);
    expect(text()).toContain('Loading 10,000 employees');
    http.expectOne(seedUrl).flush({ inserted: 10000 });
  });

  it('stays open with the error message when seeding fails', async () => {
    await (await button(/Load 100/)).click();
    const body: ApiError = { error: { code: 'INTERNAL_ERROR', message: 'Disk full' } };
    http.expectOne(seedUrl).flush(body, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(text()).toContain('Disk full');
    expect(close).not.toHaveBeenCalled();
    expect(refresh.version()).toBe(0);
    expect(await (await button(/Load 100/)).isDisabled()).toBe(false);
  });

  it('closes and refreshes when the database was already seeded (409)', async () => {
    await (await button(/Load 100/)).click();
    const body: ApiError = { error: { code: 'CONFLICT', message: 'Database is not empty' } };
    http.expectOne(seedUrl).flush(body, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(close).toHaveBeenCalled();
    expect(refresh.version()).toBe(1);
  });
});
