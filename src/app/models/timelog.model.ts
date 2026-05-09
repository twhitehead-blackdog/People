import type { Branch, NazBranch, NazCompany } from './company.model';
import type { Employee, EmployeeOvertimeRecord, NazEmployee } from './employee.model';
import type { Schedule } from './schedule.model';
import type { TimeOffType } from './timeoff.model';

export enum TimelogType {
  entry = 'Entrada',
  lunch_start = 'Inicio Almuerzo',
  lunch_end = 'Fin de Almuerzo / Regreso',
  exit = 'Salida',
}

export enum TimeLogEnum {
  entry = 'entry',
  lunch_start = 'lunch_start',
  lunch_end = 'lunch_end',
  exit = 'exit',
}

export type TimeLog = {
  id: string;
  employee_id: string;
  employee?: Partial<Employee>;
  company_id: string;
  branch_id: string;
  branch?: Branch;
  type: TimeLogEnum;
  ip?: string;
  invalid_id?: boolean;
  created_at: Date;
  // Campos para marcaciones manuales
  source?: 'KIOSK' | 'MANUAL' | 'RPC';
  created_by?: string;
  punched_at?: Date;
  reason?: string;
};

export type AttendanceSheet = {
  id?: string;
  employee_id: string;
  base_salary: number;
  branch_id: string | null;
  branch?: Branch;
  schedule_id: string | null;
  schedule?: Schedule;
  date: Date | string;
  entry_time: Date | null;
  exit_time: Date | null;
  lunch_start_time: Date | null;
  lunch_end_time: Date | null;
  is_late: boolean;
  is_sunday: boolean;
  worked_hours_payment: number;
  late_hours_payment: number;
  holiday_payment: number;
  sunday_payment: number;
  absence_hours: number;
  absence_hours_payment: number;
  is_holiday: boolean;
  worked_hours: number;
  compensatory_hours?: number;
  compensatory_hours_payment?: number;
  is_justified: boolean;
  justification_notes: string;
  justification_cause?:
  | 'NORMAL'
  | 'PERSONAL'
  | 'INJUSTIFICADA'
  | 'JUSTIFICADA'
  | 'COMPENSATORIO';
  justified_hours?: number;
  late_hours: number;
  overtime_hours: number;
  overtime_hours_payment: number;
  holiday_hours_payment: number;
  created_at?: Date;
};

// ============================================
// NAZ TIMELOG / ATTENDANCE
// ============================================

export type NazTimeLog = {
  id: string;
  employee_id: string;
  employee?: Partial<NazEmployee>;
  company_id: string;
  company?: NazCompany;
  branch_id: string;
  branch?: NazBranch;
  type: TimeLogEnum;
  ip?: string;
  invalid_id?: boolean;
  created_at: Date;
};

export type NazAttendanceSheet = {
  id?: string;
  employee_id: string;
  employee?: NazEmployee;
  base_salary: number;
  branch_id?: string | null;
  branch?: NazBranch;
  schedule_id?: string | null;
  schedule?: import('./schedule.model').NazSchedule;
  date: Date | string;
  entry_time?: Date | null;
  exit_time?: Date | null;
  lunch_start_time?: Date | null;
  lunch_end_time?: Date | null;
  is_late: boolean;
  is_sunday: boolean;
  worked_hours: number;
  late_hours: number;
  overtime_hours: number;
  absence_hours: number;
  worked_hours_payment: number;
  late_hours_payment: number;
  holiday_payment: number;
  sunday_payment: number;
  absence_hours_payment: number;
  is_holiday: boolean;
  compensatory_hours?: number;
  compensatory_hours_payment?: number;
  is_justified: boolean;
  justification_notes: string;
  justification_cause?:
  | 'NORMAL'
  | 'PERSONAL'
  | 'INJUSTIFICADA'
  | 'JUSTIFICADA'
  | 'COMPENSATORIO';
  justified_hours?: number;
  created_at?: Date;
};

// ============================================
// Helpers usados por TimelogsComponent
// ============================================

export interface TimelogBranch {
  date: Date;
  branch: Branch;
  id?: string;
  is_manual?: boolean;
  manual_reason?: string | null;
  invalid_ip?: boolean;
  source?: string | null;
  ip?: string | null;
}

export interface EmployeeScheduleData {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  approved: boolean;
  approved_by?: string;
  schedule?: Schedule;
  time_off_type?: 'vacation' | 'compensatory_day' | 'compensatory_hours' | 'disability' | null;
  compensatory_hours_amount?: number | null;
}

export interface TimeoffData {
  id: string;
  type_id: string;
  employee_id: string;
  date_from: string;
  date_to: string;
  is_approved: boolean;
  compensatory_type?: 'hours' | 'days' | null;
  compensatory_amount?: number | null;
  company_id?: string;
  type?: TimeOffType;
  employee?: {
    company_id?: string;
  };
}

export interface DayLog {
  employee: Partial<Employee>;
  day: string;
  schedule?: EmployeeScheduleData;
  compensatoryHours?: number | null;
  withinTolerance?: boolean;
  toleranceUsedMinutes?: number;
  delay?: number | string;
  alert?: string;
  scheduleError?: boolean;
  shiftMismatch?: boolean;
  expectedScheduleName?: string;
  lunchExceeded?: boolean;
  lunchMinutes?: number;
  earlyExit?: boolean;
  insufficientHours?: boolean;
  requiredHours?: number;
  totalHours?: number;
  overtimeHours?: number;
  overtimeRecord?: EmployeeOvertimeRecord; // Link to overtime confirmation record
  entry?: TimelogBranch;
  lunch_start?: TimelogBranch;
  lunch_end?: TimelogBranch;
  exit?: TimelogBranch;
}

/** Timelog guardado localmente cuando el servidor no responde */
export interface EmergencyTimelog {
  id: string;
  employee_id: string;
  employee_name: string;
  company_id: string;
  branch_id: string;
  type: string;
  type_label: string;
  timestamp: string;
  synced: boolean;
}

