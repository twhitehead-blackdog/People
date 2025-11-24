import { signalStore } from '@ngrx/signals';
import { Position } from '../models';
import { withCustomEntities } from './entities.feature';

export const PositionsStore = signalStore(
  withCustomEntities<Position>({
    name: 'positions',
    query:
      'id, name, department_id, department:departments(id, name), admin, schedule_admin, schedule_approver, dashboard_access, default_view',
    order: 'name',
  })
  // Carga automática desactivada para evitar error 400 al iniciar
  // Positions se cargará cuando se necesite (al abrir la página de positions)
);
