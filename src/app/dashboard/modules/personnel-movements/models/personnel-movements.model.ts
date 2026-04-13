/**
 * Data models for the Personnel Movements Tracking module.
 * All types are locally scoped to this feature.
 */

/** A single branch-day summary derived from timelogs of one employee. */
export interface DailyEmployeeBranch {
  /** ISO date yyyy-MM-dd (Panama timezone) */
  date: string;
  /** Dominant branch of that day (branch with most punches). */
  branchId: string;
  /** All branches touched that day (useful for ambiguous/edge cases). */
  allBranchIds: string[];
  /** Count of punches that day. */
  punchCount: number;
}

/** An inferred movement of an employee away from their base branch. */
export interface PersonnelMovement {
  employeeId: string;
  employeeName: string;
  employeeBaseBranchId: string | null;
  originBranchId: string | null;
  originBranchName: string | null;
  destinationBranchId: string;
  destinationBranchName: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  durationDays: number;
}

/** One entry of a per-employee chronological branch-stay history. */
export interface BranchHistoryEntry {
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  movementType: 'base' | 'movimiento';
}

export type IncidenciaType = 'tardanza' | 'certificado_medico' | 'ausencia_injustificada';

/** Unified incidencia row (consolidates lates + disabilities + unjustified absences). */
export interface Incidencia {
  id: string;
  type: IncidenciaType;
  employeeId: string;
  employeeName: string;
  /** Main date for filtering (tardanza: timelog_date; certificado: start_date; ausencia: date_from). */
  date: string;
  /** Applicable for multi-day incidencias; null for single-day. */
  endDate: string | null;
  branchId: string | null;
  branchName: string | null;
  /** Free-text detail (minutos, reason, etc.). */
  detail: string;
}

/** Raw meta record as returned by GET /api/metas (subset of MetasBranch from dashboards-app). */
export interface MetaRaw {
  odooName: string;
  analyticAccountId: number;
  ventasActuales?: number;
  metaPromedio?: number;
  porcentajeBaja?: number;
  porcentajePromedio?: number;
  porcentajeAlta?: number;
  porcentajeOro?: number;
  estadoGeneral?: string;
}

/** A meta row enriched with the mapped branch + associated personnel and movements. */
export interface MetaBranchView {
  analyticAccountId: number;
  odooName: string;
  branchId: string | null;
  branchName: string;
  /** Highest achieved tier based on porcentaje* values; null if none reached. */
  achievedTier: 'oro' | 'alta' | 'promedio' | 'baja' | null;
  /** Highest percentage (oro > alta > promedio > baja) for display. */
  topPercentage: number;
  ventasActuales: number;
  estadoGeneral: string;
  /** Employees with this branch as their base. */
  personnel: { employeeId: string; employeeName: string }[];
  /** Movements INTO or OUT OF this branch during the filtered period. */
  movementsCount: number;
}

/** Period totals + per-branch aggregation used by the Resumen tab + export. */
export interface MovementsSummary {
  totalMovements: number;
  totalIncidencias: number;
  employeesMoved: number;
  branchesWithMetaAchieved: number;
  perBranch: {
    branchId: string;
    branchName: string;
    movementsOut: number;
    movementsIn: number;
    incidencias: number;
    personnelCount: number;
  }[];
}
