/**
 * Vacation Calculation Utils - Funciones puras para cálculo de vacaciones (Panamá)
 *
 * Art. 54-59 Código de Trabajo de Panamá:
 * - 30 días de vacaciones por cada 11 meses continuos de trabajo
 * - El pago se calcula sobre el salario mensual / 30 (tasa diaria)
 * - Las vacaciones proporcionales aplican al terminar la relación laboral
 */

import { differenceInMonths, differenceInDays } from 'date-fns';

// ============================================
// TIPOS
// ============================================

export interface VacationAccrual {
  monthsWorked: number;
  completedPeriods: number;    // períodos completos de 11 meses
  accruedDays: number;         // días acumulados totales (30 × períodos)
  proportionalDays: number;    // días proporcionales del período en curso
  totalDays: number;           // accruedDays + proportionalDays
}

// ============================================
// CÁLCULOS
// ============================================

/**
 * Calcula la acumulación de vacaciones de un empleado.
 * 30 días por cada 11 meses trabajados (Art. 54).
 */
export function calculateVacationAccrual(
  hireDate: Date | string,
  calculationDate: Date | string
): VacationAccrual {
  const hire = toDate(hireDate);
  const calc = toDate(calculationDate);

  const monthsWorked = differenceInMonths(calc, hire);
  if (monthsWorked < 0) {
    return { monthsWorked: 0, completedPeriods: 0, accruedDays: 0, proportionalDays: 0, totalDays: 0 };
  }

  const completedPeriods = Math.floor(monthsWorked / 11);
  const accruedDays = completedPeriods * 30;

  // Meses del período en curso
  const remainingMonths = monthsWorked % 11;
  // Proporcional: (remainingMonths / 11) * 30
  const proportionalDays = round((remainingMonths / 11) * 30);

  return {
    monthsWorked,
    completedPeriods,
    accruedDays,
    proportionalDays,
    totalDays: round(accruedDays + proportionalDays),
  };
}

/**
 * Calcula la tasa diaria de vacaciones.
 * Salario mensual / 30
 */
export function calculateDailyRate(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0;
  return round(monthlySalary / 30);
}

/**
 * Calcula el monto a pagar por vacaciones.
 */
export function calculateVacationPayment(
  daysToPayParam: number,
  dailyRate: number
): number {
  if (daysToPayParam <= 0 || dailyRate <= 0) return 0;
  return round(daysToPayParam * dailyRate);
}

/**
 * Calcula los días de vacaciones disponibles (acumulados - usados).
 */
export function calculateAvailableDays(
  accruedDays: number,
  usedDays: number
): number {
  return round(Math.max(0, accruedDays - usedDays));
}

/**
 * Calcula las vacaciones proporcionales al terminar relación laboral.
 * Se usa el totalDays (completos + proporcionales) - usados.
 */
export function calculateProportionalVacation(
  hireDate: Date | string,
  terminationDate: Date | string,
  usedDays = 0
): { proportionalDays: number; totalDays: number } {
  const accrual = calculateVacationAccrual(hireDate, terminationDate);
  const proportionalDays = round(Math.max(0, accrual.totalDays - usedDays));
  return { proportionalDays, totalDays: accrual.totalDays };
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
