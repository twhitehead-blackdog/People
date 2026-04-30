import type { Employee } from './employee.model';

export type LiquidationTerminationType =
  | 'RENUNCIA'
  | 'RENUNCIA_JUSTIFICADA'
  | 'DESPIDO_JUSTIFICADO'
  | 'DESPIDO_INJUSTIFICADO'
  | 'MUTUO_ACUERDO'
  | 'VENCIMIENTO_CONTRATO';

export type ContractType = 'INDEFINIDO' | 'DEFINIDO' | 'OBRA';

export type LiquidationStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';

export type EmployeeLiquidation = {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  document_id?: string;
  hire_date: Date | string;
  termination_date: Date | string;
  monthly_salary: number;
  position?: string;
  department?: string;
  branch?: string;
  contract_type: ContractType;
  termination_type: LiquidationTerminationType;
  pending_salary: number;
  pending_salary_days: number;
  vacation_days_accrued: number;
  vacation_days_proportional: number;
  vacation_pay: number;
  xiii_month_proportional: number;
  seniority_bonus: number;
  seniority_years: number;
  notice_pay: number;
  severance_pay: number;
  severance_weeks: number;
  gross_total: number;
  css_deduction: number;
  se_deduction: number;
  isr_deduction: number;
  other_deductions: number;
  fondo_cesantia_offset: number;
  net_total: number;
  avg_salary_for_severance?: number;
  status: LiquidationStatus;
  approved_by?: string;
  approved_at?: Date | string;
  paid_date?: Date | string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  employee?: Partial<Employee>;
};

export const TERMINATION_TYPE_OPTIONS: { value: LiquidationTerminationType; label: string }[] = [
  { value: 'RENUNCIA', label: 'Renuncia Voluntaria' },
  { value: 'RENUNCIA_JUSTIFICADA', label: 'Renuncia Justificada' },
  { value: 'DESPIDO_JUSTIFICADO', label: 'Despido Justificado' },
  { value: 'DESPIDO_INJUSTIFICADO', label: 'Despido Injustificado' },
  { value: 'MUTUO_ACUERDO', label: 'Mutuo Acuerdo' },
  { value: 'VENCIMIENTO_CONTRATO', label: 'Vencimiento de Contrato' },
];

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'DEFINIDO', label: 'Definido' },
  { value: 'OBRA', label: 'Por Obra' },
];
