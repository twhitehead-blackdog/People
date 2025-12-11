import { signalStore, withHooks } from '@ngrx/signals';
import { AuditLog } from '../models';
import { withCustomEntities } from './entities.feature';

export const AuditLogsStore = signalStore(
  withCustomEntities<AuditLog>({
    name: 'audit_logs',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

