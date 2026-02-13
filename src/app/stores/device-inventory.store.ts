import { signalStore, withHooks } from '@ngrx/signals';
import { Device, DeviceAssignment } from '../models';
import { withCustomEntities } from './entities.feature';

export const DeviceInventoryStore = signalStore(
  { providedIn: 'root' },
  withCustomEntities<Device>({
    name: 'devices',
    query: '*,branch:branches(id,name),assigned_to:device_assignments(*,employee:employees!device_assignments_employee_id_fkey(id,first_name,father_name))',
    order: 'name',
  }),
  withHooks({
    onInit: ({ fetchItems }) => fetchItems(),
  })
);

export const DeviceAssignmentStore = signalStore(
  { providedIn: 'root' },
  withCustomEntities<DeviceAssignment>({
    name: 'device_assignments',
    query: '*,device:devices(*),employee:employees!device_assignments_employee_id_fkey(id,first_name,father_name),assignedByEmployee:employees!device_assignments_assigned_by_fkey(id,first_name,father_name)',
    order: 'assigned_date.desc',
  }),
  withHooks({
    onInit: ({ fetchItems }) => fetchItems(),
  })
);
