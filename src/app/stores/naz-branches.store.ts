import { signalStore, withHooks } from '@ngrx/signals';
import { NazBranch } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazBranchesStore = signalStore(
  withCustomEntities<NazBranch>({ name: 'naz_branches', order: 'name' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

