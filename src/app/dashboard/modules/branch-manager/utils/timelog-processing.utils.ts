/**
 * Pure functions for processing timelogs in the branch manager view.
 * Extracted from branch-manager.component.ts filteredTimelogs computed.
 */
import { differenceInMinutes, endOfDay, startOfDay, getHours, getMinutes, getSeconds, set } from 'date-fns';
import { toDate } from 'date-fns-tz';

/** Parse DB date strings as UTC to avoid -1 day timezone offset */
export function parseUTCDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const cleanDate = dateStr.split('T')[0];
  return new Date(cleanDate + 'T12:00:00Z');
}

/** IDs of schedules that represent day-off / holiday */
export const dayOffScheduleIds = [
  'c01dff8f-ce0d-498f-a473-46418576e589', // Dia Libre
  '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
  'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
  'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
];

export function isDayOffSchedule(schedule: any): boolean {
  if (!schedule) return false;
  return (
    schedule.day_off ||
    (schedule.id && dayOffScheduleIds.includes(schedule.id)) ||
    schedule.name?.toLowerCase().includes('libre') ||
    schedule.name?.toLowerCase().includes('feriado') ||
    schedule.name?.toLowerCase().includes('vacaciones') ||
    schedule.name?.toLowerCase().includes('compensatorio')
  );
}

export function findEmployeeScheduleForDate(
  employeeId: string,
  date: Date,
  schedules: any[]
): any {
  const searchDate = startOfDay(toDate(date, { timeZone: 'America/Panama' }));

  return schedules.find((s) => {
    if (s.employee_id !== employeeId) return false;

    const start = startOfDay(toDate(s.start_date, { timeZone: 'America/Panama' }));
    const end = endOfDay(toDate(s.end_date, { timeZone: 'America/Panama' }));

    return searchDate >= start && searchDate <= end;
  });
}

export function calculateDelayMinutes(entryTime: Date, schedule: any): number {
  if (!schedule?.entry_time || schedule.day_off) return 0;

  const entryH = getHours(entryTime);
  const entryM = getMinutes(entryTime);
  const entryS = getSeconds(entryTime);

  const scheduleTimeStr =
    typeof schedule.entry_time === 'string'
      ? schedule.entry_time
      : `${getHours(new Date(schedule.entry_time)).toString().padStart(2, '0')}:${getMinutes(new Date(schedule.entry_time)).toString().padStart(2, '0')}:${getSeconds(new Date(schedule.entry_time)).toString().padStart(2, '0')}`;

  const scheduleParts = scheduleTimeStr.split(':');

  const entryDate = set(new Date(), { hours: entryH, minutes: entryM, seconds: entryS, milliseconds: 0 });

  const scheduleDate = set(new Date(), { hours: +scheduleParts[0], minutes: +scheduleParts[1], seconds: +scheduleParts[2] || 0, milliseconds: 0 });

  return differenceInMinutes(entryDate, scheduleDate);
}

export function calculateEarlyExitMinutes(exitTime: Date, schedule: any): number {
  if (!schedule?.exit_time || schedule.day_off) return 0;

  const exitH = getHours(exitTime);
  const exitM = getMinutes(exitTime);
  const exitS = getSeconds(exitTime);

  const scheduleTimeStr =
    typeof schedule.exit_time === 'string'
      ? schedule.exit_time
      : `${getHours(new Date(schedule.exit_time)).toString().padStart(2, '0')}:${getMinutes(new Date(schedule.exit_time)).toString().padStart(2, '0')}:${getSeconds(new Date(schedule.exit_time)).toString().padStart(2, '0')}`;

  const scheduleParts = scheduleTimeStr.split(':');

  const exitDate = set(new Date(), { hours: exitH, minutes: exitM, seconds: exitS, milliseconds: 0 });

  const scheduleDate = set(new Date(), { hours: +scheduleParts[0], minutes: +scheduleParts[1], seconds: +scheduleParts[2] || 0, milliseconds: 0 });

  return differenceInMinutes(scheduleDate, exitDate);
}

export function calculateLunchExceeded(
  lunchStart: Date,
  lunchEnd: Date,
  schedule: any
): boolean {
  if (!schedule?.lunch_duration_minutes || schedule.day_off) return false;

  const lunchDuration = differenceInMinutes(lunchEnd, lunchStart);
  const allowedDuration = schedule.lunch_duration_minutes;

  return lunchDuration > allowedDuration;
}

/**
 * Process raw timelogs into a display-ready array grouped by employee,
 * with violation flags (delayed, missing, early exit, lunch exceeded).
 */
