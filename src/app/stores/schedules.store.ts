import { signalStore, withHooks } from '@ngrx/signals';
import { Schedule } from '../models';
import { withCustomEntities } from './entities.feature';

export const SchedulesStore = signalStore(
  withCustomEntities<Schedule>({ name: 'schedules' }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
