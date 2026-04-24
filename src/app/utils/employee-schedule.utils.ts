import { formatInTimeZone } from 'date-fns-tz';

const PANAMA_TZ = 'America/Panama' as const;

/**
 * Canonical resolver: given an employee, a target date, and a list of
 * employee_schedules rows (pre-filtered or full list), returns the single
 * row that applies for that date.
 *
 * Priority (in order):
 *   1. Individual override (start_date === end_date) over multi-day range
 *   2. approved === true over unapproved
 *   3. created_at descending (newest wins)
 *
 * date can be a 'YYYY-MM-DD' string or a Date object (converted to Panama
 * local date for comparison).
 */
export function resolveEmployeeScheduleForDate<
  T extends {
    employee_id: string;
    start_date: string;
    end_date: string;
    approved?: boolean | null;
    created_at?: string | null;
    time_off_type?: string | null;
  },
>(employeeId: string, date: Date | string, schedules: T[]): T | undefined {
  const dateStr =
    typeof date === 'string'
      ? date
      : formatInTimeZone(date, PANAMA_TZ, 'yyyy-MM-dd');

  const matches = schedules.filter(
    (s) =>
      s.employee_id === employeeId &&
      s.start_date <= dateStr &&
      s.end_date >= dateStr &&
      // compensatory_hours is additive (badge only) — it must NOT replace
      // the regular schedule. compensatory_day stays (full day off).
      s.time_off_type !== 'compensatory_hours',
  );

  if (matches.length <= 1) return matches[0];

  return [...matches].sort((a, b) => {
    const aSingle = a.start_date === a.end_date ? 1 : 0;
    const bSingle = b.start_date === b.end_date ? 1 : 0;
    if (aSingle !== bSingle) return bSingle - aSingle;

    const aApproved = a.approved ? 1 : 0;
    const bApproved = b.approved ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;

    const aC = a.created_at ?? '';
    const bC = b.created_at ?? '';
    return bC > aC ? 1 : bC < aC ? -1 : 0;
  })[0];
}
