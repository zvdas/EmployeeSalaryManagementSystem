import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

import { environment } from '../../../../environments/environment';
import { ApiError, Employee } from '../../../core/models';
import { employeeFixture, META_FIXTURE } from '../../../../testing/fixtures';
import { EmployeeFormDialog, EmployeeFormDialogData } from './employee-form-dialog';

const employeesUrl = `${environment.apiUrl}/employees`;

describe('EmployeeFormDialog', () => {
  let fixture: ComponentFixture<EmployeeFormDialog>;
  let http: HttpTestingController;
  let loader: HarnessLoader;
  const close = jest.fn();

  async function setup(data: EmployeeFormDialogData = {}): Promise<void> {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [EmployeeFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmployeeFormDialog);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/meta`).flush(META_FIXTURE);
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  const form = () => fixture.componentInstance.form;

  function fillValid(): void {
    form().setValue({
      fullName: '  Grace Hopper ',
      email: 'grace@acme.test',
      department: 'Engineering',
      jobTitle: 'QA Engineer',
      countryCode: 'IN',
      annualSalary: 2500000,
      employmentType: 'CONTRACT',
      hireDate: new Date(2024, 0, 15),
    });
  }

  async function submit(): Promise<void> {
    await (await loader.getHarness(MatButtonHarness.with({ selector: '[type=submit]' }))).click();
  }

  async function errorText(label: string): Promise<string[]> {
    const field = await loader.getHarness(MatFormFieldHarness.with({ floatingLabelText: label }));
    return field.getTextErrors();
  }

  describe('validation', () => {
    beforeEach(() => setup());

    it('requires every field', async () => {
      await submit();
      http.expectNone(employeesUrl);
      expect(form().invalid).toBe(true);
      expect(await errorText('Full name')).toEqual(['Required']);
      expect(await errorText('Hire date')).toEqual(['Required']);
    });

    it('rejects an invalid email', async () => {
      form().controls.email.setValue('not-an-email');
      form().controls.email.markAsTouched();
      expect(form().controls.email.hasError('email')).toBe(true);
      expect(await errorText('Email')).toEqual(['Enter a valid email address']);
    });

    it('checks the trimmed name length', () => {
      form().controls.fullName.setValue(' A ');
      expect(form().controls.fullName.hasError('minlength')).toBe(true);
      form().controls.fullName.setValue('x'.repeat(101));
      expect(form().controls.fullName.hasError('maxlength')).toBe(true);
    });

    it.each([
      [1.5, 'integer'],
      [0, 'min'],
      [-10, 'min'],
      [100_000_001, 'max'],
    ])('rejects a salary of %p (%s)', (salary, error) => {
      form().controls.annualSalary.setValue(salary);
      expect(form().controls.annualSalary.hasError(error)).toBe(true);
    });

    it('accepts a whole salary within range', () => {
      form().controls.annualSalary.setValue(100_000_000);
      expect(form().controls.annualSalary.valid).toBe(true);
    });

    it('rejects a hire date in the future but accepts today', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      form().controls.hireDate.setValue(tomorrow);
      expect(form().controls.hireDate.hasError('futureDate')).toBe(true);

      form().controls.hireDate.setValue(new Date());
      expect(form().controls.hireDate.hasError('futureDate')).toBe(false);
    });
  });

  describe('department and country', () => {
    beforeEach(() => setup());

    async function jobTitleOptions(): Promise<string[]> {
      const field = await loader.getHarness(
        MatFormFieldHarness.with({ floatingLabelText: 'Job title' }),
      );
      const select = (await field.getControl(MatSelectHarness)) as MatSelectHarness;
      await select.open();
      const options = await Promise.all((await select.getOptions()).map((o) => o.getText()));
      await select.close();
      return options;
    }

    it('offers only the titles of the chosen department', async () => {
      expect(await jobTitleOptions()).toEqual([]);
      form().controls.department.setValue('Engineering');
      expect(await jobTitleOptions()).toEqual(['Software Engineer', 'QA Engineer']);
    });

    it('resets a title that does not belong to the new department', () => {
      form().controls.department.setValue('Engineering');
      form().controls.jobTitle.setValue('QA Engineer');

      form().controls.department.setValue('Engineering');
      expect(form().controls.jobTitle.value).toBe('QA Engineer');

      form().controls.department.setValue('Sales');
      expect(form().controls.jobTitle.value).toBe('');
    });

    it('shows the country currency as the salary suffix', async () => {
      form().controls.countryCode.setValue('IN');
      await fixture.whenStable();
      const field = await loader.getHarness(
        MatFormFieldHarness.with({ floatingLabelText: 'Annual salary' }),
      );
      expect(await field.getSuffixText()).toBe('INR');
    });
  });

  describe('saving', () => {
    it('creates a new employee with a trimmed, local-date payload', async () => {
      await setup();
      fillValid();
      await submit();

      const req = http.expectOne(employeesUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        fullName: 'Grace Hopper',
        email: 'grace@acme.test',
        department: 'Engineering',
        jobTitle: 'QA Engineer',
        countryCode: 'IN',
        annualSalary: 2500000,
        employmentType: 'CONTRACT',
        hireDate: '2024-01-15',
      });
      const saved: Employee = employeeFixture({ id: 42 });
      req.flush(saved, { status: 201, statusText: 'Created' });
      expect(close).toHaveBeenCalledWith(saved);
    });

    it('updates an existing employee, prefilled from the dialog data', async () => {
      const employee = employeeFixture({ id: 7 });
      await setup({ employee });
      expect(form().controls.hireDate.value).toEqual(new Date(2022, 2, 1));

      await submit();
      const req = http.expectOne(`${employeesUrl}/7`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toMatchObject({ email: employee.email, hireDate: '2022-03-01' });
      req.flush(employee);
      expect(close).toHaveBeenCalledWith(employee);
    });

    it('disables saving while the request is in flight', async () => {
      await setup();
      fillValid();
      await submit();
      const button = await loader.getHarness(MatButtonHarness.with({ selector: '[type=submit]' }));
      expect(await button.isDisabled()).toBe(true);
      http.expectOne(employeesUrl).flush(employeeFixture());
    });

    it('maps a 409 conflict to the email field and keeps the dialog open', async () => {
      await setup();
      fillValid();
      await submit();

      const body: ApiError = { error: { code: 'CONFLICT', message: 'Email already exists' } };
      http.expectOne(employeesUrl).flush(body, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();

      expect(form().controls.email.hasError('conflict')).toBe(true);
      expect(await errorText('Email')).toEqual(['This email is already used by another employee']);
      expect(close).not.toHaveBeenCalled();
      const button = await loader.getHarness(MatButtonHarness.with({ selector: '[type=submit]' }));
      expect(await button.isDisabled()).toBe(false);
    });

    it('maps 400 validation details onto matching controls', async () => {
      await setup();
      fillValid();
      await submit();

      const body: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            { path: 'jobTitle', message: 'Job title does not belong to department' },
            { path: 'unknownField', message: 'ignored' },
          ],
        },
      };
      http.expectOne(employeesUrl).flush(body, { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      expect(await errorText('Job title')).toEqual(['Job title does not belong to department']);
      expect(close).not.toHaveBeenCalled();
    });
  });
});
