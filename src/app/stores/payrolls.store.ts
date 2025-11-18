import { signalStore, withHooks } from '@ngrx/signals';
import { Payroll } from '../models';
import { withCustomEntities } from './entities.feature';

export const PayrollsStore = signalStore(
  withCustomEntities<Payroll>({
    name: 'payrolls',
    query: '*, company:companies(*)',
  }),
  withHooks({
    onInit: ({ fetchItems }) => fetchItems(),
  })
);
