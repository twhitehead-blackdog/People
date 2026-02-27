export type Company = {
  id: string;
  name: string;
  address: string;
  phone_number: string;
  is_active: boolean;
  created_at?: Date;
};

export type Branch = {
  id: string;
  name: string;
  short_name: string;
  address: string;
  is_active: boolean;
  created_at?: Date;
  ip: string;
  company_id?: string;
};

export type Department = {
  id: string;
  name: string;
  created_at?: Date;
};
export type UniformSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export type Position = {
  id: string;
  name: string;
  department_id: string;
  department?: Department;
  created_at?: Date;
  schedule_admin: boolean;
  admin: boolean;
  schedule_approver: boolean;
  default_view?: string;
  available_for_job_fair?: boolean;
  // NUEVO: Permisos de frontend por módulo/submódulo (JSON)
  frontend_permissions?: string | Record<string, unknown>;
};

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
  debts?: PayrollDebt[];
  has_portal_access?: boolean;
  account_approved?: boolean;
  total_lunch_exceeded_minutes?: number;
  frontend_permissions_override?: string | Record<string, unknown>;
  legacy_permissions_override?: string | Record<string, boolean>;
  hr_pin?: string;
};

export type TimeOffType = {
  id: string;
  name: string;
};

export type TimeOff = {
  id: string;
  type_id: string;
  type?: TimeOffType;
  employee_id: string;
  employee?: Employee;
  date_from: Date;
  date_to: Date;
  notes: string[];
  is_approved: boolean;
  created_by?: string;
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

export interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

export interface ExportColumn {
  title: string;
  dataKey: string;
}
export interface Timestamp {
  id: string;
  employee_id: string;
  employee?: Employee;
  branch_id: string;
  branch?: Branch;
  company_id: string;
  company?: Company;
  date: Date;
  time: string;
}

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

export type Creditor = {
  id: string;
  name: string;
  created_at?: Date;
};

export type Bank = {
  id: string;
  name: string;
  created_at?: Date;
};

export type Payroll = {
  id: string;
  name: string;
  company_id?: string;
  company?: Company;
  deductions?: PayrollDeduction[];
  settings?: PayrollSettings;
  created_at?: Date;
};

export type PayrollSettings = {
  id: string;
  company_id: string;
  cut_off_day_1: number;
  cut_off_day_2: number;
  payment_day_1: number;
  payment_day_2: number;
  adjust_payment_on_sunday: boolean;
  monthly_hours: number;
  periods_per_year: number;
  created_at?: Date;
  updated_at?: Date;
};

export type PayrollHoliday = {
  id: string;
  company_id: string;
  name: string;
  date: Date | string;
  is_recurring: boolean;
  created_at?: Date;
};

export type PayrollSalaryHistory = {
  id: string;
  employee_id: string;
  employee?: Partial<Employee>;
  previous_monthly_salary?: number;
  new_monthly_salary: number;
  previous_hourly_salary?: number;
  new_hourly_salary: number;
  effective_date: Date | string;
  reason?: string;
  created_by?: string;
  created_at?: Date;
};

export type PayrollDeduction = {
  id: string;
  payroll_id: string;
  name: string;
  value: number;
  min_salary: number;
  income_tax?: boolean;
  calculation_type: 'fixed' | 'percentage';
  applies_to: 'regular' | 'honorarios' | 'all';
  is_employer_portion?: boolean;
  employer_value?: number;
  created_at?: Date;
};

export type PayrollEmployee = {
  id: string;
  payroll_id: string;
  employee_id: string;
  monthly_salary: number;
  hourly_salary: number;
  employee: Employee;
  created_at?: Date;
};

export type PayrollPaymentStatus = 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PAID' | 'PENDING';

export type PayrollPayment = {
  id: string;
  title: string;
  payroll_id: string;
  payroll?: Payroll;
  start_date: Date;
  end_date: Date;
  payment_date?: Date;
  period_number?: 1 | 2;
  month?: number;
  year?: number;
  status: PayrollPaymentStatus;
  calculated_at?: Date;
  approved_at?: Date;
  approved_by?: string;
  notes?: string;
  created_at?: Date;
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
  created_at?: Date;
};

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

export type GroomerBranchAssignment = {
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

export type PayrollDebtType = 'company_loan' | 'bank_loan' | 'creditor' | 'other';
export type PayrollDebtStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export type PayrollDebt = {
  id: string;
  payroll_id: string;
  payroll?: Payroll;
  creditor_id: string;
  creditor?: Creditor;
  employee_id: string;
  account_id: string;
  description: string;
  employee?: Partial<Employee>;
  amount: number;
  start_date: Date;
  due_date: Date;
  balance: number;
  debt_type: PayrollDebtType;
  installment_amount?: number;
  total_installments?: number;
  paid_installments?: number;
  status: PayrollDebtStatus;
  notes?: string;
  payments?: PayrollDebtPayment[];
  created_at?: Date;
};

export type PayrollDebtPayment = {
  id: string;
  debt_id: string;
  payroll_payment_id: string;
  payment_employee_id?: string;
  amount: number;
  payment_date: Date;
  notes?: string;
  created_at?: Date;
};

export type PayrollPaymentEmployee = {
  id?: string;
  payroll_id: string;
  employee_id: string;
  payroll_payment_id: string;
  employee?: Partial<Employee>;
  branch_id?: string;
  branch?: Branch;
  department_id?: string;
  payroll_type?: 'regular' | 'honorarios';
  total_amount: number;
  income_amount: number;
  deduction_amount: number;
  debt_amount: number;
  late_amount: number;
  absence_amount: number;
  overtime_amount: number;
  sunday_amount: number;
  holiday_amount: number;
  employer_cost: number;
  items?: PayrollPaymentEmployeeItem[];
  created_at?: Date;
};

export type PayrollPaymentEmployeeItem = {
  id?: string;
  payment_employee_id: string;
  type: 'income' | 'deduction' | 'debt';
  amount: number;
  description: string;
  created_at?: Date;
};

export type JobApplication = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  position_id?: string; // Mantener por compatibilidad
  position_ids?: string[]; // Array de IDs de posiciones (múltiples selecciones)
  position?: Position;
  positions?: Position[]; // Array de posiciones relacionadas
  position_name?: string; // Mantener para compatibilidad, puede contener múltiples nombres separados por coma
  province?: string;
  corregimiento?: string;
  currently_working?: boolean;
  salary_expectation?: number;
  resume_url?: string;
  resume_filename?: string;
  additional_info?: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'rejected' | 'hired';
  interview_date?: Date;
  notes?: string;
  is_favorite?: boolean; // Campo para marcar como favorito
  created_at?: Date;
  updated_at?: Date;
};

export const colorVariants: Record<string, string> = {
  slate: 'bg-slate-300 text-slate-800',
  yellow: 'bg-yellow-300 text-yellow-800',
  green: 'bg-green-300 text-green-800',
  sky: 'bg-sky-300 text-sky-800',
  indigo: 'bg-indigo-300 text-indigo-800',
  orange: 'bg-orange-300 text-orange-800',
  purple: 'bg-purple-300 text-purple-800',
  red: 'bg-red-300 text-red-800',
  pink: 'bg-pink-300 text-pink-800',
  teal: 'bg-teal-300 text-teal-800',
  cyan: 'bg-cyan-300 text-cyan-800',
  // Colores adicionales recomendados
  emerald: 'bg-emerald-300 text-emerald-800',
  lime: 'bg-lime-300 text-lime-800',
  amber: 'bg-amber-300 text-amber-800',
  rose: 'bg-rose-300 text-rose-800',
  violet: 'bg-violet-300 text-violet-800',
  fuchsia: 'bg-fuchsia-300 text-fuchsia-800',
  blue: 'bg-blue-300 text-blue-800',
  stone: 'bg-stone-300 text-stone-800',
  neutral: 'bg-neutral-300 text-neutral-800',
  zinc: 'bg-zinc-300 text-zinc-800',
  gray: 'bg-gray-300 text-gray-800',
  // Colores adicionales más variados
  'slate-400': 'bg-slate-400 text-slate-900',
  'yellow-400': 'bg-yellow-400 text-yellow-900',
  'green-400': 'bg-green-400 text-green-900',
  'sky-400': 'bg-sky-400 text-sky-900',
  'indigo-400': 'bg-indigo-400 text-indigo-900',
  'orange-400': 'bg-orange-400 text-orange-900',
  'purple-400': 'bg-purple-400 text-purple-900',
  'red-400': 'bg-red-400 text-red-900',
  'pink-400': 'bg-pink-400 text-pink-900',
  'teal-400': 'bg-teal-400 text-teal-900',
  'cyan-400': 'bg-cyan-400 text-cyan-900',
  'emerald-400': 'bg-emerald-400 text-emerald-900',
  'lime-400': 'bg-lime-400 text-lime-900',
  'amber-400': 'bg-amber-400 text-amber-900',
  'rose-400': 'bg-rose-400 text-rose-900',
  'violet-400': 'bg-violet-400 text-violet-900',
  'fuchsia-400': 'bg-fuchsia-400 text-fuchsia-900',
  'blue-400': 'bg-blue-400 text-blue-900',
  'slate-500': 'bg-slate-500 text-white',
  'yellow-500': 'bg-yellow-500 text-white',
  'green-500': 'bg-green-500 text-white',
  'sky-500': 'bg-sky-500 text-white',
  'indigo-500': 'bg-indigo-500 text-white',
  'orange-500': 'bg-orange-500 text-white',
  'purple-500': 'bg-purple-500 text-white',
  'red-500': 'bg-red-500 text-white',
  'pink-500': 'bg-pink-500 text-white',
  'teal-500': 'bg-teal-500 text-white',
  'cyan-500': 'bg-cyan-500 text-white',
  'emerald-500': 'bg-emerald-500 text-white',
  'lime-500': 'bg-lime-500 text-white',
  'amber-500': 'bg-amber-500 text-white',
  'rose-500': 'bg-rose-500 text-white',
  'violet-500': 'bg-violet-500 text-white',
  'fuchsia-500': 'bg-fuchsia-500 text-white',
  'blue-500': 'bg-blue-500 text-white',
};

// Función helper para obtener el estilo de color de un schedule
// Maneja tanto colores recomendados (de colorVariants) como colores RGB personalizados
export function getScheduleColorStyle(
  color: string | undefined | null
): string {
  if (!color) return '';

  // Si el color está en colorVariants, retornar la clase Tailwind
  if (colorVariants[color]) {
    return colorVariants[color];
  }

  // Si es un color RGB personalizado, retornar estilo inline
  if (color.startsWith('rgb(')) {
    return '';
  }

  // Si es hex, convertir a RGB
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    return '';
  }

  return '';
}

