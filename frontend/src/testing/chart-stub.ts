import { Directive, input, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

/** Stands in for ng2-charts' directive: jsdom has no canvas, so nothing is drawn. */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- mirrors ng2-charts' selector
  selector: 'canvas[baseChart]',
})
export class ChartStub {
  readonly type = input<string>();
  readonly data = input<unknown>();
  readonly options = input<unknown>();
}

/** Swaps BaseChartDirective for ChartStub in the given standalone components. */
export function stubCharts(...components: Type<unknown>[]): void {
  for (const component of components) {
    TestBed.overrideComponent(component, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [ChartStub] },
    });
  }
}
