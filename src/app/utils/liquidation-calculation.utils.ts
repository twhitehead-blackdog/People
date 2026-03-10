/**
 * Liquidation Calculation Utils - Funciones puras para liquidación laboral (Panamá)
 *
 * Código de Trabajo de Panamá:
 * - Salario pendiente: días no pagados
 * - Vacaciones proporcionales: Art. 54-59
 * - Décimo tercer mes proporcional: Art. 168
 * - Prima de antigüedad: Art. 224 (1 semana por cada año trabajado)
 * - Preaviso: Art. 212 (30 días de salario)
 * - Indemnización: Art. 225
 *   - <1 año: 1 semana por cada 3 meses (mínimo 1 semana)
 *   - 1-10 años: 3.4 semanas por año
 *   - >10 años: 34 semanas + 1 semana por año adicional
 */

import { differenceInMonths, differenceInDays, differenceInYears } from 'date-fns';
import { calculateVacationAccrual, calculateDailyRate } from './vacation-calculation.utils';
import type { LiquidationTerminationType, ContractType } from '../models';

// ============================================
// TIPOS
// ============================================

export interface LiquidationInput {
  monthlySalary: number;
  hireDate: Date | string;
  terminationDate: Date | string;
  terminationType: LiquidationTerminationType;
  contractType: ContractType;
  lastPayDate?: Date | string;         // último día pagado (para salario pendiente)
  vacationUsedDays?: number;            // días de vacaciones ya tomados
  avgSalaryForSeverance?: number;       // salario promedio últimos 5 años (para indemnización)
  fondoCesantiaOffset?: number;         // monto del fondo de cesantía a descontar
  otherDeductions?: number;             // otras deducciones
}

export interface LiquidationResult {
  // Componentes de ingreso
  pendingSalary: number;
  pendingSalaryDays: number;
  vacationDaysAccrued: number;
  vacationDaysProportional: number;
  vacationPay: number;
  xiiiMonthProportional: number;
  seniorityBonus: number;
  seniorityYears: number;
  noticePay: number;
  severancePay: number;
  severanceWeeks: number;
  // Totales
  grossTotal: number;
  cssDeduction: number;
  seDeduction: number;
  isrDeduction: number;
  otherDeductions: number;
  fondoCesantiaOffset: number;
  netTotal: number;
}

// ============================================
// COMPONENTES INDIVIDUALES
// ============================================

/**
 * Calcula el salario pendiente desde el último día pagado hasta la fecha de terminación.
 */
export function calculatePendingSalary(
  monthlySalary: number,
  lastPayDate: Date | string,
  terminationDate: Date | string
): { amount: number; days: number } {
  const last = toDate(lastPayDate);
  const term = toDate(terminationDate);
  const days = differenceInDays(term, last);
  if (days <= 0) return { amount: 0, days: 0 };

  const dailyRate = monthlySalary / 30;
  return { amount: round(days * dailyRate), days };
}

/**
 * Calcula el décimo tercer mes proporcional.
 * El XIII mes se paga en 3 cuatrimestres. Al liquidar, se calcula
 * la parte proporcional del cuatrimestre actual.
 *
 * Cuatrimestres:
 * 1: Dic 16 - Abr 15
 * 2: Abr 16 - Ago 15
 * 3: Ago 16 - Dic 15
 */
export function calculateProportionalXIII(
  monthlySalary: number,
  terminationDate: Date | string
): number {
  const term = toDate(terminationDate);
  const month = term.getMonth() + 1; // 1-12
  const day = term.getDate();

  // Determinar inicio del cuatrimestre actual
  let periodStart: Date;
  if ((month === 12 && day >= 16) || (month <= 4 && (month < 4 || day <= 15))) {
    // Cuatrimestre 1: Dic 16 - Abr 15
    if (month === 12) {
      periodStart = new Date(term.getFullYear(), 11, 16); // Dec 16 same year
    } else {
      periodStart = new Date(term.getFullYear() - 1, 11, 16); // Dec 16 prev year
    }
  } else if ((month === 4 && day >= 16) || (month > 4 && month <= 8 && (month < 8 || day <= 15))) {
    // Cuatrimestre 2: Abr 16 - Ago 15
    periodStart = new Date(term.getFullYear(), 3, 16); // Apr 16
  } else {
    // Cuatrimestre 3: Ago 16 - Dic 15
    periodStart = new Date(term.getFullYear(), 7, 16); // Aug 16
  }

  const daysInPeriod = differenceInDays(term, periodStart) + 1;
  if (daysInPeriod <= 0) return 0;

  // XIII proporcional = (salario mensual × meses trabajados en cuatrimestre) / 3
  // Simplificado: (salario diario × días en cuatrimestre) / 3
  const dailyRate = monthlySalary / 30;
  const earnings = dailyRate * daysInPeriod;
  return round(earnings / 3);
}

