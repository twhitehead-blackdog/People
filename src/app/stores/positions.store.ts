import { signalStore } from '@ngrx/signals';
import { Position } from '../models';
import { withCustomEntities } from './entities.feature';

export const PositionsStore = signalStore(
  withCustomEntities<Position>({
    name: 'positions',
    query: 'id,name,department_id,available_for_job_fair',
    order: 'name',
  })
  // Carga automática desactivada para evitar error 400 al iniciar
  // Positions se cargará cuando se necesite (al abrir la página de positions)
);
