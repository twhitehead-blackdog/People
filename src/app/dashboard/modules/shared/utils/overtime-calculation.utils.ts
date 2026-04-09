/**
 * Pure utility functions for overtime calculation from timelogs.
 * Processes raw timelog records into overtime day summaries.
 */

import { differenceInMinutes, format, isValid } from 'date-fns';

export interface OvertimeDaySummary {
  day: string;
  overtimeHours: number;
  entryTime?: string;
  exitTime?: string;
  totalHours?: number;
}

/** Sum consumed hours grouped by day. */
export function sumConsumedHoursByDay(
  rows: Array<{ overtime_day?: string; hours_used?: any }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const day = r?.overtime_day ? String(r.overtime_day).slice(0, 10) : null;
    if (!day) continue;
    const hours = Number(r?.hours_used ?? 0);
    if (!Number.isFinite(hours) || hours <= 0) continue;
    map.set(day, (map.get(day) ?? 0) + hours);
  }
  return map;
}

/** Group timelogs by day with entry/exit/lunch records. Returns only days with both entry and exit. */
export function processTimelogsForOvertime(timelogs: any[]): any[] {
  const processed = timelogs
    .map((x) => ({
      ...x,
      day: x.day
        ? String(x.day).slice(0, 10)
        : format(new Date(x.created_at), 'yyyy-MM-dd'),
    }))
    .reduce<any[]>((acc, x) => {
      const existing = acc.find((item) => item.day === x.day);
      if (!existing) {
        acc.push({
          day: x.day,
          entry:
            x.type === 'entry' ? { date: new Date(x.created_at) } : undefined,
          lunch_start:
            x.type === 'lunch_start'
              ? { date: new Date(x.created_at) }
              : undefined,
          lunch_end:
            x.type === 'lunch_end'
              ? { date: new Date(x.created_at) }
              : undefined,
          exit:
            x.type === 'exit' ? { date: new Date(x.created_at) } : undefined,
        });
      } else {
        if (x.type === 'entry')
          existing.entry = { date: new Date(x.created_at) };
        if (x.type === 'lunch_start')
          existing.lunch_start = { date: new Date(x.created_at) };
        if (x.type === 'lunch_end')
          existing.lunch_end = { date: new Date(x.created_at) };
        if (x.type === 'exit')
          existing.exit = { date: new Date(x.created_at) };
      }
      return acc;
    }, []);

  return processed.filter((log) => log.entry && log.exit);
}

/** Calculate total overtime hours from processed logs. */
export function calculateTotalOvertimeHours(logs: any[], requiredMinutesPerDay = 480): number {
  let totalOvertimeMinutes = 0;

  logs.forEach((log) => {
    if (!log.entry || !log.exit) return;

    const entryDate = new Date(log.entry.date);
    const exitDate = new Date(log.exit.date);
    if (!isValid(entryDate) || !isValid(exitDate)) return;

    const totalMinutes = differenceInMinutes(exitDate, entryDate);
    const lunchMinutes =
      log.lunch_start && log.lunch_end
        ? differenceInMinutes(
            new Date(log.lunch_end.date),
            new Date(log.lunch_start.date)
          )
        : 0;

    const lunchToSubtract = Math.max(0, Math.min(lunchMinutes, 60));
    const workMinutes = totalMinutes - lunchToSubtract;
    const overtimeMinutes = Math.max(0, workMinutes - requiredMinutesPerDay);

    totalOvertimeMinutes += overtimeMinutes;
  });

  return totalOvertimeMinutes / 60;
}

/** Extract days with overtime > 0 with detailed info. */
export function extractOvertimeDays(logs: any[], requiredMinutesPerDay = 480): OvertimeDaySummary[] {
  const overtimeDays: OvertimeDaySummary[] = [];

  logs.forEach((log) => {
    if (!log.entry || !log.exit) return;

    const entryDate = new Date(log.entry.date);
    const exitDate = new Date(log.exit.date);
    if (!isValid(entryDate) || !isValid(exitDate)) return;

    const totalMinutes = differenceInMinutes(exitDate, entryDate);
    const lunchMinutes =
      log.lunch_start && log.lunch_end
        ? differenceInMinutes(
            new Date(log.lunch_end.date),
            new Date(log.lunch_start.date)
          )
        : 0;

    const lunchToSubtract = Math.max(0, Math.min(lunchMinutes, 60));
    const workMinutes = totalMinutes - lunchToSubtract;
    const overtimeMinutes = Math.max(0, workMinutes - requiredMinutesPerDay);

    if (overtimeMinutes > 0) {
      overtimeDays.push({
        day: log.day,
        overtimeHours: overtimeMinutes / 60,
        entryTime: format(entryDate, 'HH:mm'),
        exitTime: format(exitDate, 'HH:mm'),
        totalHours: workMinutes / 60,
      });
    }
  });

  return overtimeDays;
}
