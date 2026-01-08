import { differenceInDays, differenceInMinutes, startOfDay } from 'date-fns';
import { calculateDays } from './employee-portal-date.utils';
import { calculateHoursFromDates } from './employee-portal-time.utils';

/**
 * Helper para extraer el motivo desde las notas de una solicitud compensatoria
 */
export function getCompensatoryReasonFromNotes(data: any): string | null {
  if (!data.notes) return null;
  const notesArray = Array.isArray(data.notes)
    ? data.notes
    : typeof data.notes === 'string'
    ? [data.notes]
    : [];
  const motivoNote = notesArray.find(
    (note: any) => typeof note === 'string' && note.startsWith('Motivo:')
  );
  if (motivoNote) {
    return motivoNote.replace('Motivo: ', '').trim();
  }
  return null;
}

/**
 * Helper para obtener la cantidad correcta de horas o días para una solicitud compensatoria
 */
export function getCompensatoryQuantity(data: any): {
  value: number;
  isDays: boolean;
} {
  // Primero intentar determinar si es días u horas desde las notas o el campo compensatory_type
  let isDays = false;

  // 1. Intentar desde compensatory_type si existe
  if (data.compensatory_type) {
    isDays = data.compensatory_type === 'days';
  }
  // 2. Intentar desde las notas
  else if (data.notes) {
    const notesArray = Array.isArray(data.notes)
      ? data.notes
      : typeof data.notes === 'string'
      ? [data.notes]
      : [];

    // Buscar nota que contenga "Tipo:"
    const tipoNote = notesArray.find(
      (note: any) => typeof note === 'string' && note.includes('Tipo:')
    );

    if (tipoNote) {
      isDays = tipoNote.includes('Días');
    }
    // 3. Si no hay nota de tipo, determinar por el formato de las fechas y la diferencia
    else if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);

      // Si las fechas incluyen hora (formato datetime con espacio o ISO con T), probablemente es por horas
      const hasTimeInFrom =
        (dateFromStr.includes(' ') && dateFromStr.includes(':')) ||
        (dateFromStr.includes('T') && dateFromStr.includes(':'));
      const hasTimeInTo =
        (dateToStr.includes(' ') && dateToStr.includes(':')) ||
        (dateToStr.includes('T') && dateToStr.includes(':'));

      if (hasTimeInFrom && hasTimeInTo) {
        // Tiene hora, es por horas
        isDays = false;
      } else {
        // No tiene hora, calcular diferencia
        const hours = calculateHoursFromDates(data.date_from, data.date_to);
        const days = hours / 24;
        // Si la diferencia es un número entero de días (tolerancia pequeña)
        isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
      }
    }
  }
  // 4. Si no hay notas, intentar determinar por formato de fechas
  else if (data.date_from && data.date_to) {
    const dateFromStr = String(data.date_from);
    const dateToStr = String(data.date_to);

    const hasTimeInFrom =
      (dateFromStr.includes(' ') && dateFromStr.includes(':')) ||
      (dateFromStr.includes('T') && dateFromStr.includes(':'));
    const hasTimeInTo =
      (dateToStr.includes(' ') && dateToStr.includes(':')) ||
      (dateToStr.includes('T') && dateToStr.includes(':'));

    if (hasTimeInFrom && hasTimeInTo) {
      isDays = false;
    } else {
      const hours = calculateHoursFromDates(data.date_from, data.date_to);
      const days = hours / 24;
      isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
    }
  }

  if (isDays) {
    // Calcular días desde fechas
    let days = 0;
    if (data.date_from && data.date_to) {
      days = calculateDays(data.date_from, data.date_to);
    } else if (data.compensatory_amount) {
      days = data.compensatory_amount;
    }
    return { value: days > 0 ? days : 1, isDays: true };
  } else {
    // Para horas, calcular siempre desde fechas si están disponibles
    let hours = 0;
    if (data.date_from && data.date_to) {
      hours = calculateHoursFromDates(data.date_from, data.date_to);

      // Si el resultado es 0 o negativo, intentar desde otros campos
      if (hours <= 0) {
        // Intentar desde las notas si hay cantidad guardada
        if (data.notes) {
          const notesArray = Array.isArray(data.notes)
            ? data.notes
            : typeof data.notes === 'string'
            ? [data.notes]
            : [];
          const cantidadNote = notesArray.find(
            (note: any) =>
              typeof note === 'string' && note.includes('Cantidad:')
          );
          if (cantidadNote) {
            const cantidadMatch = cantidadNote.match(/Cantidad:\s*([\d.]+)/);
            if (cantidadMatch && cantidadMatch[1]) {
              hours = parseFloat(cantidadMatch[1]);
            }
          }
        }

        // Si aún es 0, intentar desde otros campos
        if (hours <= 0 && data.hours) {
          hours = data.hours;
        } else if (hours <= 0 && data.compensatory_amount) {
          hours = data.compensatory_amount;
        }
      }

      // Si el resultado es muy grande (más de 24 horas), probablemente es un error
      // y debería ser días en lugar de horas
      if (hours >= 24 && hours % 24 < 0.1) {
        // Es un número entero de días, convertir a días
        const days = Math.round(hours / 24);
        return { value: days, isDays: true };
      }
    } else if (data.hours) {
      hours = data.hours;
    } else if (data.compensatory_amount) {
      hours = data.compensatory_amount;
    }
    return { value: hours, isDays: false };
  }
}

