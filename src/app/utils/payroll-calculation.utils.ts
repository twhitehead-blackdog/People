/**
 * Payroll Calculation Utils - Funciones puras para cálculo de planilla de Panamá
 *
 * Reglas de negocio:
 * - Planilla quincenal con cortes configurables (default: 10 y 25)
 * - Empleados "regular": CSS Obrero 9.75%, Seguro Educativo 1.25%, ISR progresivo
 * - Empleados "honorarios": sin deducciones legales (ellos pagan su propio ISR)
 * - ISR se calcula sobre ingreso neto (después de CSS y SE)
 * - Proyección anual incluye XIII mes (salario mensual × 13)
 */

import {
  addDays,
  subDays,
  isSunday,
  lastDayOfMonth,
  setDate,
  getDay,
  isSameDay,
  format,
} from 'date-fns';
import { toDate } from 'date-fns-tz';

const TZ = 'America/Panama';

// ============================================
// TIPOS INTERNOS
// ============================================

export interface PeriodDates {
  start_date: Date;
  end_date: Date;
  payment_date: Date;
  period_number: 1 | 2;
  month: number;
  year: number;
  title: string;
}

export interface PayrollCalcInput {
  monthly_salary: number;
  payroll_type: 'regular' | 'honorarios';
  branch_id?: string;
  department_id?: string;
}

export interface AttendanceSummary {
  worked_hours_payment: number;
  sunday_payment: number;
  holiday_payment: number;
  overtime_payment: number;
  late_hours_payment: number;
  absence_hours_payment: number;
  compensatory_hours_payment: number;
}

export interface DeductionRule {
  name: string;
  value: number;
  min_salary: number;
  income_tax: boolean;
  calculation_type: 'fixed' | 'percentage';
  applies_to: 'regular' | 'honorarios' | 'all';
  is_employer_portion: boolean;
  employer_value: number;
}

export interface DebtForPeriod {
  id: string;
  description: string;
  installment_amount: number;
  balance: number;
  debt_type?: string;
  embargo_max_percentage?: number;
}

export interface EmployeePayrollResult {
  // Ingresos
  base_salary: number;
  sunday_amount: number;
  holiday_amount: number;
  overtime_amount: number;
  compensatory_amount: number;
  other_income: number;
  gross_income: number;
  // Deducciones legales
  deductions: Record<string, number>;
  total_deductions: number;
  // Penalidades
  late_amount: number;
  absence_amount: number;
  // Préstamos
  debts: Array<{ id: string; description: string; amount: number }>;
  total_debt: number;
  // Totales
  income_amount: number;
  deduction_amount: number;
  net_pay: number;
  // Cuota patronal (para Odoo fase 2)
  employer_cost: number;
  employer_breakdown: Record<string, number>;
}

// ============================================
// SALARIOS
// ============================================

/** Salario quincenal = mensual / 2 */
export function biweeklySalary(monthlySalary: number): number {
  return round(monthlySalary / 2);
}

/** Salario por hora = mensual / horas mensuales (default 208) */
export function hourlySalary(monthlySalary: number, monthlyHours = 208): number {
  if (monthlyHours === 0) return 0;
  return round(monthlySalary / monthlyHours);
}

// ============================================
// ISR - IMPUESTO SOBRE LA RENTA (PANAMÁ)
// ============================================

/**
 * Calcula el ISR quincenal usando las tablas progresivas de Panamá.
 *
 * Método:
 * 1. Proyectar ingreso anual incluyendo XIII mes (× 13 meses)
 * 2. Restar CSS y SE del ingreso bruto anual → ingreso gravable
 * 3. Aplicar tabla progresiva:
 *    - $0 - $11,000: exento
 *    - $11,001 - $50,000: 15%
 *    - $50,001+: 25%
 * 4. Dividir ISR anual entre 24 quincenas
 */
