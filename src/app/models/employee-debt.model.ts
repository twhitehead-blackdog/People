/**
 * Modelos del sistema de deudas de empleados (rediseñado 2026-05-29).
 *
 * Reemplaza el modelo viejo `PayrollDebt` que estaba en payroll.model.ts.
 * Estructura inspirada en el reporte oficial de BO Capital, S.A.
 */
import type { Employee } from './employee.model';

// ============================================================
// CREDITOR (acreedor)
// ============================================================

export type CreditorCategory =
  | 'bank'
  | 'finance'
  | 'company'
  | 'court'
  | 'cooperative'
  | 'store'
  | 'insurance'
  | 'other';

export interface Creditor {
  id: string;
  company_id: string;
  code: string;                    // '012', 'BG', 'BGAC', etc.
  name: string;                    // 'BANCO GENERAL'
  category?: CreditorCategory;

  // Contacto
  document_id?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;

  // Pago al acreedor
  bank_name?: string;
  bank_account?: string;
  bank_account_type?: string;

  is_internal?: boolean;           // true = BO Capital (la empresa misma)
  is_active?: boolean;

  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// CREDITOR PRODUCT (sub-productos dentro de un acreedor)
// ============================================================

export interface CreditorProduct {
  id: string;
  creditor_id: string;
  code: string;                    // 'BGAC', 'BGM', 'BGDC'
  name: string;
  notes?: string;
  created_at?: string;
}

// ============================================================
// EMPLOYEE DEBT (deuda principal)
// ============================================================

export type DebtType =
  | 'company_loan'
  | 'bank_loan'
  | 'finance'
  | 'court'
  | 'store'
  | 'cooperative'
  | 'insurance'
  | 'other';

export type DebtStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type DeductionMode = 'fixed' | 'max_percentage';

export type InstallmentFrequency = 'biweekly' | 'monthly' | 'weekly';

export interface EmployeeDebt {
  id: string;
  company_id: string;
  employee_id: string;
  creditor_id?: string;
  creditor_product_id?: string;

  // Identificación
  debt_code: string;               // '01', '02', '03'
  account_reference?: string;
  description?: string;

  // Tipo y estado
  debt_type?: DebtType;
  status: DebtStatus;

  // Modo de aplicación
  deduction_mode: DeductionMode;
  max_percentage?: number;

  // Montos
  original_amount?: number;
  opening_balance: number;
  balance: number;
  interest_rate?: number;

  // Cuota
  installment_amount?: number;
  installment_frequency: InstallmentFrequency;
  extra_fixed_deduction?: number;
  total_installments?: number;
  paid_installments?: number;

  // Tracking cached
  ytd_deducted: number;
  current_month_deducted: number;
  ytd_paid_to_creditor: number;
  current_month_paid_to_creditor: number;

  // Workflow
  start_date?: string;
  due_date?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_reason?: string;

  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;

  // Joined data
  employee?: Partial<Employee>;
  creditor?: Creditor;
  creditor_product?: CreditorProduct;
}

// ============================================================
// EMPLOYEE DEBT DEDUCTION (cada descuento aplicado)
// ============================================================

export interface EmployeeDebtDeduction {
  id: string;
  debt_id: string;
  payroll_payment_id?: string;
  payment_employee_id?: string;

  amount: number;
  deduction_date: string;

  // Ajustes
  expected_amount?: number;
  was_capped?: boolean;
  cap_reason?: string;

  // Reversibilidad
  reverted_at?: string;
  reverted_by?: string;
  reverted_reason?: string;

  notes?: string;
  created_at?: string;
  created_by?: string;
}

// ============================================================
// CREDITOR PAYMENT (pago consolidado al acreedor externo)
// ============================================================

export type CreditorPaymentStatus =
  | 'pending'
  | 'sent'
  | 'confirmed'
  | 'reconciled'
  | 'cancelled';

export interface CreditorPayment {
  id: string;
  company_id: string;
  creditor_id: string;

  period_year?: number;
  period_month?: number;
  period_label?: string;

  total_amount: number;
  status: CreditorPaymentStatus;

  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
  receipt_url?: string;

  notes?: string;
  created_at?: string;
  created_by?: string;

  // Joined
  creditor?: Creditor;
  details?: CreditorPaymentDetail[];
}

export interface CreditorPaymentDetail {
  id: string;
  creditor_payment_id: string;
  employee_debt_deduction_id: string;
  amount: number;
  created_at?: string;

  // Joined
  deduction?: EmployeeDebtDeduction;
}

// ============================================================
// AUDIT LOG
// ============================================================

export interface EmployeeDebtAuditEntry {
  id: string;
  debt_id: string;
  changed_at: string;
  changed_by?: string;
  action: 'create' | 'update' | 'status_change' | 'balance_adjust' | 'revert';
  field?: string;
  old_value?: unknown;
  new_value?: unknown;
  reason?: string;
}

// ============================================================
// AGGREGATES / DERIVED
// ============================================================

/** Totales agregados por empleado para vista de resumen. */
export interface EmployeeDebtSummary {
  employee: Partial<Employee>;
  max_debt_percentage: number;
  debts_count: number;
  total_opening_balance: number;
  total_balance: number;
  total_monthly_installment: number;
  total_ytd_deducted: number;
  total_current_month_deducted: number;
  debts: EmployeeDebt[];
}

/** Totales agregados por acreedor para "pagos a enviar". */
export interface CreditorPayableSummary {
  creditor: Creditor;
  employees_count: number;
  total_to_pay: number;
  details: Array<{
    employee_id: string;
    employee_name: string;
    amount: number;
    debt_id: string;
    debt_code: string;
  }>;
}