/**
 * Calcula la prima de antigüedad.
 * Art. 224: 1 semana de salario por cada año trabajado.
 * Solo aplica en ciertos tipos de terminación.
 */
export function calculateSeniorityBonus(
  monthlySalary: number,
  hireDate: Date | string,
  terminationDate: Date | string
): { amount: number; years: number } {
  const hire = toDate(hireDate);
  const term = toDate(terminationDate);
  const years = differenceInYears(term, hire);

  if (years < 1) return { amount: 0, years: 0 };

  const weeklyRate = monthlySalary / 4.333; // semanas promedio por mes
  const amount = round(weeklyRate * years);
  return { amount, years };
}

/**
 * Calcula el preaviso.
 * Art. 212: 30 días de salario si no se dio preaviso.
 * Aplica solo en ciertos tipos de terminación.
 */
export function calculateNoticePay(
  monthlySalary: number,
  terminationType: LiquidationTerminationType
): number {
  const needsNotice = terminationType === 'DESPIDO_INJUSTIFICADO' ||
    terminationType === 'RENUNCIA_JUSTIFICADA';
  if (!needsNotice) return 0;
  return round(monthlySalary); // 30 días = 1 mes
}

/**
 * Calcula la indemnización por despido injustificado.
 * Art. 225:
 * - <1 año: 1 semana por cada 3 meses (mínimo 1 semana)
 * - 1-10 años: 3.4 semanas por año
 * - >10 años: 34 semanas + 1 semana por año adicional después del décimo
 */
export function calculateSeverancePay(
  monthlySalary: number,
  hireDate: Date | string,
  terminationDate: Date | string,
  avgSalaryForSeverance?: number
): { amount: number; weeks: number } {
  const hire = toDate(hireDate);
  const term = toDate(terminationDate);
  const totalMonths = differenceInMonths(term, hire);
  const totalYears = totalMonths / 12;

  // Usar salario promedio si se proporciona, sino el actual
  const salary = avgSalaryForSeverance ?? monthlySalary;
  const weeklyRate = salary / 4.333;

  let weeks: number;

  if (totalYears < 1) {
    // Menos de 1 año: 1 semana por cada 3 meses (mínimo 1 semana)
    const quarters = Math.floor(totalMonths / 3);
    weeks = Math.max(1, quarters);
  } else if (totalYears <= 10) {
    // 1-10 años: 3.4 semanas por año
    weeks = round(totalYears * 3.4);
  } else {
    // >10 años: 34 semanas + 1 semana por año adicional
    const additionalYears = Math.floor(totalYears - 10);
    weeks = 34 + additionalYears;
  }

  return { amount: round(weeklyRate * weeks), weeks };
}

/**
 * Determina qué componentes aplican según el tipo de terminación y contrato.
 */
export function getApplicableComponents(
  terminationType: LiquidationTerminationType,
  contractType: ContractType
): {
  pendingSalary: boolean;
  vacations: boolean;
  xiiiMonth: boolean;
  seniorityBonus: boolean;
  noticePay: boolean;
  severancePay: boolean;
} {
  // Siempre aplican
  const pendingSalary = true;
  const vacations = true;
  const xiiiMonth = true;

  // Prima de antigüedad: NO aplica en despido justificado ni renuncia voluntaria
  // Art. 224: renuncia voluntaria sin causa no genera prima de antigüedad
  const seniorityBonus = terminationType !== 'DESPIDO_JUSTIFICADO' &&
    terminationType !== 'RENUNCIA';

  // Preaviso: solo en despido injustificado y renuncia justificada
  const noticePay = terminationType === 'DESPIDO_INJUSTIFICADO' ||
    terminationType === 'RENUNCIA_JUSTIFICADA';

  // Indemnización: solo en despido injustificado
  const severancePay = terminationType === 'DESPIDO_INJUSTIFICADO';

  return { pendingSalary, vacations, xiiiMonth, seniorityBonus, noticePay, severancePay };
}

// ============================================
// CÁLCULO COMPLETO
// ============================================

/**
 * Calcula la liquidación completa de un empleado.
 */
