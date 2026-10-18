import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

import { EmployeeFilters, Meta } from '../../../core/models';
import { MetaService } from '../../../core/services/meta.service';
import { META_FIXTURE } from '../../../../testing/fixtures';
import { EmployeeFilterBar, SEARCH_DEBOUNCE_MS } from './employee-filter-bar';

/** MetaService backed by the fixture, without HTTP. */
function metaStub(meta: Meta): Partial<MetaService> {
  return {
    countries: signal(meta.countries),
    departments: signal(meta.departments),
    titlesFor: (department) =>
      meta.jobTitles.filter((t) => !department || t.department === department).map((t) => t.title),
  };
}

describe('EmployeeFilterBar', () => {
  let fixture: ComponentFixture<EmployeeFilterBar>;
  let loader: HarnessLoader;
  let emitted: EmployeeFilters[];

  async function setup(filters: EmployeeFilters = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [EmployeeFilterBar],
      providers: [{ provide: MetaService, useValue: metaStub(META_FIXTURE) }],
    });
    fixture = TestBed.createComponent(EmployeeFilterBar);
    fixture.componentRef.setInput('filters', filters);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((f) => emitted.push(f));
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  }

  async function select(label: string): Promise<MatSelectHarness> {
    const field = await loader.getHarness(MatFormFieldHarness.with({ floatingLabelText: label }));
    const control = await field.getControl(MatSelectHarness);
    if (!control) throw new Error(`No select labelled ${label}`);
    return control;
  }

  afterEach(() => jest.useRealTimers());

  it('debounces search input and trims it', async () => {
    await setup();
    jest.useFakeTimers();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    input.value = ' ad';
    input.dispatchEvent(new Event('input'));
    jest.advanceTimersByTime(100);
    input.value = ' ada ';
    input.dispatchEvent(new Event('input'));
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(emitted).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(emitted).toEqual([{ search: 'ada' }]);
  });

  it('emits the selected country by code, keeping other filters', async () => {
    await setup({ search: 'ada' });
    const country = await select('Country');
    await country.open();
    await country.clickOptions({ text: 'India' });

    expect(emitted).toEqual([{ search: 'ada', country: 'IN' }]);
  });

  it('offers only the job titles of the selected department', async () => {
    await setup({ department: 'Sales' });
    const title = await select('Job title');
    await title.open();
    const options = await title.getOptions();

    expect(await Promise.all(options.map((o) => o.getText()))).toEqual([
      'All job titles',
      'Account Executive',
    ]);
  });

  it('drops a job title that does not belong to the new department', async () => {
    await setup({ department: 'Engineering', jobTitle: 'QA Engineer' });
    const department = await select('Department');
    await department.open();
    await department.clickOptions({ text: 'Sales' });

    expect(emitted).toEqual([{ department: 'Sales' }]);
  });

  it('removes a filter when "All" is chosen', async () => {
    await setup({ country: 'IN', department: 'Sales' });
    const country = await select('Country');
    await country.open();
    await country.clickOptions({ text: 'All countries' });

    expect(emitted).toEqual([{ department: 'Sales' }]);
  });

  it('clears all filters', async () => {
    await setup({ country: 'IN' });
    const clear = await loader.getHarness(MatButtonHarness.with({ text: /Clear filters/ }));
    await clear.click();

    expect(emitted).toEqual([{}]);
  });

  it('disables "Clear filters" when nothing is filtered', async () => {
    await setup();
    const clear = await loader.getHarness(MatButtonHarness.with({ text: /Clear filters/ }));
    expect(await clear.isDisabled()).toBe(true);
  });
});
