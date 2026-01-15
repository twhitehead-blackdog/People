import { differenceInMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Timezone for Panama - Central Standard Time (UTC-5)
 */
export const TIMEZONE_PANAMA = 'America/Panama';

/**
 * Short Spanish month names (0-11)
 */
export const MONTH_NAMES_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

/**
 * Pads a number to 2 digits with leading zeros
 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Gets the current date parts in Panama timezone
 * @returns Object with year, month (1-12), and day
 */
export function getPanamaNowParts(): {
  year: number;
  month: number;
  day: number;
} {
  const now = new Date();
  const year = parseInt(formatInTimeZone(now, TIMEZONE_PANAMA, 'yyyy'), 10);
  const month = parseInt(formatInTimeZone(now, TIMEZONE_PANAMA, 'MM'), 10); // 1-12
  const day = parseInt(formatInTimeZone(now, TIMEZONE_PANAMA, 'd'), 10);
  return { year, month, day };
}

/**
 * Gets the number of days in a specific month
 * @param year Full year (e.g., 2024)
 * @param month Month number (1-12)
 * @returns Number of days in the month
 */
export function getDaysInMonth(year: number, month: number): number {
  // Using Date.UTC to avoid timezone issues
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Calculates the time difference between two time strings
 * @param actualTime Time string in HH:mm format
 * @param scheduledTime Time string in HH:mm format
 * @returns Minutes difference - positive if late, negative if early
 */
export function calcTimeDiff(
  actualTime: string,
  scheduledTime: string
): number {
  if (!actualTime || !scheduledTime) return 0;

  const actualParts = actualTime.split(':');
  const scheduledParts = scheduledTime.split(':');

  if (actualParts.length < 2 || scheduledParts.length < 2) return 0;

  const actual = new Date();
  const scheduled = new Date();

  actual.setHours(+actualParts[0], +actualParts[1], 0, 0);
  scheduled.setHours(+scheduledParts[0], +scheduledParts[1], 0, 0);

  return differenceInMinutes(actual, scheduled);
}

/**
 * Gets the short Spanish month name
 * @param monthIndex Month index (0-11)
 * @returns Short month name in Spanish (Ene, Feb, etc.)
 */
export function getMonthNameSpanish(monthIndex: number): string {
  return MONTH_NAMES_SHORT_ES[monthIndex] ?? '';
}

/**
 * Formats a date in Panama timezone with the given format string
 * @param date Date to format
 * @param formatStr date-fns format string
 * @returns Formatted date string in Panama timezone
 */
export function formatInPanamaTimezone(date: Date, formatStr: string): string {
  return formatInTimeZone(date, TIMEZONE_PANAMA, formatStr);
}
