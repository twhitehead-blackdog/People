import { DayLog } from '../../../models';
import { matchesEmployeeSearch } from './employee-search.utils';

export interface DayLogFilterInput {
  dayLogs: DayLog[];
  employeeId?: string;
  employeeSearch: string;
  onlyWithMarcaciones: boolean;
  onlyDelayed: boolean;
  delayRange: string | null;
  onlyEarlyExit: boolean;
  onlyLunchExceeded: boolean;
  lunchExceededRange: string | null;
  onlyErrors: boolean;
  /**
   * Toggle "Solo problemas": combina los 4 filtros de problema con OR.
   * Tiene prioridad sobre los flags individuales — si está activo, ignora
   * los otros y muestra cualquier fila con al menos un problema.
   */
  onlyProblems?: boolean;
}

/**
 * Filtra los DayLogs según los filtros activos.
 * Mantiene el orden original de dayLogs.
 */
export function filterDayLogs(input: DayLogFilterInput): DayLog[] {
  const {
    dayLogs,
    employeeId,
    employeeSearch,
    onlyWithMarcaciones,
    onlyDelayed,
    delayRange,
    onlyEarlyExit,
    onlyLunchExceeded,
    lunchExceededRange,
    onlyErrors,
    onlyProblems,
  } = input;

  return dayLogs.filter((x: DayLog) => {
    // Filtrar por employeeId
    if (employeeId && x.employee?.id !== employeeId) {
      return false;
    }

    // Filtrar por búsqueda de nombre.
    // Usa el mismo helper que el autocomplete (`matchesEmployeeSearch`) para
    // garantizar comportamiento consistente: normaliza acentos y compara por
    // startsWith en cada palabra. Antes este filtro usaba .includes() sin
    // normalizar, lo que hacía que buscar "Mendez" no encontrara "Méndez".
    if (employeeSearch && !matchesEmployeeSearch(x.employee || {}, employeeSearch)) {
      return false;
    }

    // Filtro: Solo marcaciones
    if (onlyWithMarcaciones) {
      const hasMarcaciones = x.entry || x.lunch_start || x.lunch_end || x.exit;
      if (!hasMarcaciones) return false;
    }

    // Filtro combinado "Solo problemas" — atajo para gerentes. Si está
    // activo, muestra cualquier fila con al menos un problema visible. Tiene
    // prioridad sobre los flags individuales y los rangos.
    if (onlyProblems) {
      const hasProblem =
        typeof x.delay === 'number' ||
        x.earlyExit === true ||
        x.lunchExceeded === true ||
        x.insufficientHours === true ||
        x.scheduleError === true ||
        x.shiftMismatch === true ||
        x.alert === 'Sin Horario' ||
        x.alert === 'Día Libre' ||
        x.alert === 'Feriado';
      return hasProblem;
    }

    // Filtro: Solo retrasados.
    // Los rangos son disjuntos: 5 entra solo en "1-5", 10 entra solo en "5-10".
    if (onlyDelayed) {
      if (typeof x.delay !== 'number' || x.delay === undefined) return false;

      if (!delayRange) return true;

      const delayMinutes = x.delay;
      if (delayRange === '1-5') return delayMinutes >= 1 && delayMinutes <= 5;
      if (delayRange === '5-10') return delayMinutes > 5 && delayMinutes <= 10;
      if (delayRange === '10+') return delayMinutes > 10;
      return false;
    }

    // Filtro: Solo salida temprana
    if (onlyEarlyExit) return x.earlyExit === true;

    // Filtro: Solo almuerzo excedido (rangos disjuntos, ver delayed arriba).
    if (onlyLunchExceeded) {
      if (!x.lunchExceeded || !x.lunchMinutes) return false;

      if (!lunchExceededRange) return true;

      const exceededMinutes = x.lunchMinutes - 60;
      if (lunchExceededRange === '1-5')
        return exceededMinutes >= 1 && exceededMinutes <= 5;
      if (lunchExceededRange === '5-10')
        return exceededMinutes > 5 && exceededMinutes <= 10;
      if (lunchExceededRange === '10+') return exceededMinutes > 10;
      return false;
    }

    // Filtro: Solo errores
    if (onlyErrors) {
      const hasMarks = x.entry || x.lunch_start || x.exit;
      if (x.scheduleError === true) return true;
      return (
        hasMarks &&
        (x.alert === 'Sin Horario' ||
          x.alert === 'Día Libre' ||
          x.alert === 'Feriado')
      );
    }

    return true;
  });
}
