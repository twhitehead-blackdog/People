import { signalStore } from '@ngrx/signals';
import { Bank } from '../models';
import { withCustomEntities } from './entities.feature';

export const BanksStore = signalStore(
  withCustomEntities<Bank>({ name: 'banks' })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente
);
