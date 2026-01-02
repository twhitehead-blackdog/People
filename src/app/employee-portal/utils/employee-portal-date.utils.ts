import { differenceInDays } from 'date-fns';

/**
 * Calcula el número de días entre dos fechas (incluyendo ambos días)
 */
export function calculateDays(
  start: Date | string,
  end: Date | string
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end days
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

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
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
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    return dateObj > new Date();
  } catch (error) {
    console.error('Error checking if date is future:', error);
    return false;
  }
}
