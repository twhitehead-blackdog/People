import type { Branch, NazBranch } from './company.model';
import type { Employee, NazEmployee } from './employee.model';

export type Schedule = {
  id: string;
  name: string;
  entry_time: Date | string | null;
  lunch_start_time: Date | string | null;
  lunch_end_time: Date | string | null;
  exit_time: Date | string | null;
  color?: string;
  created_at?: Date;
  day_off: boolean;
  minutes_tolerance: number;
  min_lunch_minutes?: number;
  max_lunch_minutes?: number;
};

export type ScheduleShiftLimit = {
  id: string;
  branch_id: string;
  branch?: Branch;
  shift_type: 'apertura' | 'cierre';
  max_employees: number;
  company_id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type EmployeeSchedule = {
  id: string;
  employee_id: string;
  branch_id?: string;
  branch?: Branch;
  schedule_id: string;
  schedule?: Schedule;
  start_date: Date;
  end_date: Date;
  created_at?: Date;
  approved?: boolean;
  updated_at?: Date;
  approved_at?: Date;
  company_id?: string;
  time_off_type?: 'vacation' | 'compensatory_day' | 'compensatory_hours' | 'disability' | null;
  time_off_source_id?: string | null;
  compensatory_hours_amount?: number | null;
  approved_by?: string;
  approved_by_employee?: { id: string; first_name: string; father_name: string };
};

export type VetBranchAssignment = {
  id: string;
  employee_id: string;
  branch_id: string;
  date: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  company_id?: string;
  branch?: Branch;
  employee?: Employee;
};

export type GroomerEmployeeConfig = {
  id?: string;
  company_id: string;
  employee_id: string;
  zone?: string | null;
  is_rotating: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GroomerBranchAssignment = {
  id: string;
  employee_id: string;
  branch_id: string;
  date: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  company_id?: string;
  created_by?: string | null;
  branch?: Branch;
  employee?: Employee;
};

// ============================================
// NAZ SCHEDULES
// ============================================

export type NazSchedule = {
  id: string;
  name: string;
  entry_time?: Date | string | null;
  lunch_start_time?: Date | string | null;
  lunch_end_time?: Date | string | null;
  exit_time?: Date | string | null;
  color?: string;
  day_off: boolean;
  minutes_tolerance: number;
  min_lunch_minutes?: number;
  max_lunch_minutes?: number;
  created_at?: Date;
};

export type NazEmployeeSchedule = {
  id: string;
  employee_id: string;
  employee?: NazEmployee;
  branch_id?: string;
  branch?: NazBranch;
  schedule_id: string;
  schedule?: NazSchedule;
  start_date: Date;
  end_date: Date;
  approved?: boolean;
  approved_at?: Date;
  approved_by?: string;
  approved_by_employee?: { id: string; first_name: string; father_name: string };
  created_at?: Date;
  updated_at?: Date;
};

// =====================================================
// Shift Transfers / Coberturas (Fase 2 — Resolver canónico)
// =====================================================

export type ShiftTransferIncidentType =
  | 'coverage'
  | 'branch_transfer'
  | 'special_schedule'
  | 'absence_replacement';

export type ShiftTransferStatus = 'draft' | 'active' | 'cancelled';

/**
 * Política granular de supresión de alertas (§7 + §13.2).
 * v1 es el shape inicial — cambios futuros requieren incrementar version.
 */
export interface TransferAlertPolicyV1 {
  version: 1;
  suppress_late: boolean;
  suppress_day_off: boolean;
  suppress_insufficient_hours: boolean;
  suppress_shift_mismatch: boolean;
  suppress_branch_mismatch: boolean;
  allow_overtime: boolean;
}

export type TransferAlertPolicy = TransferAlertPolicyV1;

/** Fila de la tabla shift_transfers (tal como llega de PostgREST). */
export interface ShiftTransferData {
  id: string;
  company_id: string;
  date: string; // YYYY-MM-DD en zona America/Panama
  incident_type: ShiftTransferIncidentType;
  absent_employee_id: string | null;
  replacement_employee_id: string;
  origin_branch_id: string;
  destination_branch_id: string;
  absent_original_schedule_id: string | null;
  replacement_original_schedule_id: string | null;
  actual_worked_schedule_id: string;
  alert_policy: Omit<TransferAlertPolicyV1, 'version'>;
  policy_version: number;
  allow_double_shift: boolean;
  mark_absent_as_justified: boolean;
  notes: string | null;
  status: ShiftTransferStatus;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftTransferAuditLog {
  id: string;
  shift_transfer_id: string | null;
  action: 'created' | 'updated' | 'status_changed' | 'cancelled' | 'reactivated' | 'deleted';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  changed_by: string | null;
  changed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  comment: string | null;
}

/**
 * Salida del resolver canónico. Expone explícitamente
 * `ownershipBranchId` (§13.1) para eliminar ambigüedad
 * en reporting y analytics downstream.
 */
export interface EffectiveAssignment {
  employeeId: string;
  date: string; // YYYY-MM-DD
  scheduleId: string | null;
  branchId: string | null;
  ownershipBranchId: string | null;
  source: 'schedule' | 'transfer_replacement' | 'transfer_absent' | 'default_branch';
  transfer?: ShiftTransferData;
  originalScheduleId: string | null;
  originalBranchId: string | null;
}

/** Fila cruda del RPC get_effective_assignments. */
export interface EffectiveAssignmentRpcRow {
  employee_id: string;
  date: string;
  schedule_id: string | null;
  branch_id: string | null;
  ownership_branch_id: string | null;
  source: EffectiveAssignment['source'];
  transfer_id: string | null;
  original_schedule_id: string | null;
  original_branch_id: string | null;
}