export function calculateISR(
  biweeklyGross: number,
  cssRate = 0.0975,
  seRate = 0.0125,
  periodsPerYear = 24
): number {
  if (biweeklyGross <= 0) return 0;

  // Proyectar a anual: XIII mes exento de ISR (Art. 168 CT + Art. 761 CF)
  const monthlyGross = biweeklyGross * 2;
  const annualGross = monthlyGross * 12;

  // Deducir CSS y SE del ingreso bruto anual
  const annualCSS = annualGross * cssRate;
  const annualSE = annualGross * seRate;
  const annualTaxable = annualGross - annualCSS - annualSE;

  if (annualTaxable <= 11000) return 0;

  let annualISR = 0;

  if (annualTaxable > 50000) {
    // Tramo 1: $11,001 - $50,000 al 15%
    annualISR += (50000 - 11000) * 0.15;
    // Tramo 2: exceso de $50,000 al 25%
    annualISR += (annualTaxable - 50000) * 0.25;
  } else {
    // Solo tramo 1: $11,001 - $50,000 al 15%
    annualISR += (annualTaxable - 11000) * 0.15;
  }

  // Distribuir entre quincenas
  return round(annualISR / periodsPerYear);
}

// ============================================
// DEDUCCIONES
// ============================================

/**
 * Calcula todas las deducciones del empleado para un período.
 * - Si es "honorarios": no aplica ninguna deducción legal
 * - Si es "regular": aplica CSS, SE, ISR según las reglas configuradas
 */
export function calculateDeductions(
  grossIncome: number,
  monthlySalary: number,
  deductionRules: DeductionRule[],
  payrollType: 'regular' | 'honorarios',
  periodsPerYear = 24
): { employee: Record<string, number>; employer: Record<string, number> } {
  const employee: Record<string, number> = {};
  const employer: Record<string, number> = {};

  if (payrollType === 'honorarios') {
    return { employee, employer };
  }

  // Separar reglas de empleado y patronal
  const employeeRules = deductionRules.filter(
    r => !r.is_employer_portion && (r.applies_to === payrollType || r.applies_to === 'all')
  );
  const employerRules = deductionRules.filter(
    r => r.is_employer_portion && (r.applies_to === payrollType || r.applies_to === 'all')
  );

  // Encontrar tasas de CSS y SE para cálculo de ISR
  let cssRate = 0;
  let seRate = 0;

  for (const rule of employeeRules) {
    if (rule.income_tax) continue; // ISR se calcula aparte

    if (rule.calculation_type === 'percentage') {
      const amount = round(grossIncome * (rule.value / 100));
      employee[rule.name] = amount;

      // Identificar CSS y SE por nombre para ISR
      if (rule.name.toLowerCase().includes('social') || rule.name.toLowerCase().includes('css')) {
        cssRate = rule.value / 100;
      }
      if (rule.name.toLowerCase().includes('educativo')) {
        seRate = rule.value / 100;
      }
    } else {
      // Fijo: verificar salario mínimo
      if (monthlySalary >= rule.min_salary) {
        employee[rule.name] = round(rule.value);
      }
    }
  }

  // Calcular ISR si hay regla de income_tax
  const isrRule = employeeRules.find(r => r.income_tax);
  if (isrRule) {
    const isrAmount = calculateISR(grossIncome, cssRate, seRate, periodsPerYear);
    if (isrAmount > 0) {
      employee[isrRule.name] = isrAmount;
    }
  }

  // Cuota patronal
  for (const rule of employerRules) {
    if (rule.calculation_type === 'percentage') {
      employer[rule.name] = round(grossIncome * (rule.employer_value / 100));
    } else {
      employer[rule.name] = round(rule.employer_value);
    }
  }

  return { employee, employer };
}

// ============================================
// PRÉSTAMOS / DEUDAS
// ============================================

/**
 * Calcula las deducciones por préstamos activos para el período.
 * Embargos judiciales se limitan al % máximo del salario neto configurado.
 * netPayBeforeDebts: ingreso bruto - deducciones legales - ausencias (para limitar embargos)
 */
