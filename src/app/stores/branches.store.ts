import { signalStore, withHooks } from '@ngrx/signals';
import { Branch } from '../models';
import { withCustomEntities } from './entities.feature';

export const BranchesStore = signalStore(
  withCustomEntities<Branch>({ name: 'branches', order: 'name' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
