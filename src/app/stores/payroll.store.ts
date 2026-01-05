import { inject } from '@angular/core';
import { signalStore, withProps } from '@ngrx/signals';
import { CreditorsStore } from './creditors.store';

export const PayrollStore = signalStore({ providedIn: 'root' },
  withProps(() => ({
    creditors: inject(CreditorsStore),
  }))
);
