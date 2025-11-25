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
  work_email?: string;
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
  dashboard_access?: boolean;
  default_view?: string;
};

export type Employee = {
  id: string;
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
  address: string;
  end_date?: Date;
  created_at?: Date;
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
  debts?: PayrollDebt[];
  has_portal_access?: boolean;
  account_approved?: boolean;
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
};

export type Termination = {
  id: string;
  employee_id: string;
  date: Date;
  notes: string;
  reason: 'DESPIDO' | 'RENUNCIA' | 'FIN_CONTRATO';
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

export type PayrollPayment = {
  id: string;
  title: string;
  payroll_id: string;
  payroll?: Payroll;
  start_date: Date;
  end_date: Date;
  status: 'PENDING' | 'PAID';
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
};

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
  created_at?: Date;
};

export type PayrollPaymentEmployee = {
  id?: string;
  payroll_id: string;
  employee_id: string;
  payroll_payment_id: string;
  employee?: Partial<Employee>;
  total_amount: number;
  debt_amount: number;
  late_amount: number;
  absence_amount: number;
  items?: PayrollPaymentEmployeeItem[];
  income_amount: number;
  deduction_amount: number;
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
};