// Función helper para obtener el estilo inline de color (para colores personalizados)
export function getScheduleColorInlineStyle(
  color: string | undefined | null
): { [key: string]: string } | null {
  if (!color) return null;

  // Si el color está en colorVariants, no necesita estilo inline
  if (colorVariants[color]) {
    return null;
  }

  // Si es un color RGB personalizado
  if (color.startsWith('rgb(')) {
    return {
      'background-color': color,
      color: getTextColorForRgb(color),
    };
  }

  // Si es hex, convertir a RGB
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    return {
      'background-color': rgb,
      color: getTextColorForRgb(rgb),
    };
  }

  return null;
}

// Convertir Hex a RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(59, 130, 246)';

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgb(${r}, ${g}, ${b})`;
}

// Determinar color de texto según el fondo RGB
function getTextColorForRgb(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  // Calcular luminosidad
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ============================================
// SISTEMA DE MARCACIONES INDEPENDIENTE PARA NAZ
// ============================================

export type NazCompany = {
  id: string;
  name: string;
  address?: string;
  phone_number?: string;
  is_active: boolean;
  created_at?: Date;
};

export type NazBranch = {
  id: string;
  name: string;
  short_name?: string;
  address?: string;
  is_active: boolean;
  ip?: string;
  company_id?: string;
  company?: NazCompany;
  created_at?: Date;
};

export type NazDepartment = {
  id: string;
  name: string;
  created_at?: Date;
};

export type NazPosition = {
  id: string;
  name: string;
  department_id: string;
  department?: NazDepartment;
  schedule_admin: boolean;
  admin: boolean;
  schedule_approver: boolean;
  created_at?: Date;
};

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
  schedule?: NazSchedule;
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

// Interfaces para TimelogsComponent
export interface TimelogBranch {
  date: Date;
  branch: Branch;
  id?: string;
}

export interface EmployeeScheduleData {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  approved: boolean;
  approved_by?: string;
  schedule?: Schedule;
}

export interface TimeoffData {
  id: string;
  type_id: string;
  employee_id: string;
  date_from: string;
  date_to: string;
  is_approved: boolean;
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
  delay?: number | string;
  alert?: string;
  scheduleError?: boolean;
  lunchExceeded?: boolean;
  lunchMinutes?: number;
  earlyExit?: boolean;
  insufficientHours?: boolean;
  totalHours?: number;
  overtimeHours?: number;
  overtimeRecord?: EmployeeOvertimeRecord; // Link to overtime confirmation record
  entry?: TimelogBranch;
  lunch_start?: TimelogBranch;
  lunch_end?: TimelogBranch;
  exit?: TimelogBranch;
}

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

// ============================================
// AUDIT TASKS SYSTEM
// ============================================

export type AuditTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AuditTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'not_applicable'
  | 'overdue';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type AssignmentType = 'all' | 'specific' | 'by_branch';

export interface RecurrenceConfig {
  // Monthly - día específico del mes (ej: día 15)
  day_of_month?: number;
  // Monthly - semana y día del mes (ej: segundo lunes)
  week_of_month?: number;
  day_of_week?: number;
  // Weekly - días de la semana (0=domingo, 1=lunes, ..., 6=sábado)
  days?: number[];
  // Custom - fechas específicas
  dates?: string[];
}

export interface AuditTask {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: string;
  priority: AuditTaskPriority;
  recurrence_type: RecurrenceType;
  recurrence_config: RecurrenceConfig;
  assignment_type: AssignmentType;
  assigned_branch_ids: string[];
  assigned_manager_ids: string[];
  due_days: number;
  reminder_days_before: number;
  is_active: boolean;
  created_by?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface AuditTaskInstance {
  id: string;
  audit_task_id: string;
  audit_task?: AuditTask;
  company_id: string;
  assigned_to: string;
  assigned_employee?: Partial<Employee>;
  branch_id?: string;
  branch?: Branch;
  status: AuditTaskStatus;
  scheduled_date: Date | string;
  due_date: Date | string;
  completed_at?: Date | string;
  completed_by?: string;
  completion_notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Categorías predefinidas para tareas de auditoría
export const AUDIT_TASK_CATEGORIES = [
  { value: 'inventario', label: 'Inventario', icon: 'pi pi-box' },
  { value: 'limpieza', label: 'Limpieza', icon: 'pi pi-sparkles' },
  { value: 'seguridad', label: 'Seguridad', icon: 'pi pi-shield' },
  { value: 'administrativo', label: 'Administrativo', icon: 'pi pi-file' },
  {
    value: 'capacitacion',
    label: 'Capacitación',
    icon: 'pi pi-graduation-cap',
  },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: 'pi pi-wrench' },
  { value: 'calidad', label: 'Calidad', icon: 'pi pi-check-circle' },
  { value: 'otro', label: 'Otro', icon: 'pi pi-ellipsis-h' },
] as const;

export const AUDIT_TASK_PRIORITIES = [
  { value: 'low', label: 'Baja', severity: 'secondary', icon: 'pi pi-minus' },
  { value: 'medium', label: 'Media', severity: 'info', icon: 'pi pi-equals' },
  { value: 'high', label: 'Alta', severity: 'warn', icon: 'pi pi-arrow-up' },
  {
    value: 'urgent',
    label: 'Urgente',
    severity: 'danger',
    icon: 'pi pi-exclamation-triangle',
  },
] as const;

export const AUDIT_TASK_STATUSES = [
  {
    value: 'pending',
    label: 'Pendiente',
    severity: 'warn',
    icon: 'pi pi-clock',
  },
  {
    value: 'in_progress',
    label: 'En Progreso',
    severity: 'info',
    icon: 'pi pi-spin pi-spinner',
  },
  {
    value: 'completed',
    label: 'Completado',
    severity: 'success',
    icon: 'pi pi-check',
  },
  {
    value: 'not_applicable',
    label: 'No Aplica',
    severity: 'secondary',
    icon: 'pi pi-ban',
  },
  {
    value: 'overdue',
    label: 'Vencido',
    severity: 'danger',
    icon: 'pi pi-times-circle',
  },
] as const;

// ============================================
// PERFORMANCE 360 - AUDIT SYSTEM
// ============================================

export interface PerformanceRule {
  id: string;
  name: string; // 'Critico', 'Moderado', 'Aceptable'
  min_score: number;
  max_score: number;
  multiplier: number;
  severity: 'danger' | 'warn' | 'success';
}

export interface AuditForm {
  id: string;
  company_id: string;
  title: string;
  business_unit: 'Petshop' | 'Grooming' | 'Clinica' | string;
  version: number;
  is_active: boolean;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  // Joins
  sections?: AuditSection[];
}

export interface AuditSection {
  id: string;
  audit_form_id: string;
  code: string; // 'OP', 'AC'
  title: string;
  weight_percentage: number; // 30.00
  order_index: number;
  // Joins
  questions?: AuditQuestion[];
}

export interface AuditQuestion {
  id: string;
  audit_section_id: string;
  code: string; // 'OP.1'
  question_text: string;
  weight_relative: number; // 0.40
  is_critical?: boolean;
  order_index: number;
}

export type AuditEvaluationStatus = 'draft' | 'completed' | 'archived';

export interface AuditEvaluation {
  id: string;
  company_id: string;
  branch_id: string;
  branch?: Branch; // Join
  audit_form_id: string;
  audit_form?: AuditForm; // Join
  form_version: number;

  audited_by: string;
  auditor?: Partial<Employee>; // Join
  evaluated_employee_id?: string;
  evaluated_employee?: Partial<Employee>; // Join

  status: AuditEvaluationStatus;

  total_score?: number;
  performance_level?: string;

  observations?: string;
  started_at?: Date | string;
  completed_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;

  // Joins
  answers?: AuditAnswer[];
}

export interface AuditAnswer {
  id: string;
  audit_evaluation_id: string;
  audit_question_id: string;
  question?: AuditQuestion; // Join

  answer_value: 'yes' | 'no' | 'na';
  notes?: string;

  // Snapshots
  question_text_snapshot?: string;
  weight_relative_snapshot?: number;
}

// ============================================
// IT DEVICE INVENTORY SYSTEM
// ============================================

export type DeviceStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type DeviceType =
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'printer'
  | 'scanner'
  | 'phone'
  | 'tablet'
  | 'headset'
  | 'webcam'
  | 'other';

export interface Device {
  id: string;
  company_id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  device_type: DeviceType;
  status: DeviceStatus;
  purchase_date?: Date | string | null;
  warranty_expiry?: Date | string | null;
  notes?: string | null;
  cost?: number | null;
  last_maintenance_date?: Date | string | null;
  branch_id?: string | null;
  branch?: { id: string; name: string } | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type DeviceAssignmentStatus = 'active' | 'returned' | 'lost' | 'damaged';

export interface DeviceAssignment {
  id: string;
  company_id: string;
  device_id: string;
  device?: Device;
  employee_id: string;
  employee?: Partial<Employee>;
  assigned_by: string;
  assignedByEmployee?: Partial<Employee>;
  assigned_date: Date | string;
  return_date?: Date | string | null;
  status: DeviceAssignmentStatus;
  // Confirmación por el empleado
  employee_confirmed: boolean;
  employee_confirmed_at?: Date | string | null;
  employee_signature_url?: string | null;
  employee_notes?: string | null;
  // Condiciones al entregar
  condition_notes?: string | null;
  accessories_included?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Opciones para los selectores
export const DEVICE_TYPE_OPTIONS: { label: string; value: DeviceType; icon: string }[] = [
  { label: 'Laptop', value: 'laptop', icon: 'pi pi-laptop' },
  { label: 'Desktop', value: 'desktop', icon: 'pi pi-desktop' },
  { label: 'Monitor', value: 'monitor', icon: 'pi pi-desktop' },
  { label: 'Teclado', value: 'keyboard', icon: 'pi pi-keyboard' },
  { label: 'Mouse', value: 'mouse', icon: 'pi pi-mouse' },
  { label: 'Impresora', value: 'printer', icon: 'pi pi-print' },
  { label: 'Escáner', value: 'scanner', icon: 'pi pi-scan' },
  { label: 'Teléfono', value: 'phone', icon: 'pi pi-phone' },
  { label: 'Tablet', value: 'tablet', icon: 'pi pi-tablet' },
  { label: 'Audífonos', value: 'headset', icon: 'pi pi-headphones' },
  { label: 'Cámara Web', value: 'webcam', icon: 'pi pi-video' },
  { label: 'Otro', value: 'other', icon: 'pi pi-ellipsis-h' },
];

export const DEVICE_STATUS_OPTIONS: { label: string; value: DeviceStatus; severity: string }[] = [
  { label: 'Disponible', value: 'available', severity: 'success' },
  { label: 'Asignado', value: 'assigned', severity: 'info' },
  { label: 'Mantenimiento', value: 'maintenance', severity: 'warn' },
  { label: 'Retirado', value: 'retired', severity: 'secondary' },
];

export const DEVICE_ASSIGNMENT_STATUS_OPTIONS: { label: string; value: DeviceAssignmentStatus; severity: string }[] = [
  { label: 'Activo', value: 'active', severity: 'success' },
  { label: 'Devuelto', value: 'returned', severity: 'secondary' },
  { label: 'Perdido', value: 'lost', severity: 'danger' },
  { label: 'Dañado', value: 'damaged', severity: 'warn' },
];

// ============================================
// HR SURVEY SYSTEM
// ============================================

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating' | 'yes_no' | 'scale';
export type SurveyAssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface ScaleConfig {
  min: number;
  max: number;
  min_label?: string;
  max_label?: string;
}

export interface Survey {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: string;
  status: SurveyStatus;
  is_anonymous: boolean;
  allow_multiple_submissions: boolean;
  due_date?: string;
  is_template: boolean;
  created_by?: string;
  creator?: { first_name?: string; father_name?: string };
  activated_at?: string;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;
  questions?: SurveyQuestion[];
  assignments_count?: number;
  completed_count?: number;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  is_required: boolean;
  order_index: number;
  scale_config?: ScaleConfig;
  created_at?: string;
  updated_at?: string;
  options?: SurveyQuestionOption[];
}

export interface SurveyQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
  created_at?: string;
}

export interface SurveyAssignment {
  id: string;
  survey_id: string;
  employee_id: string;
  company_id: string;
  status: SurveyAssignmentStatus;
  assigned_at?: string;
  completed_at?: string;
  notified: boolean;
  survey?: Survey;
  employee?: { first_name?: string; father_name?: string };
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  employee_id: string;
  company_id: string;
  submitted_at?: string;
  answers?: SurveyResponseAnswer[];
  employee?: { first_name?: string; father_name?: string };
}

export interface SurveyResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text?: string;
  answer_numeric?: number;
  selected_option_ids?: string[];
  created_at?: string;
}

export const SURVEY_STATUS_OPTIONS = [
  { value: 'draft' as SurveyStatus, label: 'Borrador', severity: 'secondary', icon: 'pi pi-pencil' },
  { value: 'active' as SurveyStatus, label: 'Activa', severity: 'success', icon: 'pi pi-check-circle' },
  { value: 'closed' as SurveyStatus, label: 'Cerrada', severity: 'warn', icon: 'pi pi-lock' },
  { value: 'archived' as SurveyStatus, label: 'Archivada', severity: 'info', icon: 'pi pi-inbox' },
];

export const SURVEY_CATEGORY_OPTIONS = [
  { value: 'clima_laboral', label: 'Clima Laboral', icon: 'pi pi-sun' },
  { value: 'satisfaccion', label: 'Satisfacción', icon: 'pi pi-heart' },
  { value: 'onboarding', label: 'Onboarding', icon: 'pi pi-user-plus' },
  { value: 'evaluacion', label: 'Evaluación', icon: 'pi pi-chart-bar' },
  { value: 'otro', label: 'Otro', icon: 'pi pi-ellipsis-h' },
];

export const QUESTION_TYPE_OPTIONS = [
  { value: 'single_choice' as SurveyQuestionType, label: 'Opción Única', icon: 'pi pi-circle' },
  { value: 'multiple_choice' as SurveyQuestionType, label: 'Opción Múltiple', icon: 'pi pi-check-square' },
  { value: 'text' as SurveyQuestionType, label: 'Texto Libre', icon: 'pi pi-align-left' },
  { value: 'rating' as SurveyQuestionType, label: 'Calificación (1-5)', icon: 'pi pi-star' },
  { value: 'yes_no' as SurveyQuestionType, label: 'Sí / No', icon: 'pi pi-thumbs-up' },
  { value: 'scale' as SurveyQuestionType, label: 'Escala Numérica', icon: 'pi pi-sliders-h' },
];
