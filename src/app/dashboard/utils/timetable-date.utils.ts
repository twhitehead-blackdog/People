import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getMonth,
  getYear,
  startOfMonth,
  startOfWeek,
  differenceInMilliseconds,
} from 'date-fns';

/**
 * Genera un array de 7 días (domingo a sábado) a partir de una fecha de inicio de semana
 */
export function generateWeekDays(
  startDate: Date
): Array<{ date: Date; day: number; shift: any }> {
  let current = startDate;
  const dayList: { date: Date; day: number; shift: any }[] = [];

  // Iterar exactamente 7 días (domingo a sábado) para asegurar que se incluyan todos los días
  for (let i = 0; i < 7; i++) {
    dayList.push({
      date: current,
      day: getDate(current),
      shift: undefined,
    });
    current = addDays(current, 1);
  }

  return dayList;
}

/**
 * Formatea el rango de una semana como string (dd/MM/yyyy - dd/MM/yyyy)
 */
export function formatWeekRange(start: Date, end: Date): string {
  return format(start, 'dd/MM/yyyy') + ' - ' + format(end, 'dd/MM/yyyy');
}

/**
 * Calcula las semanas que contiene un mes
 * @returns Array de números de semana (1, 2, 3, etc.)
 */
export function getWeeksInMonth(month: Date): number[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const weeks: number[] = [];

  // Calcular la primera semana que incluye días del mes
  let currentDate = startOfWeek(start, { weekStartsOn: 0 });
  let weekNumber = 1;
  const maxWeeks = 6; // Un mes puede tener máximo 6 semanas

  // Iterar hasta cubrir todo el mes o hasta 6 semanas
  while (weekNumber <= maxWeeks && currentDate <= end) {
    // Verificar si esta semana tiene al menos un día del mes
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    if (weekEnd >= start && currentDate <= end) {
      weeks.push(weekNumber);
    }
    currentDate = addWeeks(currentDate, 1);
    weekNumber++;
  }

  return weeks.length > 0 ? weeks : [1]; // Al menos una semana
}

/**
 * Calcula en qué semana del mes se encuentra una fecha
 * @returns Número de semana del mes (1, 2, 3, etc.)
 */
export function getCurrentWeekOfMonth(date: Date): number {
  const monthStart = startOfMonth(date);
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const dateWeekStart = startOfWeek(date, { weekStartsOn: 0 });
  const diffInWeeks = Math.floor(
    differenceInMilliseconds(dateWeekStart, firstWeekStart) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return diffInWeeks + 1;
}

/**
 * Genera opciones de meses para un selector
 * Incluye los últimos 12 meses y los próximos 3 meses
 */
export function getMonthOptions(): { label: string; value: Date }[] {
  const options: { label: string; value: Date }[] = [];
  const today = new Date();
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Agregar los últimos 12 meses y los próximos 3 meses
  for (let i = -12; i <= 3; i++) {
    const date = new Date(getYear(today), getMonth(today) + i, 1);
    const monthName = monthNames[getMonth(date)];
    options.push({
      label: `${monthName} ${getYear(date)}`,
      value: date,
    });
  }

  return options;
}
