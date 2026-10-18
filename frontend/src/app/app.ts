import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { environment } from '../environments/environment';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

/** Viewports narrower than this use an overlay ("over") side nav. */
const WIDE_SCREEN_QUERY = '(min-width: 960px)';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'ACME Salary Management';
  protected readonly apiDocsUrl = `${environment.apiUrl}/docs`;
  protected readonly navLinks: readonly NavLink[] = [
    { path: '/employees', label: 'Employees', icon: 'people' },
    { path: '/insights', label: 'Insights', icon: 'insights' },
  ];

  private readonly isWide = toSignal(
    inject(BreakpointObserver)
      .observe(WIDE_SCREEN_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: true },
  );

  protected readonly sidenavMode = computed(() => (this.isWide() ? 'side' : 'over'));
  protected readonly sidenavOpened = computed(() => this.isWide());
}
