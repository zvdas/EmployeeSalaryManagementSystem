import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, EMPTY, filter } from 'rxjs';

import { SeedApiService } from '../services/seed-api.service';
import { SeedPromptDialog } from './seed-prompt-dialog';

/** On start-up, offers to load sample data when the database has no employees. */
@Injectable({ providedIn: 'root' })
export class SeedPromptService {
  private readonly seedApi = inject(SeedApiService);
  private readonly dialog = inject(MatDialog);

  promptIfEmpty(): void {
    this.seedApi
      .status()
      .pipe(
        filter((status) => status.isEmpty),
        catchError(() => EMPTY),
      )
      .subscribe(() =>
        this.dialog.open(SeedPromptDialog, {
          disableClose: true,
          width: '560px',
          maxWidth: 'calc(100vw - 32px)',
        }),
      );
  }
}
