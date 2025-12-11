import { signalStore, withHooks } from '@ngrx/signals';
import { AdminUser } from '../models';
import { withCustomEntities } from './entities.feature';

export const AdminUsersStore = signalStore(
  withCustomEntities<AdminUser>({
    name: 'admin_users',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

