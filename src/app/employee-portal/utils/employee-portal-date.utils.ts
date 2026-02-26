import { differenceInDays, isValid, differenceInMilliseconds, differenceInCalendarDays } from 'date-fns';

/**
 * Calcula el número de días entre dos fechas (incluyendo ambos días)
 */
export function calculateDays(
  start: Date | string,
  end: Date | string
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return differenceInCalendarDays(endDate, startDate) + 1;
}

/**
 * Calcula los días entre dos fechas (incluyendo ambos días)
 */
export function calculateDaysBetween(
  dateFrom: Date | string,
  dateTo: Date | string
): number {
  try {
    const from = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
    const to = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;

    if (!isValid(from) || !isValid(to)) {
      return 0;
    }

    return differenceInDays(to, from) + 1; // +1 para incluir ambos días
  } catch (error) {
    console.error('Error calculating days between dates:', error);
    return 0;
  }
}

/**
 * Verifica si una fecha es futura
 */
export function isDateFuture(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) {
      return false;
    }
    return dateObj > new Date();
  } catch (error) {
    console.error('Error checking if date is future:', error);
    return false;
  }
}
