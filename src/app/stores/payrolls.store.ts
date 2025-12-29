import { signalStore } from '@ngrx/signals';
import { Payroll } from '../models';
import { withCustomEntities } from './entities.feature';

export const PayrollsStore = signalStore(
  withCustomEntities<Payroll>({
    name: 'payrolls',
    // payrolls ahora tiene versión naz_* (naz_payrolls)
    // La foreign key apunta a companies o naz_companies según la organización
    query: '*, company:companies(*)',
  })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente
);
