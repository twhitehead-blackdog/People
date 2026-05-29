/**
 * Service para el sistema de deudas de empleados (rediseño 2026-05-29).
 *
 * Reemplaza el flujo viejo de payroll-debts. Trabaja con:
 *  - employee_debts        (deudas individuales)
 *  - employee_debt_deductions (descuentos aplicados)
 *  - creditor_payments     (pagos al acreedor)
 *  - creditors             (catálogo, con código humano)
 *
 * Mantiene patrón de carga directa de PostgREST (igual que el resto de
 * People). NO usa httpResource para escrituras — solo lecturas batch.
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Creditor,
  CreditorPayment,
  CreditorPayableSummary,
  CreditorProduct,
  EmployeeDebt,
  EmployeeDebtAuditEntry,
  EmployeeDebtDeduction,
  EmployeeDebtSummary,
} from '../models';
import { ApiUrlService } from './api-url.service';
import { LoggerService } from './logger.service';
import { OrganizationService } from './organization.service';

export interface EmployeeDebtFilter {
  status?: ('active' | 'paused' | 'completed' | 'cancelled' | 'draft' | 'pending_approval' | 'rejected')[];
  employeeId?: string;
  creditorId?: string;
  year?: number;
  month?: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeDebtsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private logger = inject(LoggerService);
  private organization = inject(OrganizationService);

  // ───────── Creditors ─────────────────────────────────────────

  async listCreditors(includeInactive = false): Promise<Creditor[]> {
    const companyId = this.organization.getCurrentCompanyId();
    if (!companyId) return [];
    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select: '*',
      order: 'code.asc',
    };
    if (!includeInactive) params['is_active'] = 'eq.true';
    const url = this.apiUrl.build('rest/v1/creditors', params);
    return firstValueFrom(this.http.get<Creditor[]>(url));
  }

  async saveCreditor(c: Partial<Creditor>): Promise<Creditor> {
    const companyId = this.organization.getCurrentCompanyId();
    if (c.id) {
      const url = this.apiUrl.build('rest/v1/creditors', {
        id: `eq.${c.id}`,
      });
      const result = await firstValueFrom(
        this.http.patch<Creditor[]>(url, c, {
          headers: { Prefer: 'return=representation' },
        }),
      );
      return result?.[0] ?? (c as Creditor);
    }
    const url = this.apiUrl.build('rest/v1/creditors');
    const result = await firstValueFrom(
      this.http.post<Creditor[]>(
        url,
        { ...c, company_id: companyId },
        { headers: { Prefer: 'return=representation' } },
      ),
    );
    return result?.[0] ?? (c as Creditor);
  }

  // ───────── Creditor Products ─────────────────────────────────

  async listCreditorProducts(creditorId: string): Promise<CreditorProduct[]> {
    const url = this.apiUrl.build('rest/v1/creditor_products', {
      creditor_id: `eq.${creditorId}`,
      select: '*',
      order: 'code.asc',
    });
    return firstValueFrom(this.http.get<CreditorProduct[]>(url));
  }

  // ───────── Debts ─────────────────────────────────────────────

  /**
   * Lista deudas con joins de empleado y acreedor para mostrar en tabla.
   */
  async listDebts(filter: EmployeeDebtFilter = {}): Promise<EmployeeDebt[]> {
    const companyId = this.organization.getCurrentCompanyId();
    if (!companyId) return [];

    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select: `
        *,
        employee:employees!employee_debts_employee_id_fkey(id, first_name, father_name, employee_number, max_debt_percentage),
        creditor:creditors(id, code, name, category, is_internal),
        creditor_product:creditor_products(id, code, name)
      `.replace(/\s+/g, ''),
      order: 'employee_id.asc,debt_code.asc',
    };

    if (filter.status && filter.status.length > 0) {
      params['status'] = `in.(${filter.status.join(',')})`;
    }
    if (filter.employeeId) params['employee_id'] = `eq.${filter.employeeId}`;
    if (filter.creditorId) params['creditor_id'] = `eq.${filter.creditorId}`;

    const url = this.apiUrl.build('rest/v1/employee_debts', params);
    return firstValueFrom(this.http.get<EmployeeDebt[]>(url));
  }

  /**
   * Agrupa las deudas por empleado para vista de resumen.
   */
  async listSummaryByEmployee(filter: EmployeeDebtFilter = {}): Promise<EmployeeDebtSummary[]> {
    const debts = await this.listDebts(filter);
    const byEmployee = new Map<string, EmployeeDebtSummary>();

    for (const d of debts) {
      const empId = d.employee_id;
      if (!empId) continue;
      let bucket = byEmployee.get(empId);
      if (!bucket) {
        bucket = {
          employee: d.employee ?? { id: empId },
          max_debt_percentage:
            (d.employee as { max_debt_percentage?: number })?.max_debt_percentage ?? 100,
          debts_count: 0,
          total_opening_balance: 0,
          total_balance: 0,
          total_monthly_installment: 0,
          total_ytd_deducted: 0,
          total_current_month_deducted: 0,
          debts: [],
        };
        byEmployee.set(empId, bucket);
      }
      bucket.debts_count += 1;
      bucket.total_opening_balance += Number(d.opening_balance ?? 0);
      bucket.total_balance += Number(d.balance ?? 0);
      bucket.total_monthly_installment += Number(d.installment_amount ?? 0);
      bucket.total_ytd_deducted += Number(d.ytd_deducted ?? 0);
      bucket.total_current_month_deducted += Number(d.current_month_deducted ?? 0);
      bucket.debts.push(d);
    }

    return [...byEmployee.values()].sort((a, b) =>
      `${a.employee.first_name ?? ''} ${a.employee.father_name ?? ''}`.localeCompare(
        `${b.employee.first_name ?? ''} ${b.employee.father_name ?? ''}`,
      ),
    );
  }

  async saveDebt(debt: Partial<EmployeeDebt>): Promise<EmployeeDebt> {
    const companyId = this.organization.getCurrentCompanyId();
    if (debt.id) {
      const url = this.apiUrl.build('rest/v1/employee_debts', {
        id: `eq.${debt.id}`,
      });
      const result = await firstValueFrom(
        this.http.patch<EmployeeDebt[]>(url, debt, {
          headers: { Prefer: 'return=representation' },
        }),
      );
      return result?.[0] ?? (debt as EmployeeDebt);
    }
    const payload = {
      ...debt,
      company_id: companyId,
      balance: debt.balance ?? debt.opening_balance ?? 0,
    };
    const url = this.apiUrl.build('rest/v1/employee_debts');
    const result = await firstValueFrom(
      this.http.post<EmployeeDebt[]>(url, payload, {
        headers: { Prefer: 'return=representation' },
      }),
    );
    return result?.[0] ?? (debt as EmployeeDebt);
  }

  async deleteDebt(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/employee_debts', {
      id: `eq.${id}`,
    });
    await firstValueFrom(this.http.delete(url));
  }

  /**
   * Calcula el siguiente debt_code para un empleado (01, 02, 03...) dentro
   * de un acreedor. Si el empleado ya tiene 2 deudas con este acreedor con
   * códigos 01 y 02, retorna '03'.
   */
  async getNextDebtCode(employeeId: string, creditorId: string): Promise<string> {
    const url = this.apiUrl.build('rest/v1/employee_debts', {
      employee_id: `eq.${employeeId}`,
      creditor_id: `eq.${creditorId}`,
      select: 'debt_code',
    });
    const existing = await firstValueFrom(this.http.get<{ debt_code: string }[]>(url));
    const nums = existing
      .map((d) => parseInt(d.debt_code, 10))
      .filter((n) => !isNaN(n));
    const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
    return next.toString().padStart(2, '0');
  }

  // ───────── Deductions / History ──────────────────────────────

  async listDeductions(debtId: string): Promise<EmployeeDebtDeduction[]> {
    const url = this.apiUrl.build('rest/v1/employee_debt_deductions', {
      debt_id: `eq.${debtId}`,
      select: '*',
      order: 'deduction_date.desc',
    });
    return firstValueFrom(this.http.get<EmployeeDebtDeduction[]>(url));
  }

  // ───────── Audit ─────────────────────────────────────────────

  async listAudit(debtId: string): Promise<EmployeeDebtAuditEntry[]> {
    const url = this.apiUrl.build('rest/v1/employee_debts_audit', {
      debt_id: `eq.${debtId}`,
      select: '*',
      order: 'changed_at.desc',
    });
    return firstValueFrom(this.http.get<EmployeeDebtAuditEntry[]>(url));
  }

  // ───────── Creditor Payments (transferencias al acreedor) ────

  async listCreditorPayments(year?: number, month?: number): Promise<CreditorPayment[]> {
    const companyId = this.organization.getCurrentCompanyId();
    if (!companyId) return [];

    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select: '*, creditor:creditors(id, code, name)',
      order: 'period_year.desc,period_month.desc',
    };
    if (year) params['period_year'] = `eq.${year}`;
    if (month) params['period_month'] = `eq.${month}`;

    const url = this.apiUrl.build('rest/v1/creditor_payments', params);
    return firstValueFrom(this.http.get<CreditorPayment[]>(url));
  }

  /**
   * Resumen "a pagar este mes" agrupado por acreedor.
   * Toma todas las deducciones del mes que no estén vinculadas aún a un
   * creditor_payment.
   */
  async listPayables(year: number, month: number): Promise<CreditorPayableSummary[]> {
    const debts = await this.listDebts({ status: ['active', 'paused', 'completed'] });
    const byCreditor = new Map<string, CreditorPayableSummary>();

    for (const d of debts) {
      if (!d.creditor || !d.current_month_deducted || d.current_month_deducted <= 0) continue;
      const cid = d.creditor.id;
      let bucket = byCreditor.get(cid);
      if (!bucket) {
        bucket = {
          creditor: d.creditor,
          employees_count: 0,
          total_to_pay: 0,
          details: [],
        };
        byCreditor.set(cid, bucket);
      }
      bucket.total_to_pay += Number(d.current_month_deducted);
      bucket.details.push({
        employee_id: d.employee_id,
        employee_name: `${d.employee?.first_name ?? ''} ${d.employee?.father_name ?? ''}`.trim(),
        amount: Number(d.current_month_deducted),
        debt_id: d.id,
        debt_code: d.debt_code,
      });
    }

    // Contar empleados únicos
    for (const bucket of byCreditor.values()) {
      bucket.employees_count = new Set(bucket.details.map((d) => d.employee_id)).size;
    }

    return [...byCreditor.values()].sort(
      (a, b) => b.total_to_pay - a.total_to_pay,
    );
  }

  // ───────── Bulk apply: aplicar cuotas del mes ────────────────

  /**
   * Marca el descuento del mes en `employee_debt_deductions` para una deuda.
   * El trigger de la DB recalcula balance + ytd_deducted automáticamente.
   */
  async recordDeduction(params: {
    debtId: string;
    amount: number;
    deductionDate?: string;
    expectedAmount?: number;
    wasCapped?: boolean;
    notes?: string;
    payrollPaymentId?: string;
  }): Promise<EmployeeDebtDeduction> {
    const url = this.apiUrl.build('rest/v1/employee_debt_deductions');
    const payload = {
      debt_id: params.debtId,
      amount: params.amount,
      deduction_date: params.deductionDate ?? new Date().toISOString().slice(0, 10),
      expected_amount: params.expectedAmount,
      was_capped: params.wasCapped ?? false,
      notes: params.notes,
      payroll_payment_id: params.payrollPaymentId,
    };
    const result = await firstValueFrom(
      this.http.post<EmployeeDebtDeduction[]>(url, payload, {
        headers: { Prefer: 'return=representation' },
      }),
    );
    return result?.[0] ?? (payload as EmployeeDebtDeduction);
  }
}