export function calculateFullLiquidation(input: LiquidationInput): LiquidationResult {
  const {
    monthlySalary,
    hireDate,
    terminationDate,
    terminationType,
    contractType,
    lastPayDate,
    vacationUsedDays = 0,
    avgSalaryForSeverance,
    fondoCesantiaOffset = 0,
    otherDeductions = 0,
  } = input;

  const applicable = getApplicableComponents(terminationType, contractType);

  // 1. Salario pendiente
  let pendingSalary = 0;
  let pendingSalaryDays = 0;
  if (applicable.pendingSalary && lastPayDate) {
    const ps = calculatePendingSalary(monthlySalary, lastPayDate, terminationDate);
    pendingSalary = ps.amount;
    pendingSalaryDays = ps.days;
  }

  // 2. Vacaciones
  let vacationDaysAccrued = 0;
  let vacationDaysProportional = 0;
  let vacationPay = 0;
  if (applicable.vacations) {
    const accrual = calculateVacationAccrual(hireDate, terminationDate);
    vacationDaysAccrued = accrual.accruedDays;
    vacationDaysProportional = accrual.proportionalDays;
    const totalVacDays = Math.max(0, accrual.totalDays - vacationUsedDays);
    const dailyRate = calculateDailyRate(monthlySalary);
    vacationPay = round(totalVacDays * dailyRate);
  }

  // 3. XIII mes proporcional
  let xiiiMonthProportional = 0;
  if (applicable.xiiiMonth) {
    xiiiMonthProportional = calculateProportionalXIII(monthlySalary, terminationDate);
  }

  // 4. Prima de antigüedad
  let seniorityBonus = 0;
  let seniorityYears = 0;
  if (applicable.seniorityBonus) {
    const sb = calculateSeniorityBonus(monthlySalary, hireDate, terminationDate);
    seniorityBonus = sb.amount;
    seniorityYears = sb.years;
  }

  // 5. Preaviso
  let noticePay = 0;
  if (applicable.noticePay) {
    noticePay = calculateNoticePay(monthlySalary, terminationType);
  }

  // 6. Indemnización
  let severancePay = 0;
  let severanceWeeks = 0;
  if (applicable.severancePay) {
    const sv = calculateSeverancePay(monthlySalary, hireDate, terminationDate, avgSalaryForSeverance);
    severancePay = sv.amount;
    severanceWeeks = sv.weeks;
  }

  // 7. Total bruto
  const grossTotal = round(
    pendingSalary + vacationPay + xiiiMonthProportional +
    seniorityBonus + noticePay + severancePay
  );

  // 8. Deducciones legales
  // CSS y SE aplican sobre: salario pendiente + vacaciones + XIII + preaviso
  // (preaviso está sujeto a CSS/SE pero NO a ISR)
  const cssSeBase = round(pendingSalary + vacationPay + xiiiMonthProportional + noticePay);
  const cssDeduction = round(cssSeBase * 0.0975);
  const seDeduction = round(cssSeBase * 0.0125);

  // ISR aplica sobre: salario pendiente + vacaciones + XIII (sin preaviso, prima ni indemnización)
  const isrBase = round(pendingSalary + vacationPay + xiiiMonthProportional);
  // Para ISR, deducir CSS y SE proporcional a la base gravable de ISR
  const cssForIsr = round(isrBase * 0.0975);
  const seForIsr = round(isrBase * 0.0125);
  const annualTaxable = round((isrBase - cssForIsr - seForIsr) * 12);
  let isrDeduction = 0;
  if (annualTaxable > 11000) {
    let annualISR = 0;
    if (annualTaxable > 50000) {
      annualISR += (50000 - 11000) * 0.15;
      annualISR += (annualTaxable - 50000) * 0.25;
    } else {
      annualISR += (annualTaxable - 11000) * 0.15;
    }
    // ISR proporcional a la liquidación (no al año completo)
    isrDeduction = round(annualISR / 12);
  }

  // 9. Neto
  const netTotal = round(grossTotal - cssDeduction - seDeduction - isrDeduction - otherDeductions - fondoCesantiaOffset);

  return {
    pendingSalary,
    pendingSalaryDays,
    vacationDaysAccrued,
    vacationDaysProportional,
    vacationPay,
    xiiiMonthProportional,
    seniorityBonus,
    seniorityYears,
    noticePay,
    severancePay,
    severanceWeeks,
    grossTotal,
    cssDeduction,
    seDeduction,
    isrDeduction,
    otherDeductions,
    fondoCesantiaOffset,
    netTotal,
  };
}

// ============================================
// UTILIDADES
// ============================================

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}
