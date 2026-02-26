import { signalStore } from '@ngrx/signals';
import { Creditor } from '../models';
import { withCustomEntities } from './entities.feature';

export const CreditorsStore = signalStore({ providedIn: 'root' },
  withCustomEntities<Creditor>({ name: 'creditors' })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente
);
