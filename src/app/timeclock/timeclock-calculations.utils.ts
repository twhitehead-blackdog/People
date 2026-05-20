import {
  compareDesc,
  differenceInMinutes,
  format,
  getDate,
  getMonth,
  getYear,
  set,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  EmployeeSchedule,
  NazSchedule,
  Schedule,
  TimeLog,
} from '../models';

export function getNextTimelogType(lastType: string | null): string {
  if (!lastType) return 'entry';
  switch (lastType) {
    case 'entry':
      return 'lunch_start';
    case 'lunch_start':
      return 'lunch_end';
    case 'lunch_end':
      return 'exit';
    case 'exit':
      return 'entry';
    default:
      return 'entry';
  }
}

export function getAvailableTypes(
  lastType: string | null,
  allTypes: Array<{ value: string; label: string }>
): Array<{ value: string; label: string }> {
  // Sin marca previa: solo entry (la primera marca del día nunca puede ser exit).
  // Coincide con el trigger DB enforce_timelog_sequence.
  if (!lastType) return allTypes.filter((t) => t.value === 'entry');

  let filtered: Array<{ value: string; label: string }> = [];

  switch (lastType) {
    case 'entry':
      filtered = allTypes.filter(
        (t) => t.value === 'lunch_start' || t.value === 'exit'
      );
      break;
    case 'lunch_start':
      filtered = allTypes.filter(
        (t) => t.value === 'lunch_end' || t.value === 'exit'
      );
      break;
    case 'lunch_end':
      filtered = allTypes.filter((t) => t.value === 'exit');
      break;
    case 'exit':
      filtered = allTypes.filter((t) => t.value === 'entry');
      break;
    default:
      filtered = allTypes;
  }

  return filtered.length > 0 ? filtered : allTypes;
}

export function calculateEntryDelay(
  entryTime: Date,
  schedule: Schedule | NazSchedule | undefined
): number | null {
  if (!schedule || !schedule.entry_time || schedule.day_off) {
    return null;
  }

  const entryTimeStr = format(entryTime, 'HH:mm:ss');
  const scheduleTimeStr =
    typeof schedule.entry_time === 'string'
      ? schedule.entry_time
      : format(new Date(schedule.entry_time), 'HH:mm:ss');

  const entryParts = entryTimeStr.split(':');
  const scheduleParts = scheduleTimeStr.split(':');

  const entryDate = set(new Date(), {
    hours: +entryParts[0],
    minutes: +entryParts[1],
    seconds: +entryParts[2] || 0,
    milliseconds: 0,
  });

  const scheduleDate = set(new Date(), {
    hours: +scheduleParts[0],
    minutes: +scheduleParts[1],
    seconds: +scheduleParts[2] || 0,
    milliseconds: 0,
  });

  const delay = differenceInMinutes(entryDate, scheduleDate);

  if (delay > (schedule.minutes_tolerance || 0)) {
    return delay;
  }

  return null;
}

export function calculateLunchExcess(
  lunchEndTime: Date,
  lunchStartTime: Date | null
): { exceededMinutes: number; shouldShowWarning: boolean } | null {
  if (!lunchStartTime) return null;

  const actualDuration = differenceInMinutes(lunchEndTime, lunchStartTime);
  const expectedDuration = 60;

  if (actualDuration < expectedDuration) return null;

  const exceededMinutes = actualDuration - expectedDuration;
  return {
    exceededMinutes,
    shouldShowWarning: exceededMinutes > 5,
  };
}

export function calculateExitDifference(
  exitTime: Date,
  schedule: Schedule | NazSchedule | undefined
): { minutes: number; isEarly: boolean } | null {
  if (!schedule || !schedule.exit_time || schedule.day_off) {
    return null;
  }

  const exitTimeStr = format(exitTime, 'HH:mm:ss');
  const scheduleTimeStr =
    typeof schedule.exit_time === 'string'
      ? schedule.exit_time
      : format(new Date(schedule.exit_time), 'HH:mm:ss');

  const exitParts = exitTimeStr.split(':');
  const scheduleParts = scheduleTimeStr.split(':');

  const exitDate = set(new Date(), {
    hours: +exitParts[0],
    minutes: +exitParts[1],
    seconds: +exitParts[2] || 0,
    milliseconds: 0,
  });

  const scheduleDate = set(new Date(), {
    hours: +scheduleParts[0],
    minutes: +scheduleParts[1],
    seconds: +scheduleParts[2] || 0,
    milliseconds: 0,
  });

  const difference = differenceInMinutes(exitDate, scheduleDate);

  if (Math.abs(difference) > (schedule.minutes_tolerance || 0)) {
    return {
      minutes: Math.abs(difference),
      isEarly: difference < 0,
    };
  }

  return null;
}

export function formatTimeDifference(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${remainingMinutes} ${
    remainingMinutes === 1 ? 'minuto' : 'minutos'
  }`;
}

export function getPanamaNowParts(): {
  year: number;
  month: number;
  day: number;
} {
  const now = toZonedTime(new Date(), 'America/Panama');
  return {
    year: getYear(now),
    month: getMonth(now) + 1,
    day: getDate(now),
  };
}

export function calculateStreak(
  timelogs: TimeLog[],
  schedules: EmployeeSchedule[]
): number {
  if (!timelogs.length || !schedules.length) return 0;

  let streak = 0;
  const checkedDates = new Set<string>();

  const sortedLogs = [...timelogs].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return compareDesc(dateA, dateB);
  });

  for (const log of sortedLogs) {
    const logDate = new Date(log.created_at);
    const logDateStr = format(logDate, 'yyyy-MM-dd');

    if (checkedDates.has(logDateStr)) continue;
    checkedDates.add(logDateStr);

    const matchingSchedules = schedules.filter((s) => {
      const startDate =
        s.start_date instanceof Date ? s.start_date : new Date(s.start_date);
      const endDate =
        s.end_date instanceof Date ? s.end_date : new Date(s.end_date);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      return (
        startDateStr <= logDateStr &&
        endDateStr >= logDateStr &&
        !s.schedule?.day_off
      );
    });
    // Priorizar: individual > rango, aprobado > no aprobado, más reciente
    const schedule = matchingSchedules.length <= 1
      ? matchingSchedules[0]
      : matchingSchedules.sort((a: any, b: any) => {
          const aS = a.start_date === a.end_date ? 1 : 0;
          const bS = b.start_date === b.end_date ? 1 : 0;
          if (aS !== bS) return bS - aS;
          const aA = a.approved ? 1 : 0;
          const bA = b.approved ? 1 : 0;
          if (aA !== bA) return bA - aA;
          return (b.created_at || '') > (a.created_at || '') ? 1 : -1;
        })[0];

    if (!schedule || !schedule.schedule?.entry_time) continue;

    const entryTimeZoned = toZonedTime(logDate, 'America/Panama');
    const entryTimeStr = format(entryTimeZoned, 'HH:mm:ss');
    const scheduledTimeStr =
      typeof schedule.schedule.entry_time === 'string'
        ? schedule.schedule.entry_time
        : format(new Date(schedule.schedule.entry_time), 'HH:mm:ss');

    const entryParts = entryTimeStr.split(':');
    const scheduledParts = scheduledTimeStr.split(':');

    const entryMinutes = +entryParts[0] * 60 + +entryParts[1];
    const scheduledMinutes = +scheduledParts[0] * 60 + +scheduledParts[1];
    const tolerance = schedule.schedule.minutes_tolerance ?? 0;

    if (entryMinutes <= scheduledMinutes + tolerance) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
