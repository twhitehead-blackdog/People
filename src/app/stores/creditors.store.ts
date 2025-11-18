import { signalStore, withHooks } from '@ngrx/signals';
import { Creditor } from '../models';
import { withCustomEntities } from './entities.feature';

export const CreditorsStore = signalStore(
  withCustomEntities<Creditor>({ name: 'creditors' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