export function calculateDebtDeductions(
  debts: DebtForPeriod[],
  netPayBeforeDebts = 0
): Array<{ id: string; description: string; amount: number }> {
  const results: Array<{ id: string; description: string; amount: number }> = [];
  let embargoTotalUsed = 0;

  // Procesar deudas regulares primero, embargos al final
  const sorted = [...debts].sort((a, b) => {
    if (a.debt_type === 'embargo' && b.debt_type !== 'embargo') return 1;
    if (a.debt_type !== 'embargo' && b.debt_type === 'embargo') return -1;
    return 0;
  });

  let regularDebtTotal = 0;

  for (const d of sorted) {
    if (d.balance <= 0 || d.installment_amount <= 0) continue;

    if (d.debt_type === 'embargo') {
      // Embargo: limitar al % máximo del neto (después de deducciones regulares)
      const maxPct = (d.embargo_max_percentage ?? 30) / 100;
      const netAfterRegularDebts = netPayBeforeDebts - regularDebtTotal;
      const embargoLimit = round(Math.max(0, netAfterRegularDebts * maxPct));
      const available = Math.max(0, embargoLimit - embargoTotalUsed);
      const amount = round(Math.min(d.installment_amount, d.balance, available));
      if (amount > 0) {
        results.push({ id: d.id, description: d.description, amount });
        embargoTotalUsed += amount;
      }
    } else {
      const amount = round(Math.min(d.installment_amount, d.balance));
      results.push({ id: d.id, description: d.description, amount });
      regularDebtTotal += amount;
    }
  }

  return results;
}

// ============================================
// CÁLCULO COMPLETO POR EMPLEADO
// ============================================

/**
 * Calcula la planilla completa de un empleado para un período.
 */
export function calculateEmployeePayroll(
  employee: PayrollCalcInput,
  attendance: AttendanceSummary,
  deductionRules: DeductionRule[],
  debts: DebtForPeriod[],
  otherIncome = 0,
  periodsPerYear = 24
): EmployeePayrollResult {
  // 1. Salario base quincenal
  const base = biweeklySalary(employee.monthly_salary);

  // 2. Ingresos del período
  const sunday_amount = round(attendance.sunday_payment);
  const holiday_amount = round(attendance.holiday_payment);
  const overtime_amount = round(attendance.overtime_payment);
  const compensatory_amount = round(attendance.compensatory_hours_payment);

  // 3. Penalidades
  const late_amount = round(attendance.late_hours_payment);
  const absence_amount = round(attendance.absence_hours_payment);

  // 4. Ingreso bruto (base + extras - penalidades)
  const gross_income = round(
    base +
    sunday_amount +
    holiday_amount +
    overtime_amount +
    compensatory_amount +
    otherIncome -
    late_amount -
    absence_amount
  );

  // 5. Deducciones legales según tipo de empleado
  const { employee: employeeDeductions, employer: employerDeductions } = calculateDeductions(
    gross_income,
    employee.monthly_salary,
    deductionRules,
    employee.payroll_type,
    periodsPerYear
  );

  const total_deductions = Object.values(employeeDeductions).reduce((sum, v) => sum + v, 0);
  const employer_cost = Object.values(employerDeductions).reduce((sum, v) => sum + v, 0);

  // 6. Préstamos (pasar neto antes de deudas para limitar embargos)
  const netBeforeDebts = round(gross_income - total_deductions);
  const debtDeductions = calculateDebtDeductions(debts, netBeforeDebts);
  const total_debt = debtDeductions.reduce((sum, d) => sum + d.amount, 0);

  // 7. Neto
  const income_amount = round(gross_income);
  const deduction_amount = round(total_deductions);
  const net_pay = round(income_amount - deduction_amount - total_debt);

  return {
    base_salary: base,
    sunday_amount,
    holiday_amount,
    overtime_amount,
    compensatory_amount,
    other_income: round(otherIncome),
    gross_income,
    deductions: employeeDeductions,
    total_deductions: deduction_amount,
    late_amount,
    absence_amount,
    debts: debtDeductions,
    total_debt: round(total_debt),
    income_amount,
    deduction_amount,
    net_pay,
    employer_cost: round(employer_cost),
    employer_breakdown: employerDeductions,
  };
}

