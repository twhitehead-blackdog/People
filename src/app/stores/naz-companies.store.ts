import { signalStore, withHooks } from '@ngrx/signals';
import { NazCompany } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazCompaniesStore = signalStore(
  withCustomEntities<NazCompany>({ name: 'naz_companies' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

