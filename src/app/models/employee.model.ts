import type { Branch, Department, Position, UniformSize, NazBranch, NazDepartment, NazPosition } from './company.model';
import type { TimeOff } from './timeoff.model';
import type { PayrollDebt } from './payroll.model';

export type Employee = {
  id: string;
  employee_number?: string; // Número de empleado formato: BD0001, NZ0001
  document_id: string;
  first_name: string;
  middle_name: string;
  father_name: string;
  mother_name: string;
  birth_date?: Date;
  gender: 'M' | 'F';
  start_date: Date;
  monthly_salary: number;
  branch_id: string;
  branch?: Branch;
  department_id: string;
  department?: Department;
  position_id: string;
  position?: Position;
  email: string;
  work_email: string;
  phone_number: string;
  work_phone_number?: string;
  address: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  end_date?: Date;
  created_at?: Date;
  updated_at?: Date;
  is_active: boolean;
  profile_photo_url?: string;
  uniform_size?: UniformSize;
  timeoffs?: TimeOff[];
  qr_code?: string;
  code_uri?: string;
  bank?: string;
  account_number?: string;
  bank_account_type?: 'Ahorros' | 'Corriente';
  full_name?: string;
  hourly_salary?: number;
  payroll_type?: 'regular' | 'honorarios';
  use_timelog?: boolean;
  debts?: PayrollDebt[];
  has_portal_access?: boolean;
  account_approved?: boolean;
  total_lunch_exceeded_minutes?: number;
  frontend_permissions_override?: string | Record<string, unknown>;
  legacy_permissions_override?: string | Record<string, boolean>;
  access_schedule?: string | AccessSchedule | null;
  hr_pin?: string;
};

/**
 * Restricción de horario de acceso por empleado.
 * - days: 0 Dom, 1 Lun, 2 Mar, 3 Mie, 4 Jue, 5 Vie, 6 Sab
 * - start/end: "HH:MM" 24h en la zona horaria indicada
 * - mode: 'block' = bloquea acceso; 'readonly' = forza solo lectura
 */
export type AccessSchedule = {
  enabled: boolean;
  days: number[];
  start: string;
  end: string;
  timezone: string;
  mode: 'block' | 'readonly';
};

export type Termination = {
  id: string;
  employee_id: string;
  date: Date;
  notes: string;
  reason: 'DESPIDO' | 'RENUNCIA' | 'FIN_CONTRATO';
  reintegration_date?: Date | string | null;
  created_at?: Date | string;
};

// ============================================
// NAZ EMPLOYEE
// ============================================

export type NazEmployee = {
  id: string;
  employee_number?: string; // Número de empleado formato: NZ0001
  document_id: string;
  first_name: string;
  middle_name?: string;
  father_name: string;
  mother_name?: string;
  birth_date?: Date;
  gender: 'M' | 'F';
  start_date: Date;
  monthly_salary: number;
  hourly_salary?: number;
  branch_id: string;
  branch?: NazBranch;
  department_id: string;
  department?: NazDepartment;
  position_id: string;
  position?: NazPosition;
  email?: string;
  work_email?: string;
  phone_number?: string;
  address?: string;
  end_date?: Date;
  is_active: boolean;
  uniform_size?: UniformSize;
  qr_code?: string;
  code_uri?: string;
  bank?: string;
  account_number?: string;
  bank_account_type?: 'Ahorros' | 'Corriente';
  full_name?: string;
  created_at?: Date;
};

// ============================================
// OVERTIME CONFIRMATION SYSTEM
// ============================================

export type OvertimeStatus = 'pending' | 'confirmed' | 'rejected';

export interface EmployeeOvertimeRecord {
  id: string;
  employee_id: string;
  timelog_date: string; // ISO date format (yyyy-MM-dd)
  hours: number;
  status: OvertimeStatus;
  reason?: string;
  confirmed_by?: string;
  confirmed_at?: Date | string;
  company_id?: string;
  created_at?: Date | string;
  updated_at?: Date | string;

  // Joined data (from queries with select)
  employee?: Partial<Employee>;
  confirmedByEmployee?: Partial<Employee>;
}

// ============================================
// LATE RECORDS SYSTEM - Tardanzas
// ============================================

export type LateRecordStatus = 'active' | 'justified' | 'compensated' | 'discarded';
export type LateRecordSource = 'peluqueria' | 'clinica' | 'manual' | 'kiosk' | 'api' | 'import';

export interface EmployeeLateRecord {
  id: string;
  employee_id: string;
  timelog_date: string; // ISO date format (yyyy-MM-dd)

  // Datos de horario
  scheduled_entry_time: string; // HH:mm:ss
  actual_entry_time: string; // HH:mm:ss
  minutes_late: number;
  tolerance_minutes: number;

  // Datos del empleado (snapshot)
  employee_name: string;
  position_id?: string;
  position_name?: string;

  // Datos de ubicación
  branch_id?: string;
  branch_name?: string;

  // Metadatos
  source_module: LateRecordSource;
  source_timelog_id?: string;

  // Estado y gestión
  status: LateRecordStatus;
  justified_by?: string;
  justified_at?: Date | string;
  justification_reason?: string;

  // Multi-tenant
  company_id?: string;

  // Timestamps
  created_at?: Date | string;
  updated_at?: Date | string;

  // Joined data (from queries with select)
  employee?: Partial<Employee>;
  branch?: Partial<Branch>;
  justifiedByEmployee?: Partial<Employee>;
}