// ============================================
// GENERACIÓN DE PERÍODOS
// ============================================

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Calcula las fechas de un período quincenal.
 *
 * Con cortes 10/25:
 * - Período 1: del 26 del mes anterior al 10 del mes actual → pago el 15
 * - Período 2: del 11 al 25 del mes actual → pago el 30
 */
export function calculatePeriodDates(
  year: number,
  month: number,
  periodNumber: 1 | 2,
  cutOffDay1 = 10,
  cutOffDay2 = 25,
  paymentDay1 = 15,
  paymentDay2 = 30,
  adjustSunday = true
): PeriodDates {
  let start_date: Date;
  let end_date: Date;
  let payment_date: Date;

  if (periodNumber === 1) {
    // Período 1: desde (cutOffDay2 + 1) del mes anterior hasta cutOffDay1 del mes actual
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    start_date = toDate(new Date(prevYear, prevMonth - 1, cutOffDay2 + 1), { timeZone: TZ });
    end_date = toDate(new Date(year, month - 1, cutOffDay1), { timeZone: TZ });

    // Pago en paymentDay1 del mes actual
    payment_date = toDate(new Date(year, month - 1, paymentDay1), { timeZone: TZ });
  } else {
    // Período 2: desde (cutOffDay1 + 1) hasta cutOffDay2 del mes actual
    start_date = toDate(new Date(year, month - 1, cutOffDay1 + 1), { timeZone: TZ });
    end_date = toDate(new Date(year, month - 1, cutOffDay2), { timeZone: TZ });

    // Pago en paymentDay2 del mes actual (o último día si el mes tiene menos días)
    const lastDay = lastDayOfMonth(new Date(year, month - 1)).getDate();
    const actualPayDay = Math.min(paymentDay2, lastDay);
    payment_date = toDate(new Date(year, month - 1, actualPayDay), { timeZone: TZ });
  }

  // Ajustar si el día de pago cae domingo → pagar el sábado
  if (adjustSunday && isSunday(payment_date)) {
    payment_date = subDays(payment_date, 1);
  }

  const ordinal = periodNumber === 1 ? 'Primera' : 'Segunda';
  const title = `${ordinal} de ${MONTH_NAMES[month]} ${year}`;

  return {
    start_date,
    end_date,
    payment_date,
    period_number: periodNumber,
    month,
    year,
    title,
  };
}

/**
 * Genera todos los períodos de un año.
 */
export function generateYearPeriods(
  year: number,
  cutOffDay1 = 10,
  cutOffDay2 = 25,
  paymentDay1 = 15,
  paymentDay2 = 30,
  adjustSunday = true
): PeriodDates[] {
  const periods: PeriodDates[] = [];
  for (let month = 1; month <= 12; month++) {
    periods.push(calculatePeriodDates(year, month, 1, cutOffDay1, cutOffDay2, paymentDay1, paymentDay2, adjustSunday));
    periods.push(calculatePeriodDates(year, month, 2, cutOffDay1, cutOffDay2, paymentDay1, paymentDay2, adjustSunday));
  }
  return periods;
}

// ============================================
// FERIADOS
// ============================================

/**
 * Verifica si una fecha es feriado.
 */
export function isHoliday(
  date: Date | string,
  holidays: Array<{ date: Date | string; is_recurring: boolean }>
): boolean {
  const d = typeof date === 'string' ? toDate(date, { timeZone: TZ }) : date;
  const dStr = format(d, 'yyyy-MM-dd');
  const dMonthDay = format(d, 'MM-dd');

  return holidays.some(h => {
    const hStr = typeof h.date === 'string' ? h.date : format(h.date, 'yyyy-MM-dd');
    if (hStr === dStr) return true;
    // Para recurrentes, comparar solo mes-día
    if (h.is_recurring) {
      const hMonthDay = hStr.substring(5); // "MM-dd"
      return hMonthDay === dMonthDay;
    }
    return false;
  });
}

// ============================================
// UTILIDADES
// ============================================

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
