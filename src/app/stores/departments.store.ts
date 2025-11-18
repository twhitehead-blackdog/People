import { signalStore, withHooks } from '@ngrx/signals';
import { Department } from '../models';
import { withCustomEntities } from './entities.feature';

export const DepartmentsStore = signalStore(
  withCustomEntities<Department>({ name: 'departments' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
