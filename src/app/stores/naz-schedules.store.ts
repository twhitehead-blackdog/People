import { signalStore } from '@ngrx/signals';
import { NazSchedule } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazSchedulesStore = signalStore(
  withCustomEntities<NazSchedule>({ name: 'naz_schedules', order: 'name' })
  // Carga lazy: los componentes deben llamar fetchItems() manualmente (solo si la organización es Naz)
);

