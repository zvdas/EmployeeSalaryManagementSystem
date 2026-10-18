import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { errorMessageFromBody, FALLBACK_ERROR_MESSAGE } from '../interceptors/error.interceptor';
import { SeedCount, SeedResult } from '../models';
import { DataRefreshService } from '../services/data-refresh.service';
import { SeedApiService } from '../services/seed-api.service';

/** Asks which sample dataset to load into an empty database. Not dismissible while open. */
@Component({
  selector: 'app-seed-prompt-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './seed-prompt-dialog.html',
  styleUrl: './seed-prompt-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeedPromptDialog {
  private readonly seedApi = inject(SeedApiService);
  private readonly refresh = inject(DataRefreshService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject<MatDialogRef<SeedPromptDialog, SeedResult>>(MatDialogRef);

  /** The count being loaded, or null when idle. */
  protected readonly seeding = signal<SeedCount | null>(null);
  protected readonly error = signal<string | null>(null);

  protected load(count: SeedCount): void {
    this.seeding.set(count);
    this.error.set(null);
    this.seedApi.seed(count).subscribe({
      next: (result) => {
        this.snackBar.open(`Loaded ${result.inserted.toLocaleString('en-US')} employees`, 'OK', {
          duration: 4000,
        });
        this.refresh.bump();
        this.dialogRef.close(result);
      },
      error: (err: unknown) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    // 409: the database was filled meanwhile (e.g. from another tab), so there is nothing to ask.
    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.refresh.bump();
      this.dialogRef.close();
      return;
    }
    this.error.set(
      err instanceof HttpErrorResponse
        ? errorMessageFromBody(err.status, err.error)
        : FALLBACK_ERROR_MESSAGE,
    );
    this.seeding.set(null);
  }
}
