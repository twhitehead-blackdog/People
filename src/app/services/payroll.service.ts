import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { format } from 'date-fns';
import { v4 } from 'uuid';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';
import {
  PayrollPayment,
  PayrollPaymentEmployee,
  PayrollPaymentEmployeeItem,
  PayrollEmployee,
  PayrollDeduction,
  PayrollDebt,
  PayrollSettings,
  PayrollHoliday,
  AttendanceSheet,
  OvertimePolicy,
} from '../models';
import {
  calculatePeriodDates,
  calculateEmployeePayroll,
  biweeklySalary,
  type PeriodDates,
  type DeductionRule,
  type AttendanceSummary,
  type DebtForPeriod,
  type EmployeePayrollResult,
} from '../utils/payroll-calculation.utils';
import { roundNumber } from './util.service';

// ============================================
// TIPOS
// ============================================

export interface PayrollCalculationResult {
  employee_id: string;
  employee_name: string;
  branch_id?: string;
  department_id?: string;
  payroll_type: 'regular' | 'honorarios';
  calculation: EmployeePayrollResult;
}

export interface BatchCalculationResult {
  period: PayrollPayment;
  results: PayrollCalculationResult[];
  totals: {
    total_income: number;
    total_deductions: number;
    total_debts: number;
    total_net: number;
    total_employer_cost: number;
    employee_count: number;
  };
}

