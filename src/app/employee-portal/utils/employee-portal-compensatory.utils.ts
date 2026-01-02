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
