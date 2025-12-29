import { signalStore } from '@ngrx/signals';
import { NazCompany } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazCompaniesStore = signalStore(
  withCustomEntities<NazCompany>({ name: 'naz_companies' })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente (solo si la organización es Naz)
);

