import { signalStore, withHooks } from '@ngrx/signals';
import { NazSchedule } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazSchedulesStore = signalStore(
  withCustomEntities<NazSchedule>({ name: 'naz_schedules', order: 'name' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

