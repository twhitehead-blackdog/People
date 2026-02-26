import { DayLog } from '../../../models';

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
  } = input;

  return dayLogs.filter((x: DayLog) => {
    // Filtrar por employeeId
    if (employeeId && x.employee?.id !== employeeId) {
      return false;
    }

    // Filtrar por búsqueda de nombre
    if (employeeSearch) {
      const firstName = (x.employee?.first_name || '').trim().toLowerCase();
      const middleName = (x.employee?.middle_name || '').trim().toLowerCase();
      const fatherName = (x.employee?.father_name || '').trim().toLowerCase();
      const motherName = (x.employee?.mother_name || '').trim().toLowerCase();

      const shortName = `${firstName} ${fatherName}`.trim();
      const fullName =
        `${firstName} ${middleName} ${fatherName} ${motherName}`.trim();
      const allNames = [firstName, middleName, fatherName, motherName].filter(
        (n) => n.length > 0
      );

      const searchWords = employeeSearch
        .split(/\s+/)
        .filter((w) => w.length > 0);

      let matchesSearch = false;

      if (searchWords.length === 1) {
        const word = searchWords[0];
        matchesSearch =
          fullName.includes(word) ||
          shortName.includes(word) ||
          allNames.some((name) => name.includes(word));
      } else {
        matchesSearch = searchWords.every(
          (word) =>
            fullName.includes(word) ||
            shortName.includes(word) ||
            allNames.some((name) => name.includes(word))
        );
      }

      if (!matchesSearch) return false;
    }

    // Filtro: Solo marcaciones
    if (onlyWithMarcaciones) {
      const hasMarcaciones = x.entry || x.lunch_start || x.lunch_end || x.exit;
      if (!hasMarcaciones) return false;
    }

    // Filtro: Solo retrasados
    if (onlyDelayed) {
      if (typeof x.delay !== 'number' || x.delay === undefined) return false;

      if (!delayRange) return true;

      const delayMinutes = x.delay;
      if (delayRange === '1-5') return delayMinutes >= 1 && delayMinutes <= 5;
      if (delayRange === '5-10') return delayMinutes >= 5 && delayMinutes <= 10;
      if (delayRange === '10+') return delayMinutes > 10;
      return false;
    }

    // Filtro: Solo salida temprana
    if (onlyEarlyExit) return x.earlyExit === true;

    // Filtro: Solo almuerzo excedido
    if (onlyLunchExceeded) {
      if (!x.lunchExceeded || !x.lunchMinutes) return false;

      if (!lunchExceededRange) return true;

      const exceededMinutes = x.lunchMinutes - 60;
      if (lunchExceededRange === '1-5')
        return exceededMinutes >= 1 && exceededMinutes <= 5;
      if (lunchExceededRange === '5-10')
        return exceededMinutes >= 5 && exceededMinutes <= 10;
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
