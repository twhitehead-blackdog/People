import { signalStore, withHooks } from '@ngrx/signals';
import { Company } from '../models';
import { withCustomEntities } from './entities.feature';

export const CompaniesStore = signalStore(
  withCustomEntities<Company>({ name: 'companies' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
