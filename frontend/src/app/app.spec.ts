import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { App } from './app';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the toolbar title', async () => {
    const el = await render();
    expect(el.querySelector('mat-toolbar')?.textContent).toContain('ACME Salary Management');
  });

  it('renders Employees and Insights nav links', async () => {
    const el = await render();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('mat-nav-list a'));
    const byLabel = (label: string) => links.find((a) => a.textContent?.includes(label));

    expect(byLabel('Employees')?.getAttribute('href')).toBe('/employees');
    expect(byLabel('Insights')?.getAttribute('href')).toBe('/insights');
  });

  it('renders an API Docs link that opens in a new tab', async () => {
    const el = await render();
    const docs = Array.from(el.querySelectorAll<HTMLAnchorElement>('mat-nav-list a')).find((a) =>
      a.textContent?.includes('API Docs'),
    );

    expect(docs?.getAttribute('href')).toBe(`${environment.apiUrl}/docs`);
    expect(docs?.getAttribute('target')).toBe('_blank');
  });

  it('hosts a router outlet', async () => {
    const el = await render();
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
