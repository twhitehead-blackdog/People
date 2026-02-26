/**
 * Pure calculation functions for the home dashboard
 */
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInMinutes, startOfMonth, endOfMonth, parseISO, getDaysInMonth as dateFnsGetDaysInMonth, getDate, getMonth, set } from 'date-fns';

export const PANAMA_TIMEZONE = 'America/Panama';

// Schedule IDs for holidays and days off
export const FERIADO_SCHEDULE_ID = '3d07f626-d58f-4203-bac5-f6e35557e0ad';
export const DIA_LIBRE_SCHEDULE_ID = 'c01dff8f-ce0d-498f-a473-46418576e589';

/**
 * Get current Panama time parts
 */
export function getPanamaNowParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const panamaStr = formatInTimeZone(now, PANAMA_TIMEZONE, 'yyyy-MM-dd');
  const [yearStr, monthStr, dayStr] = panamaStr.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
  };
}

/**
 * Pad a number to 2 digits
 */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return dateFnsGetDaysInMonth(new Date(year, month - 1));
}

/**
 * Calculate time difference in minutes
 * Returns positive if actualTime is later than scheduledTime (late)
 * Returns negative if actualTime is earlier (early)
 */
export function calcTimeDiff(actualTime: string, scheduledTime: string): number {
  if (!actualTime || !scheduledTime) return 0;
  const actualParts = actualTime.split(':');
  const scheduledParts = scheduledTime.split(':');

  if (actualParts.length < 2 || scheduledParts.length < 2) return 0;

  const actual = set(new Date(), { hours: +actualParts[0], minutes: +actualParts[1], seconds: 0, milliseconds: 0 });
  const scheduled = set(new Date(), { hours: +scheduledParts[0], minutes: +scheduledParts[1], seconds: 0, milliseconds: 0 });

  return differenceInMinutes(actual, scheduled);
}

/**
 * Check if a schedule is a holiday or day off
 */
export function isHolidayOrDayOff(schedule: any): boolean {
  if (!schedule?.schedule) return false;
  const scheduleId = schedule.schedule.id;
  const isFeriado = scheduleId === FERIADO_SCHEDULE_ID;
  const isDiaLibre = scheduleId === DIA_LIBRE_SCHEDULE_ID;
  return isFeriado || isDiaLibre || schedule.schedule?.day_off === true;
}

/**
 * Format scheduled entry time to HH:mm:ss
 */
export function formatScheduledEntryTime(entryTime: string | Date | undefined): string | null {
  if (!entryTime) return null;

  if (entryTime instanceof Date) {
    return formatInTimeZone(entryTime, PANAMA_TIMEZONE, 'HH:mm:ss');
  }

  if (typeof entryTime === 'string') {
    const parts = entryTime.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(parts[2] || '00').padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Get birthday day as string
 */
export function getBirthdayDay(date: Date | undefined): string {
  if (!date) return '??';
  return getDate(new Date(date)).toString();
}

/**
 * Get birthday month abbreviation
 */
export function getBirthdayMonth(date: Date | undefined): string {
  if (!date) return '???';
  const months = [
    'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
    'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
  ];
  return months[getMonth(new Date(date))];
}

/**
 * Check if birthday has passed this month
 */
export function hasBirthdayPassed(date: Date | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  const birthDate = new Date(date);
  return (
    getDate(birthDate) < getDate(today) &&
    getMonth(birthDate) === getMonth(today)
  );
}

/**
 * Check if birthday is today
 */
export function isBirthdayToday(date: Date | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  const birthDate = new Date(date);
  return (
    getDate(birthDate) === getDate(today) &&
    getMonth(birthDate) === getMonth(today)
  );
}

/**
 * Get current month name in Spanish
 */
export function getCurrentMonthName(): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return months[getMonth(new Date())];
}

/**
 * Get month name abbreviation in Spanish
 */
export function getMonthNameSpanish(monthIndex: number): string {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  return months[monthIndex] ?? '';
}

/**
 * Format hire date for display
 */
export function formatHireDate(date: Date | undefined): string {
  if (!date) return 'Sin fecha';
  const d = new Date(date);
  return `${getDate(d)} de ${getBirthdayMonth(date)}`;
}

/**
 * Format exit date for display
 */
export function formatExitDate(date: Date | string | undefined): string {
  if (!date) return 'Sin fecha';
  const d = new Date(date);
  return `${getDate(d)} de ${getBirthdayMonth(d)}`;
}

/**
 * Calculate schedule compliance index
 */
export function calcScheduleComplianceIndex(lates: number, headCount: number): number {
  if (headCount === 0) return 100;
  const latesPercentage = (lates / headCount) * 100;
  const compliance = Math.max(0, 100 - latesPercentage);
  return Math.round(compliance);
}

/**
 * Calculate work climate index (placeholder calculation)
 */
export function calcWorkClimateIndex(
  retentionRate: number,
  exits: number,
  headCount: number,
  monthlyTurnover: number
): number {
  const absenteeism = headCount > 0 ? (exits / headCount) * 100 : 0;
  const baseIndex = retentionRate;
  const absenteeismPenalty = absenteeism * 0.5;
  const turnoverPenalty = monthlyTurnover * 0.3;
  const climateIndex = Math.max(0, Math.min(100, baseIndex - absenteeismPenalty - turnoverPenalty));
  return Math.round(climateIndex);
}

/**
 * Sort birthdays with today first, then upcoming, then passed
 */
export function sortBirthdays<T extends { birth_date?: Date | string }>(birthdays: T[]): T[] {
  const today = new Date();
  const currentDay = getDate(today);

  return [...birthdays].sort((a, b) => {
    if (!a.birth_date || !b.birth_date) return 0;

    const dayA = getDate(new Date(a.birth_date));
    const dayB = getDate(new Date(b.birth_date));

    // Today first
    const isTodayA = dayA === currentDay;
    const isTodayB = dayB === currentDay;
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;

    // Then upcoming (day > current)
    const isUpcomingA = dayA > currentDay;
    const isUpcomingB = dayB > currentDay;
    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;

    // Within each group, sort by day
    return dayA - dayB;
  });
}
