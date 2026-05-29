import type { Branch, Company } from './company.model';
import type { Employee } from './employee.model';

// Creditor se movió a employee-debt.model.ts (rediseño 2026-05-29).
// El nuevo tipo es superset del antiguo (id + name + más columnas).
// Re-exportar para mantener compatibilidad con código viejo.
export type { Creditor } from './employee-debt.model';

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

export type OvertimePolicy = 'paid' | 'comp_time' | 'none';

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
  overtime_policy: OvertimePolicy;
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

export type PayrollDebtType = 'company_loan' | 'bank_loan' | 'creditor' | 'embargo' | 'other';
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
  embargo_max_percentage?: number; // % máximo del salario neto (embargos judiciales)
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
