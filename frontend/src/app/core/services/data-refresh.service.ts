import { Injectable, signal } from '@angular/core';

/**
 * A version counter that data-backed pages read inside their reactive queries.
 * Bumping it (after seeding or a CRUD change) makes every watcher reload.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private readonly counter = signal(0);
  readonly version = this.counter.asReadonly();

  bump(): void {
    this.counter.update((v) => v + 1);
  }
}
