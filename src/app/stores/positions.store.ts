import { signalStore, withHooks } from '@ngrx/signals';
import { Position } from '../models';
import { withCustomEntities } from './entities.feature';

export const PositionsStore = signalStore(
  withCustomEntities<Position>({
    name: 'positions',
    query:
      'id, name, department_id, company_id, department:departments(*), company:companies(*), admin, schedule_admin, schedule_approver',
    order: 'name',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
