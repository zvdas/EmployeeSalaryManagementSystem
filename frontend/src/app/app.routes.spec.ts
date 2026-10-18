import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';

describe('app routes', () => {
  it('defines the expected paths', () => {
    expect(routes.map((r) => r.path)).toEqual(['', 'employees', 'insights', '**']);
  });

  it('redirects the empty path to employees with a full match', () => {
    const root = routes.find((r) => r.path === '');
    expect(root).toMatchObject({ redirectTo: 'employees', pathMatch: 'full' });
  });

  it('redirects unknown paths to employees', () => {
    expect(routes.find((r) => r.path === '**')).toMatchObject({ redirectTo: 'employees' });
  });

  it('lazy-loads the feature pages', () => {
    for (const path of ['employees', 'insights']) {
      expect(routes.find((r) => r.path === path)?.loadComponent).toEqual(expect.any(Function));
    }
  });

  describe('navigation', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
      });
    });

    it.each([
      ['/', '/employees', 'Employees'],
      ['/insights', '/insights', 'Insights'],
      ['/does-not-exist', '/employees', 'Employees'],
    ])('navigating to %s lands on %s', async (start, expectedUrl, heading) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(start);

      expect(TestBed.inject(Router).url).toBe(expectedUrl);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
    });
  });
});