/**
 * Calcula el total de horas/días de una solicitud compensatoria
 */
export function calculateCompensatoryAmount(params: {
  type: 'hours' | 'days';
  date?: Date | null;
  timeStart?: Date | null;
  timeEnd?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
}): number {
  const { type, date, timeStart, timeEnd, startDate, endDate } = params;

  if (type === 'hours') {
    if (!date || !timeStart || !timeEnd) {
      return 0;
    }

    // Calcular diferencia en horas
    const startDateTime = new Date(date);
    startDateTime.setHours(timeStart.getHours());
    startDateTime.setMinutes(timeStart.getMinutes());
    startDateTime.setSeconds(0);
    startDateTime.setMilliseconds(0);

    const endDateTime = new Date(date);
    endDateTime.setHours(timeEnd.getHours());
    endDateTime.setMinutes(timeEnd.getMinutes());
    endDateTime.setSeconds(0);
    endDateTime.setMilliseconds(0);

    // Si la hora fin es menor que la hora inicio, asumir que es del día siguiente
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const diffMinutes = differenceInMinutes(endDateTime, startDateTime);
    const diffHours = diffMinutes / 60;

    return Math.max(0, diffHours);
  } else {
    // Si es días, calcular diferencia en días
    if (!startDate || !endDate) {
      return 0;
    }

    const diffDays = differenceInDays(endDate, startDate) + 1; // +1 para incluir ambos días
    return Math.max(0, diffDays);
  }
}

/**
 * Valida si se puede enviar una solicitud compensatoria
 */
export function canSubmitCompensatory(params: {
  type: 'hours' | 'days';
  amount: number;
  date?: Date | null;
  timeStart?: Date | null;
  timeEnd?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
}): boolean {
  const { type, amount, date, timeStart, timeEnd, startDate, endDate } = params;

  console.log('[DEBUG Validation] Tipo:', type);
  console.log('[DEBUG Validation] Cantidad:', amount);
  console.log('[DEBUG Validation] Fecha:', date);
  console.log('[DEBUG Validation] Hora inicio:', timeStart);
  console.log('[DEBUG Validation] Hora fin:', timeEnd);
  console.log('[DEBUG Validation] Fecha inicio período:', startDate);
  console.log('[DEBUG Validation] Fecha fin período:', endDate);

  if (amount <= 0) {
    console.log('[DEBUG Validation] ❌ Falla: Cantidad <= 0');
    return false;
  }

  if (type === 'hours') {
    // Si es horas, debe tener fecha y ambas horas
    if (!date || !timeStart || !timeEnd) {
      console.log('[DEBUG Validation] ❌ Falla tipo horas: faltan fecha u horas');
      return false;
    }
  } else {
    // Si es días, debe tener fecha inicio y fin
    if (!startDate || !endDate || endDate < startDate) {
      console.log('[DEBUG Validation] ❌ Falla tipo días: faltan fechas período');
      return false;
    }
  }

  console.log('[DEBUG Validation] ✅ Validación exitosa');
  return true;
}
