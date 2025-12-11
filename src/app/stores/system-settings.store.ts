import { signalStore, withHooks } from '@ngrx/signals';
import { SystemSetting } from '../models';
import { withCustomEntities } from './entities.feature';

export const SystemSettingsStore = signalStore(
  withCustomEntities<SystemSetting>({
    name: 'system_settings',
    order: 'category,key',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

