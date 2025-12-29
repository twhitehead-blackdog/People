import { signalStore } from '@ngrx/signals';
import { NazBranch } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazBranchesStore = signalStore(
  withCustomEntities<NazBranch>({ name: 'naz_branches', order: 'name' })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente (solo si la organización es Naz)
);

