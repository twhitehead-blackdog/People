import { differenceInMinutes } from 'date-fns';

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

  if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
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
    if (!isNaN(lunchStartDate.getTime()) && !isNaN(lunchEndDate.getTime())) {
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
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(
        '[getCompensatoryQuantity] Fechas inválidas:',
        dateFromStr,
        dateToStr
      );
      return 0;
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

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