// ============================================
// SERVICE
// ============================================

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  // ============================================
  // SETTINGS
  // ============================================

  async getSettings(): Promise<PayrollSettings | null> {
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return null;

    const url = this.apiUrl.build('rest/v1/payroll_settings', {
      company_id: `eq.${companyId}`,
      limit: 1,
    });

    const res = await firstValueFrom(this.http.get<PayrollSettings[]>(url));
    return res?.[0] ?? null;
  }

  async saveSettings(settings: Partial<PayrollSettings>): Promise<PayrollSettings> {
    const companyId = this.org.getCurrentCompanyId();
    const payload = { ...settings, company_id: companyId };

    if (settings.id) {
      const url = this.apiUrl.build('rest/v1/payroll_settings', {
        id: `eq.${settings.id}`,
        select: '*',
      });
      const res = await firstValueFrom(
        this.http.patch<PayrollSettings[]>(url, payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      return res[0];
    }

    const url = this.apiUrl.build('rest/v1/payroll_settings', { select: '*' });
    const res = await firstValueFrom(
      this.http.post<PayrollSettings[]>(url, { ...payload, id: v4() }, {
        headers: { Prefer: 'return=representation' },
      })
    );
    return res[0];
  }

  // ============================================
  // HOLIDAYS
  // ============================================

  async getHolidays(year?: number): Promise<PayrollHoliday[]> {
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return [];

    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      order: 'date.asc',
    };

    if (year) {
      params['or'] = `(is_recurring.eq.true,and(date.gte.${year}-01-01,date.lte.${year}-12-31))`;
    }

    const url = this.apiUrl.build('rest/v1/payroll_holidays', params);
    return firstValueFrom(this.http.get<PayrollHoliday[]>(url));
  }

  // ============================================
  // PERÍODO - GENERACIÓN
  // ============================================

  /**
   * Genera un nuevo período de planilla (quincena).
   * Valida que no exista un período duplicado.
   */
  async generatePeriod(
    payrollId: string,
    year: number,
    month: number,
    periodNumber: 1 | 2
  ): Promise<PayrollPayment> {
    // Validar que no exista un período duplicado
    await this.validateNoDuplicatePeriod(payrollId, year, month, periodNumber);

    const settings = await this.getSettings();
    const cutOff1 = settings?.cut_off_day_1 ?? 10;
    const cutOff2 = settings?.cut_off_day_2 ?? 25;
    const payDay1 = settings?.payment_day_1 ?? 15;
    const payDay2 = settings?.payment_day_2 ?? 30;
    const adjustSunday = settings?.adjust_payment_on_sunday ?? true;

    const dates = calculatePeriodDates(year, month, periodNumber, cutOff1, cutOff2, payDay1, payDay2, adjustSunday);

    const payment: Partial<PayrollPayment> = {
      id: v4(),
      title: dates.title,
      payroll_id: payrollId,
      start_date: dates.start_date,
      end_date: dates.end_date,
      payment_date: dates.payment_date,
      period_number: dates.period_number,
      month: dates.month,
      year: dates.year,
      status: 'DRAFT',
    };

    const url = this.apiUrl.build('rest/v1/payroll_payments', { select: '*' });
    const res = await firstValueFrom(
      this.http.post<PayrollPayment[]>(url, payment, {
        headers: { Prefer: 'return=representation' },
      })
    );
    return res[0];
  }

  // ============================================
  // CÁLCULO MASIVO DE PLANILLA
  // ============================================

  /**
   * Calcula la planilla completa para todos los empleados de un período.
   * No guarda nada en DB - retorna los resultados para revisión.
   */
  async calculatePayroll(
    payrollId: string,
    paymentId: string
  ): Promise<BatchCalculationResult> {
    // 1. Obtener período
    const period = await this.getPeriod(paymentId);
    if (!period) throw new Error('Período no encontrado');

    // 2. Obtener datos en paralelo
    const [employees, deductions, holidays, settings] = await Promise.all([
      this.getPayrollEmployees(payrollId),
      this.getDeductionRules(payrollId),
      this.getHolidays(period.year ?? new Date().getFullYear()),
      this.getSettings(),
    ]);

    const periodsPerYear = settings?.periods_per_year ?? 24;
    const overtimePolicy: OvertimePolicy = settings?.overtime_policy ?? 'comp_time';

    // 3. Convertir deducciones al formato del motor de cálculo
    const deductionRules: DeductionRule[] = deductions.map(d => ({
      name: d.name,
      value: d.value,
      min_salary: d.min_salary,
      income_tax: d.income_tax ?? false,
      calculation_type: d.calculation_type,
      applies_to: d.applies_to ?? 'regular',
      is_employer_portion: d.is_employer_portion ?? false,
      employer_value: d.employer_value ?? 0,
    }));

    // 4. Calcular para cada empleado
    const results: PayrollCalculationResult[] = [];
    const startDate = format(period.start_date, 'yyyy-MM-dd');
    const endDate = format(period.end_date, 'yyyy-MM-dd');

    for (const emp of employees) {
      // Obtener attendance sheets y deudas del empleado
      const [sheets, debts] = await Promise.all([
        this.getAttendanceSheets(emp.employee_id, startDate, endDate),
        this.getActiveDebts(payrollId, emp.employee_id),
      ]);

      // Sumarizar asistencia (respeta política de horas extras)
      const attendance = this.summarizeAttendance(sheets, overtimePolicy);

      // Preparar deudas (incluir tipo y % embargo para limitar judiciales)
      const debtsForPeriod: DebtForPeriod[] = debts.map(d => ({
        id: d.id,
        description: d.description,
        installment_amount: d.installment_amount ?? d.amount,
        balance: d.balance,
        debt_type: d.debt_type,
        embargo_max_percentage: d.embargo_max_percentage,
      }));

      // Calcular
      const calculation = calculateEmployeePayroll(
        {
          monthly_salary: emp.monthly_salary,
          payroll_type: (emp.employee?.payroll_type as 'regular' | 'honorarios') ?? 'regular',
          branch_id: emp.employee?.branch_id ?? undefined,
          department_id: emp.employee?.department_id,
        },
        attendance,
        deductionRules,
        debtsForPeriod,
        0,
        periodsPerYear
      );

      results.push({
        employee_id: emp.employee_id,
        employee_name: `${emp.employee?.first_name ?? ''} ${emp.employee?.father_name ?? ''}`.trim(),
        branch_id: emp.employee?.branch_id ?? undefined,
        department_id: emp.employee?.department_id,
        payroll_type: (emp.employee?.payroll_type as 'regular' | 'honorarios') ?? 'regular',
        calculation,
      });
    }

    // 5. Totales
    const totals = {
      total_income: round(results.reduce((s, r) => s + r.calculation.income_amount, 0)),
      total_deductions: round(results.reduce((s, r) => s + r.calculation.deduction_amount, 0)),
      total_debts: round(results.reduce((s, r) => s + r.calculation.total_debt, 0)),
      total_net: round(results.reduce((s, r) => s + r.calculation.net_pay, 0)),
      total_employer_cost: round(results.reduce((s, r) => s + r.calculation.employer_cost, 0)),
      employee_count: results.length,
    };

    return { period, results, totals };
  }

  /**
   * Guarda los resultados de un cálculo en la base de datos.
   * Cambia el status del período a CALCULATED.
   */
  async saveCalculation(
    paymentId: string,
    results: PayrollCalculationResult[]
  ): Promise<void> {
    // 1. Eliminar cálculos previos del período
    await this.clearPreviousCalculation(paymentId);

    // 2. Guardar cada empleado
    for (const result of results) {
      const paymentEmployeeId = v4();

      // Crear registro del empleado en el período
      const paymentEmployee: Partial<PayrollPaymentEmployee> = {
        id: paymentEmployeeId,
        payroll_payment_id: paymentId,
        payroll_id: result.calculation.base_salary > 0 ? undefined : undefined, // Se obtiene del período
        employee_id: result.employee_id,
        branch_id: result.branch_id,
        department_id: result.department_id,
        payroll_type: result.payroll_type,
        income_amount: result.calculation.income_amount,
        deduction_amount: result.calculation.deduction_amount,
        debt_amount: result.calculation.total_debt,
        late_amount: result.calculation.late_amount,
        absence_amount: result.calculation.absence_amount,
        overtime_amount: result.calculation.overtime_amount,
        sunday_amount: result.calculation.sunday_amount,
        holiday_amount: result.calculation.holiday_amount,
        employer_cost: result.calculation.employer_cost,
        total_amount: result.calculation.net_pay,
      };

      // Obtener payroll_id del período
      const period = await this.getPeriod(paymentId);
      if (period) {
        paymentEmployee.payroll_id = period.payroll_id;
      }

      const empUrl = this.apiUrl.build('rest/v1/payroll_payment_employees', { select: 'id' });
      await firstValueFrom(
        this.http.post(empUrl, paymentEmployee, {
          headers: { Prefer: 'return=representation' },
        })
      );

      // Crear items de detalle
      const items: Partial<PayrollPaymentEmployeeItem>[] = [];

      // Ingresos
      items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.base_salary, description: 'Salario base' });
      if (result.calculation.sunday_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.sunday_amount, description: 'Recargo domingo' });
      }
      if (result.calculation.holiday_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.holiday_amount, description: 'Recargo feriado' });
      }
      if (result.calculation.overtime_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.overtime_amount, description: 'Horas extras' });
      }
      if (result.calculation.compensatory_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.compensatory_amount, description: 'Horas justificadas' });
      }
      if (result.calculation.other_income > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'income', amount: result.calculation.other_income, description: 'Otros ingresos' });
      }

      // Deducciones legales
      for (const [name, amount] of Object.entries(result.calculation.deductions)) {
        if (amount > 0) {
          items.push({ payment_employee_id: paymentEmployeeId, type: 'deduction', amount, description: name });
        }
      }

      // Tardanzas y ausencias como deducción
      if (result.calculation.late_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'deduction', amount: result.calculation.late_amount, description: 'Tardanzas' });
      }
      if (result.calculation.absence_amount > 0) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'deduction', amount: result.calculation.absence_amount, description: 'Ausencias' });
      }

      // Préstamos
      for (const debt of result.calculation.debts) {
        items.push({ payment_employee_id: paymentEmployeeId, type: 'debt', amount: debt.amount, description: debt.description });
      }

      if (items.length > 0) {
        const itemsUrl = this.apiUrl.build('rest/v1/payroll_payment_employee_items');
        await firstValueFrom(this.http.post(itemsUrl, items));
      }

      // Registrar pagos de deuda y actualizar saldo
      for (const debt of result.calculation.debts) {
        // Registrar el pago
        const debtPaymentUrl = this.apiUrl.build('rest/v1/payroll_debt_payments');
        await firstValueFrom(
          this.http.post(debtPaymentUrl, {
            id: v4(),
            debt_id: debt.id,
            payroll_payment_id: paymentId,
            payment_employee_id: paymentEmployeeId,
            amount: debt.amount,
            payment_date: format(new Date(), 'yyyy-MM-dd'),
          })
        );

        // Actualizar balance y cuotas pagadas de la deuda
        await this.updateDebtBalance(debt.id, debt.amount);
      }
    }

    // 3. Actualizar status del período
    await this.updatePeriodStatus(paymentId, 'CALCULATED');
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async updatePeriodStatus(
    paymentId: string,
    status: 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PAID'
  ): Promise<void> {
    const payload: Record<string, unknown> = { status };

    if (status === 'CALCULATED') {
      payload['calculated_at'] = new Date().toISOString();
    }
    if (status === 'APPROVED') {
      payload['approved_at'] = new Date().toISOString();
    }

    const url = this.apiUrl.build('rest/v1/payroll_payments', {
      id: `eq.${paymentId}`,
    });
    await firstValueFrom(this.http.patch(url, payload));
  }

  // ============================================
  // HELPERS PRIVADOS - DATA ACCESS
  // ============================================

  /**
   * Valida que no exista un período duplicado para la misma planilla/año/mes/quincena.
   */
  private async validateNoDuplicatePeriod(
    payrollId: string,
    year: number,
    month: number,
    periodNumber: 1 | 2
  ): Promise<void> {
    const url = this.apiUrl.build('rest/v1/payroll_payments', {
      payroll_id: `eq.${payrollId}`,
      year: `eq.${year}`,
      month: `eq.${month}`,
      period_number: `eq.${periodNumber}`,
      select: 'id',
      limit: 1,
    });
    const existing = await firstValueFrom(this.http.get<any[]>(url));
    if (existing.length > 0) {
      const ordinal = periodNumber === 1 ? 'Primera' : 'Segunda';
      throw new Error(`Ya existe el periodo "${ordinal} quincena" de mes ${month}/${year} para esta planilla`);
    }
  }

  private async getPeriod(paymentId: string): Promise<PayrollPayment | null> {
    const url = this.apiUrl.build('rest/v1/payroll_payments', {
      id: `eq.${paymentId}`,
      select: '*, payroll:payrolls(*)',
      limit: 1,
    });
    const res = await firstValueFrom(this.http.get<PayrollPayment[]>(url));
    return res?.[0] ?? null;
  }

  private async getPayrollEmployees(payrollId: string): Promise<PayrollEmployee[]> {
    const url = this.apiUrl.build('rest/v1/employee_payrolls', {
      payroll_id: `eq.${payrollId}`,
      select: '*, employee:employees!employee_payrolls_employee_id_fkey!inner(id, first_name, father_name, branch_id, department_id, payroll_type, is_active)',
      'employee.is_active': 'eq.true',
    });
    return firstValueFrom(this.http.get<PayrollEmployee[]>(url));
  }

  private async getDeductionRules(payrollId: string): Promise<PayrollDeduction[]> {
    const url = this.apiUrl.build('rest/v1/payroll_deductions', {
      payroll_id: `eq.${payrollId}`,
      select: '*',
    });
    return firstValueFrom(this.http.get<PayrollDeduction[]>(url));
  }

  private async getActiveDebts(payrollId: string, employeeId: string): Promise<PayrollDebt[]> {
    const url = this.apiUrl.build('rest/v1/payroll_debts', {
      payroll_id: `eq.${payrollId}`,
      employee_id: `eq.${employeeId}`,
      status: 'eq.active',
      select: '*',
    });
    return firstValueFrom(this.http.get<PayrollDebt[]>(url));
  }

  private async getAttendanceSheets(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceSheet[]> {
    const url = this.apiUrl.build('rest/v1/attendance_sheets', {
      employee_id: `eq.${employeeId}`,
      date: `gte.${startDate}`,
      select: '*',
    });
    // Agregar filtro end_date manualmente (clave duplicada en PostgREST)
    const fullUrl = url + `&date=lte.${endDate}`;
    return firstValueFrom(this.http.get<AttendanceSheet[]>(fullUrl));
  }

  private async clearPreviousCalculation(paymentId: string): Promise<void> {
    // Primero revertir los pagos de deuda del cálculo anterior
    await this.revertDebtPayments(paymentId);

    // Eliminar registros previos (CASCADE eliminará los items)
    const url = this.apiUrl.build('rest/v1/payroll_payment_employees', {
      payroll_payment_id: `eq.${paymentId}`,
    });
    await firstValueFrom(this.http.delete(url));
  }

  /**
   * Revierte los pagos de deuda de un período (cuando se recalcula).
   * Restaura el balance de cada deuda y elimina los registros de pago.
   */
  private async revertDebtPayments(paymentId: string): Promise<void> {
    // Obtener pagos existentes del período
    const paymentsUrl = this.apiUrl.build('rest/v1/payroll_debt_payments', {
      payroll_payment_id: `eq.${paymentId}`,
      select: 'id,debt_id,amount',
    });
    const existingPayments = await firstValueFrom(
      this.http.get<Array<{ id: string; debt_id: string; amount: number }>>(paymentsUrl)
    );

    // Revertir cada pago (restaurar balance)
    for (const payment of existingPayments) {
      await this.updateDebtBalance(payment.debt_id, -payment.amount);
    }

    // Eliminar los registros de pago
    if (existingPayments.length > 0) {
      const deleteUrl = this.apiUrl.build('rest/v1/payroll_debt_payments', {
        payroll_payment_id: `eq.${paymentId}`,
      });
      await firstValueFrom(this.http.delete(deleteUrl));
    }
  }

  /**
   * Actualiza el balance de una deuda restando el monto pagado.
   * Si el balance llega a 0, marca la deuda como completada.
   */
  private async updateDebtBalance(debtId: string, amountPaid: number): Promise<void> {
    // Obtener deuda actual
    const debtUrl = this.apiUrl.build('rest/v1/payroll_debts', {
      id: `eq.${debtId}`,
      select: 'id,balance,paid_installments,total_installments,status',
    });
    const debts = await firstValueFrom(
      this.http.get<Array<{ id: string; balance: number; paid_installments: number; total_installments: number; status: string }>>(debtUrl)
    );
    if (!debts.length) return;

    const debt = debts[0];
    const newBalance = round(Math.max(0, debt.balance - amountPaid));
    const newPaidInstallments = (debt.paid_installments ?? 0) + (amountPaid > 0 ? 1 : -1);

    const updatePayload: Record<string, unknown> = {
      balance: newBalance,
      paid_installments: Math.max(0, newPaidInstallments),
    };

    // Si el balance llega a 0, marcar como completada
    if (newBalance <= 0 && amountPaid > 0) {
      updatePayload['status'] = 'completed';
    }
    // Si se revierte y estaba completada, reactivar
    if (amountPaid < 0 && debt.status === 'completed') {
      updatePayload['status'] = 'active';
    }

    const updateUrl = this.apiUrl.build('rest/v1/payroll_debts', {
      id: `eq.${debtId}`,
    });
    await firstValueFrom(this.http.patch(updateUrl, updatePayload));
  }

  // ============================================
  // HELPERS - ATTENDANCE SUMMARY
  // ============================================

  private summarizeAttendance(sheets: AttendanceSheet[], overtimePolicy: OvertimePolicy = 'comp_time'): AttendanceSummary {
    return sheets.reduce<AttendanceSummary>(
      (acc, s) => {
        // Calcular pago de horas extras solo si la política es 'paid'
        let overtimePayment = 0;
        if (overtimePolicy === 'paid' && (s.overtime_hours ?? 0) > 0) {
          // Tarifa por hora = salario mensual / 208, recargo 25% (Art. 33 CT Panamá)
          const hourlyRate = (s.base_salary ?? 0) / 208;
          overtimePayment = round((s.overtime_hours ?? 0) * hourlyRate * 1.25);
        }

        return {
          worked_hours_payment: acc.worked_hours_payment + (s.worked_hours_payment ?? 0),
          sunday_payment: acc.sunday_payment + (s.sunday_payment ?? 0),
          holiday_payment: acc.holiday_payment + (s.holiday_payment ?? 0),
          overtime_payment: acc.overtime_payment + overtimePayment,
          late_hours_payment: acc.late_hours_payment + (s.late_hours_payment ?? 0),
          absence_hours_payment: acc.absence_hours_payment + (s.absence_hours_payment ?? 0),
          compensatory_hours_payment: acc.compensatory_hours_payment + (s.compensatory_hours_payment ?? 0),
        };
      },
      {
        worked_hours_payment: 0,
        sunday_payment: 0,
        holiday_payment: 0,
        overtime_payment: 0,
        late_hours_payment: 0,
        absence_hours_payment: 0,
        compensatory_hours_payment: 0,
      }
    );
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
