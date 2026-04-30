import type { Employee } from './employee.model';

export type VacationPaymentStatus = 'PENDING' | 'CALCULATED' | 'APPROVED' | 'PAID';

export type VacationPayment = {
  id: string;
  company_id: string;
  employee_id: string;
  vacation_request_id?: string;
  hire_date: Date | string;
  calculation_date: Date | string;
  months_worked: number;
  accrued_days: number;
  used_days: number;
  days_to_pay: number;
  daily_rate: number;
  monthly_salary: number;
  total_amount: number;
  status: VacationPaymentStatus;
  approved_by?: string;
  approved_at?: Date | string;
  paid_date?: Date | string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  employee?: Partial<Employee>;
};
