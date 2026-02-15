import { differenceInMinutes, format, isValid } from 'date-fns';

/**
 * Calcula las horas trabajadas entre entrada y salida, restando el tiempo de almuerzo
 */
export function calculateWorkedHours(
  entry: Date,
  exit: Date,
  lunchStart?: Date,
  lunchEnd?: Date
): string {
  if (!entry || !exit) {
    return '-';
  }

  const entryDate = new Date(entry);
  const exitDate = new Date(exit);

  if (!isValid(entryDate) || !isValid(exitDate)) {
    return '-';
  }

  // Calcular diferencia total en minutos
  const totalMinutes = differenceInMinutes(exitDate, entryDate);

  if (totalMinutes < 0) {
    return '0h 0m';
  }

  // Restar tiempo de almuerzo si existe
  let lunchTime = 0;
  if (lunchStart && lunchEnd) {
    const lunchStartDate = new Date(lunchStart);
    const lunchEndDate = new Date(lunchEnd);
    if (isValid(lunchStartDate) && isValid(lunchEndDate)) {
      const lunchDiff = differenceInMinutes(lunchEndDate, lunchStartDate);
      // Solo usar si la diferencia es positiva y razonable (máximo 3 horas)
      if (lunchDiff > 0 && lunchDiff <= 180) {
        lunchTime = lunchDiff;
      }
    }
  }

  // Calcular horas trabajadas restando el almuerzo
  const workMinutes = totalMinutes - lunchTime;

  if (workMinutes < 0) {
    return '0h 0m';
  }

  const hours = Math.floor(workMinutes / 60);
  const mins = workMinutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Formatea horas en formato "Xh Ym" o solo minutos si es menor a 1 hora
 */
export function formatHoursMinutes(hours: number | string): string {
  const hoursNum = typeof hours === 'string' ? parseFloat(hours) : hours;
  if (isNaN(hoursNum) || hoursNum <= 0) return '0m';

  const totalMinutes = Math.round(hoursNum * 60);
  const hoursPart = Math.floor(totalMinutes / 60);
  const minutesPart = totalMinutes % 60;

  if (hoursPart === 0) {
    return `${minutesPart}m`;
  } else if (minutesPart === 0) {
    return `${hoursPart}h`;
  } else {
    return `${hoursPart}h ${minutesPart}m`;
  }
}

/**
 * Verifica si una fecha tiene información de tiempo (datetime)
 */
export function hasTimeInfo(dateValue: string | Date | null | undefined): boolean {
  if (!dateValue) return false;
  const dateStr = String(dateValue);
  return dateStr.includes(' ') || dateStr.includes('T');
}

/**
 * Formatea el rango de horas desde fechas datetime
 */
export function formatDateWithTimeRange(
  dateFrom: string | Date,
  dateTo: string | Date
): string {
  try {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (!isValid(from) || !isValid(to)) {
      return '';
    }

    const fromTime = format(from, 'HH:mm');
    const toTime = format(to, 'HH:mm');

    return `de ${fromTime} a ${toTime}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
}

/**
 * Helper para calcular horas desde date_from y date_to cuando es por horas
 */
export function calculateHoursFromDates(
  dateFrom: Date | string,
  dateTo: Date | string
): number {
  if (!dateFrom || !dateTo) {
    return 0;
  }

  // Normalizar las fechas a strings para mejor parsing
  const dateFromStr = String(dateFrom);
  const dateToStr = String(dateTo);

  // Intentar parsear las fechas
  let startDate: Date;
  let endDate: Date;

  try {
    // Si ya es un objeto Date, usarlo directamente
    if (dateFrom instanceof Date) {
      startDate = dateFrom;
    } else {
      // Intentar parsear como string
      startDate = new Date(dateFromStr);
    }

    if (dateTo instanceof Date) {
      endDate = dateTo;
    } else {
      endDate = new Date(dateToStr);
    }

    // Validar que las fechas sean válidas
    if (!isValid(startDate) || !isValid(endDate)) {
      console.warn(
        '[getCompensatoryQuantity] Fechas inválidas:',
        dateFromStr,
        dateToStr
      );
      return 0;
    }

    const diffMinutes = Math.abs(differenceInMinutes(endDate, startDate));
    const diffHours = diffMinutes / 60;

    // Redondear a 2 decimales para evitar errores de precisión
    return Math.round(diffHours * 100) / 100;
  } catch (error) {
    console.error(
      '[getCompensatoryQuantity] Error calculando horas:',
      error,
      dateFromStr,
      dateToStr
    );
    return 0;
  }
}
