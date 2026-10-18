import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

@Component({ template: '' })
class Host {
  readonly dialog = inject(MatDialog);
}

describe('ConfirmDialog', () => {
  let loader: HarnessLoader;
  let host: Host;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    const fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  async function openAndClick(data: ConfirmDialogData, label: string): Promise<unknown> {
    const closed = firstValueFrom(host.dialog.open(ConfirmDialog, { data }).afterClosed());

    const dialog = await loader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe(data.title);
    expect(await dialog.getContentText()).toBe(data.message);
    await (await dialog.getHarness(MatButtonHarness.with({ text: label }))).click();
    return closed;
  }

  const data: ConfirmDialogData = {
    title: 'Delete employee?',
    message: 'Ada will be removed.',
    confirmLabel: 'Delete',
  };

  it('closes with true when confirmed', async () => {
    expect(await openAndClick(data, 'Delete')).toBe(true);
  });

  it('closes with false when cancelled', async () => {
    expect(await openAndClick(data, 'Cancel')).toBe(false);
  });

  it('defaults the confirm label', async () => {
    expect(await openAndClick({ title: 'Sure?', message: 'Really?' }, 'Confirm')).toBe(true);
  });
});