export function processTimelogsForDisplay(
  logs: any[],
  schedules: any[],
  branchEmployees: any[],
  selectedDate: Date | null,
  branchId: string | null,
  selectedEmployeeId: string | null
): any[] {
  const grouped: Record<string, any> = {};

  // Step 1: Populate with employees that belong to this branch (to detect missing)
  branchEmployees.forEach((emp) => {
    const employeeSchedule = selectedDate
      ? findEmployeeScheduleForDate(emp.id, selectedDate, schedules)
      : null;

    const schedule = employeeSchedule?.schedule;
    const dayOff = isDayOffSchedule(schedule);

    grouped[emp.id] = {
      employee_id: emp.id,
      employee: emp,
      entry_time: null,
      entry_branch: null,
      lunch_start_time: null,
      lunch_start_branch: null,
      lunch_end_time: null,
      lunch_end_branch: null,
      exit_time: null,
      exit_branch: null,
      is_delayed: false,
      is_missing: !dayOff,
      is_day_off: dayOff,
      lunch_exceeded: false,
      is_early_exit: false,
      schedule: schedule,
      schedule_name: schedule?.name || 'Sin horario',
      last_entry_time: null,
    };
  });

  // Step 2: Filter logs strictly by branch_id and add people from other branches who clocked here
  const branchLogs = branchId
    ? logs.filter((log: any) => log.branch_id === branchId)
    : logs;

  branchLogs.forEach((log: any) => {
    if (!log.employee_id) return;

    if (!grouped[log.employee_id]) {
      const employeeSchedule = selectedDate
        ? findEmployeeScheduleForDate(log.employee_id, selectedDate, schedules)
        : null;
      const schedule = employeeSchedule?.schedule;
      const dayOff = isDayOffSchedule(schedule);

      grouped[log.employee_id] = {
        employee_id: log.employee_id,
        employee: log.employee || { id: log.employee_id },
        entry_time: null,
        entry_branch: null,
        lunch_start_time: null,
        lunch_start_branch: null,
        lunch_end_time: null,
        lunch_end_branch: null,
        exit_time: null,
        exit_branch: null,
        is_delayed: false,
        is_missing: false,
        is_day_off: dayOff,
        lunch_exceeded: false,
        is_early_exit: false,
        schedule: schedule,
        schedule_name: schedule?.name || 'Sin horario',
        last_entry_time: null,
      };
    }

    const logTime = new Date(log.created_at);
    const entry = grouped[log.employee_id];

    entry.is_missing = false;

    if (log.employee) {
      entry.employee = { ...entry.employee, ...log.employee };
    }

    if (log.type === 'entry') {
      if (entry.exit_time || !entry.entry_time) {
        entry.entry_time = logTime;
        entry.entry_branch = log.branch;
        entry.lunch_start_time = null;
        entry.lunch_start_branch = null;
        entry.lunch_end_time = null;
        entry.lunch_end_branch = null;
        entry.exit_time = null;
        entry.exit_branch = null;
        entry.last_entry_time = logTime;
      } else {
        entry.entry_time = entry.entry_time || logTime;
        if (!entry.entry_branch) entry.entry_branch = log.branch;
      }
    } else if (log.type === 'lunch_start') {
      if (!entry.lunch_start_time) {
        entry.lunch_start_time = logTime;
        entry.lunch_start_branch = log.branch;
      }
    } else if (log.type === 'lunch_end') {
      if (!entry.lunch_end_time) {
        entry.lunch_end_time = logTime;
        entry.lunch_end_branch = log.branch;
      }
    } else if (log.type === 'exit') {
      if (!entry.exit_time) {
        entry.exit_time = logTime;
        entry.exit_branch = log.branch;
      }
    }
  });

  // Step 3: Calculate violations for each employee
  Object.values(grouped).forEach((employeeLog: any) => {
    delete employeeLog.last_entry_time;

    if (!selectedDate) return;

    const schedule = employeeLog.schedule;
    if (!schedule || employeeLog.is_day_off) return;

    if (employeeLog.entry_time) {
      const delayMins = calculateDelayMinutes(employeeLog.entry_time, schedule);
      employeeLog.is_delayed = delayMins > 5;
      if (employeeLog.is_delayed) {
        employeeLog.delay_minutes = delayMins;
      }
    }

    if (employeeLog.exit_time) {
      const earlyExitMins = calculateEarlyExitMinutes(employeeLog.exit_time, schedule);
      employeeLog.is_early_exit = earlyExitMins > 0;
    }

    if (employeeLog.lunch_start_time && employeeLog.lunch_end_time) {
      employeeLog.lunch_exceeded = calculateLunchExceeded(
        employeeLog.lunch_start_time,
        employeeLog.lunch_end_time,
        schedule
      );
    }
  });

  let result = Object.values(grouped);

  if (selectedEmployeeId) {
    result = result.filter((log: any) => log.employee_id === selectedEmployeeId);
  }

  return result;
}
