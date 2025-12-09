import { signalStore, withHooks } from '@ngrx/signals';
import { Payroll } from '../models';
import { withCustomEntities } from './entities.feature';

export const PayrollsStore = signalStore(
  withCustomEntities<Payroll>({
    name: 'payrolls',
    // payrolls es una tabla compartida, no tiene versión naz_*
    // La foreign key siempre apunta a companies
    query: '*, company:companies(*)',
  }),
  withHooks({
    onInit: ({ fetchItems }) => fetchItems(),
  })
);
