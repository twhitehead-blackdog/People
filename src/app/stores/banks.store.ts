import { signalStore, withHooks } from '@ngrx/signals';
import { Bank } from '../models';
import { withCustomEntities } from './entities.feature';

export const BanksStore = signalStore(
  withCustomEntities<Bank>({ name: 'banks' }),
  withHooks({
    onInit({ fetchItems }) {
      fetchItems();
    },
  })
);
