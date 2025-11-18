import { inject } from '@angular/core';
import { signalStore, withProps } from '@ngrx/signals';
import { CreditorsStore } from './creditors.store';

export const PayrollStore = signalStore(
  withProps(() => ({
    creditors: inject(CreditorsStore),
  }))
);
