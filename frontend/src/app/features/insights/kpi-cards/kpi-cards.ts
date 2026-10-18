import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { InsightsSummary } from '../../../core/models';
import { MoneyPipe } from '../../../shared/money';

/** Organisation-wide headline numbers. */
@Component({
  selector: 'app-kpi-cards',
  imports: [DecimalPipe, MatCardModule, MatIconModule, MoneyPipe],
  templateUrl: './kpi-cards.html',
  styleUrl: './kpi-cards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCards {
  readonly summary = input.required<InsightsSummary>();
}
