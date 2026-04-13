import {
  Incidencia,
  IncidenciaType,
  PersonnelMovement,
} from '../models/personnel-movements.model';

export interface MovementsFilters {
  employeeId: string | null;
  originBranchId: string | null;
  destinationBranchId: string | null;
}

export function filterMovements(
  movements: PersonnelMovement[],
  f: MovementsFilters,
): PersonnelMovement[] {
  return movements.filter((m) => {
    if (f.employeeId && m.employeeId !== f.employeeId) return false;
    if (f.originBranchId && m.originBranchId !== f.originBranchId) return false;
    if (f.destinationBranchId && m.destinationBranchId !== f.destinationBranchId) return false;
    return true;
  });
}

export interface IncidenciasFilters {
  employeeId: string | null;
  branchId: string | null;
  type: IncidenciaType | null;
}

export function filterIncidencias(
  incidencias: Incidencia[],
  f: IncidenciasFilters,
): Incidencia[] {
  return incidencias.filter((i) => {
    if (f.employeeId && i.employeeId !== f.employeeId) return false;
    if (f.branchId && i.branchId !== f.branchId) return false;
    if (f.type && i.type !== f.type) return false;
    return true;
  });
}
