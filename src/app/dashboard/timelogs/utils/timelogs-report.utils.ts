import { format, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DayLog } from '../../../models';
import { formatHours } from './alert.utils';

export interface TimelogReportRow {
  Empleado: string;
  Día: string;
  Horario: string;
  Entrada: string;
  'Inicio de almuerzo': string;
  'Fin de almuerzo': string;
  Salida: string;
  'Horas Trabajadas': string;
  'Horas Extras': string;
  'Errores/Alertas': string;
}

/**
 * Mapea DayLogs filtrados a filas de reporte para Excel.
 * Ordena por fecha y nombre de empleado.
 */
export function mapDayLogsToReportRows(
  filteredData: DayLog[],
  dateRangeStart: string,
  dateRangeEnd: string,
  timezone: string
): TimelogReportRow[] {
  const sortedAndFilteredData = filteredData
    .filter((x: DayLog) => {
      const dayStr = x.day || '';
      return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
    })
    .sort((a: DayLog, b: DayLog) => {
      const dayA = a.day || '';
      const dayB = b.day || '';
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      const nameA =
        (a.employee?.first_name || '') + ' ' + (a.employee?.father_name || '');
      const nameB =
        (b.employee?.first_name || '') + ' ' + (b.employee?.father_name || '');
      return nameA.localeCompare(nameB);
    });

  return sortedAndFilteredData.map((x: DayLog) => {
    const lunchMinutes = x.lunchMinutes || 0;
    const exceededMinutes = lunchMinutes > 60 ? lunchMinutes - 60 : 0;
    const lunchExceeded = x.lunchExceeded
      ? `EXCEDIDO (+${exceededMinutes} min)`
      : lunchMinutes > 0
      ? `${lunchMinutes} min`
      : '';
    const totalHours = x.totalHours ? formatHours(x.totalHours) : '-';
    const overtimeHours =
      x.overtimeHours && x.overtimeHours > 0
        ? formatHours(x.overtimeHours)
        : '-';

    const errors: string[] = [];
    if (x.scheduleError) errors.push('Error de Horario');
    if (x.lunchExceeded) errors.push('Almuerzo Excedido');
    if (x.earlyExit) errors.push('Salida Temprana');
    if (x.insufficientHours) errors.push('Horas Insuficientes');
    if (x.alert && !x.scheduleError) errors.push(x.alert);

    const entrada = formatTimelogEntry(x, timezone);
    const inicioAlmuerzo = formatTimelogLunchStart(x, timezone);
    const finAlmuerzo = formatTimelogLunchEnd(x, timezone);
    const salida = formatTimelogExit(x, timezone);
    const formattedDate = formatDayLogDate(x.day, timezone);

    const employeeName =
      [x.employee?.first_name || '', x.employee?.father_name || '']
        .filter(Boolean)
        .join(' ') || 'Sin nombre';

    return {
      Empleado: employeeName,
      Día: formattedDate,
      Horario: x.schedule?.schedule?.name || 'Sin horario',
      Entrada: entrada,
      'Inicio de almuerzo': inicioAlmuerzo,
      'Fin de almuerzo': finAlmuerzo,
      Salida: salida,
      'Horas Trabajadas': totalHours,
      'Horas Extras': overtimeHours,
      'Errores/Alertas': errors.length > 0 ? errors.join(', ') : 'Ninguno',
    };
  });
}

function formatTimelogEntry(x: DayLog, timezone: string): string {
  if (!x.entry?.date) return 'SIN MARCA';
  try {
    let entrada = formatInTimeZone(x.entry.date, timezone, 'hh:mm a');
    if (x.entry.branch?.short_name) {
      entrada += ` (${x.entry.branch.short_name})`;
    }
    if (x.delay) {
      const delayText =
        typeof x.delay === 'number' ? `${x.delay} min` : String(x.delay);
      entrada += ` Retraso de ${delayText}`;
    }
    return entrada;
  } catch {
    return 'SIN MARCA';
  }
}

function formatTimelogLunchStart(x: DayLog, timezone: string): string {
  if (!x.lunch_start?.date) return 'SIN MARCA';
  try {
    let resultado = formatInTimeZone(x.lunch_start.date, timezone, 'hh:mm a');
    if (x.lunch_start.branch?.short_name) {
      resultado += ` (${x.lunch_start.branch.short_name})`;
    }
    return resultado;
  } catch {
    return 'SIN MARCA';
  }
}

function formatTimelogLunchEnd(x: DayLog, timezone: string): string {
  if (!x.lunch_end?.date) return 'SIN MARCA';
  try {
    let resultado = formatInTimeZone(x.lunch_end.date, timezone, 'hh:mm a');
    if (x.lunch_end.branch?.short_name) {
      resultado += ` (${x.lunch_end.branch.short_name})`;
    }
    if (x.lunchExceeded && x.lunchMinutes) {
      const exceededMinutes = x.lunchMinutes - 60;
      resultado += ` Almuerzo +${exceededMinutes} min`;
    }
    return resultado;
  } catch {
    return 'SIN MARCA';
  }
}

function formatTimelogExit(x: DayLog, timezone: string): string {
  if (!x.exit?.date) return 'SIN MARCA';
  try {
    let resultado = formatInTimeZone(x.exit.date, timezone, 'hh:mm a');
    if (x.exit.branch?.short_name) {
      resultado += ` (${x.exit.branch.short_name})`;
    }
    if (x.earlyExit) {
      resultado += ' Salida temprana';
    }
    return resultado;
  } catch {
    return 'SIN MARCA';
  }
}

function formatDayLogDate(day: string, timezone: string): string {
  try {
    const dayDate = new Date(day + 'T00:00:00');
    if (isValid(dayDate)) {
      return formatInTimeZone(dayDate, timezone, 'd MMM yyyy');
    }
    return day || '';
  } catch {
    return day || '';
  }
}
