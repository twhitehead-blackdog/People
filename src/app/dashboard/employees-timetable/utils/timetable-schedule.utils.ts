import {
  compareAsc,
  eachDayOfInterval,
  endOfDay,
  startOfDay,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { EmployeeSchedule } from '../../../models';
import {
  branchDayKey,
  conflictKey,
  getPeluqueroAfterAsistenteWarning,
  getScheduleWarningForManager,
  isAsistentePeluqueriaPosition,
  isManagerPosition,
  isPeluqueroPosition,
  parseEntryTimeToMinutes,
  SCHEDULE_ID_DIA_LIBRE,
} from '../../services/schedule-manager-rules';

export interface ShiftInterval {
  start: Date;
  end: Date;
  shift: any;
}

/**
 * Builds a map of employee_id -> sorted shift intervals from raw schedules.
 */
export function buildShiftIntervalsByEmployeeId(
  schedules: EmployeeSchedule[],
  allowedEmployeeIds: Set<string>
): Map<string, ShiftInterval[]> {
  const map = new Map<string, ShiftInterval[]>();

  for (const s of schedules) {
    if (!allowedEmployeeIds.has(s.employee_id)) continue;

    const shift = {
      id: s.id,
      employee_id: s.employee_id,
      branch_id: s.branch_id,
      start_date: s.start_date,
      end_date: s.end_date,
      schedule_id: s.schedule_id,
      schedule: (s as any).schedule,
      branch: (s as any).branch,
      approved: (s as any).approved,
    };

    const start = startOfDay(
      toDate(shift.start_date, { timeZone: 'America/Panama' })
    );
    const end = endOfDay(
      toDate(shift.end_date, { timeZone: 'America/Panama' })
    );

    const list = map.get(shift.employee_id) ?? [];
    list.push({ start, end, shift });
    list.sort((a, b) => compareAsc(a.start, b.start));
    map.set(shift.employee_id, list);
  }

  return map;
}

/**
 * Binary search for interval containing a specific date.
 */
export function findIntervalForDate(
  intervals: ShiftInterval[],
  date: Date
): ShiftInterval | null {
  let left = 0;
  let right = intervals.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const interval = intervals[mid];

    if (date >= interval.start && date <= interval.end) {
      return interval;
    }

    if (date < interval.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}

/**
 * Build conflict key set for Manager/Subgerente positions (2+ in same shift/branch/day).
 */
export function buildManagerConflictKeys(
  employees: Array<{ id: string; position_id: string; days: Array<{ date: Date }> }>,
  intervalsMap: Map<string, ShiftInterval[]>
): Set<string> {
  const countByKey = new Map<string, number>();
  for (const emp of employees) {
    if (!isManagerPosition(emp.position_id)) continue;
    const intervals = intervalsMap.get(emp.id) ?? [];
    for (const { start, end, shift } of intervals) {
      const days = eachDayOfInterval({ start, end });
      for (const d of days) {
        const key = conflictKey(d, shift?.branch_id, shift?.schedule_id);
        countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      }
    }
  }
  const conflictSet = new Set<string>();
  countByKey.forEach((count, key) => {
    if (count >= 2) conflictSet.add(key);
  });
  return conflictSet;
}

/**
 * Build conflict key set for Peluquero positions (2+ in same shift/branch/day).
 * Uses all employee_schedules to avoid depending on filtered list.
 */
export function buildPeluqueroConflictKeys(
  schedules: EmployeeSchedule[],
  allEmployees: Array<{ id: string; position_id: string }>
): Set<string> {
  const countByKey = new Map<string, number>();
  for (const s of schedules) {
    const emp = allEmployees.find((e) => e.id === s.employee_id);
    if (!isPeluqueroPosition(emp?.position_id)) continue;
    const start = startOfDay(toDate(s.start_date, { timeZone: 'America/Panama' }));
    const end = endOfDay(toDate(s.end_date, { timeZone: 'America/Panama' }));
    const days = eachDayOfInterval({ start, end });
    for (const d of days) {
      const key = conflictKey(d, s.branch_id, s.schedule_id);
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
    }
  }
  const conflictSet = new Set<string>();
  countByKey.forEach((count, key) => {
    if (count >= 2) conflictSet.add(key);
  });
  return conflictSet;
}

/**
 * Build map of (date|branch_id) -> minimum entry_time in minutes for Asistente de Peluquería.
 */
export function buildAsistenteMinEntryMinutesByKey(
  schedules: EmployeeSchedule[],
  allEmployees: Array<{ id: string; position_id: string }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of schedules) {
    const emp = allEmployees.find((e) => e.id === s.employee_id);
    if (!isAsistentePeluqueriaPosition(emp?.position_id)) continue;
    const shift = {
      start_date: s.start_date,
      end_date: s.end_date,
      branch_id: s.branch_id,
      schedule: (s as any).schedule,
    };
    const start = startOfDay(toDate(shift.start_date, { timeZone: 'America/Panama' }));
    const end = endOfDay(toDate(shift.end_date, { timeZone: 'America/Panama' }));
    const days = eachDayOfInterval({ start, end });
    const entryMin = parseEntryTimeToMinutes(shift.schedule?.entry_time);
    if (entryMin == null) continue;
    for (const d of days) {
      const key = branchDayKey(d, shift.branch_id);
      const current = map.get(key);
      if (current == null || entryMin < current) map.set(key, entryMin);
    }
  }
  return map;
}

/**
 * Get schedule warning message for a cell based on position rules.
 */
export function getCellScheduleWarning(
  positionId: string | undefined,
  date: Date,
  shift: any,
  managerConflicts: Set<string>,
  peluqueroConflicts: Set<string>,
  asistenteMinEntry: Map<string, number>
): string | null {
  const msgs: string[] = [];

  if (isManagerPosition(positionId) && shift) {
    const scheduleWarn = getScheduleWarningForManager(
      shift.schedule_id, date, positionId, shift?.schedule?.day_off
    );
    if (scheduleWarn) msgs.push(scheduleWarn);
    const key = conflictKey(date, shift.branch_id, shift.schedule_id);
    if (managerConflicts.has(key)) {
      const isDayOff =
        shift?.schedule_id === SCHEDULE_ID_DIA_LIBRE || shift?.schedule?.day_off === true;
      msgs.push(
        isDayOff
          ? 'Gerente y Subgerente no deberían tener el mismo día libre en la misma sucursal.'
          : 'Gerente y Subgerente no deberían estar en el mismo turno en la misma sucursal.'
      );
    }
  }

  if (isPeluqueroPosition(positionId) && shift) {
    const key = conflictKey(date, shift.branch_id, shift.schedule_id);
    if (peluqueroConflicts.has(key)) {
      msgs.push('No deben haber 2 peluqueros con el mismo horario en la misma sucursal.');
    }
    const dayOff =
      shift?.schedule_id === SCHEDULE_ID_DIA_LIBRE || shift?.schedule?.day_off === true;
    if (!dayOff && shift?.branch_id) {
      const peluqueroEntry = parseEntryTimeToMinutes(shift?.schedule?.entry_time);
      const bdKey = branchDayKey(date, shift.branch_id);
      const asistenteMin = asistenteMinEntry.get(bdKey) ?? null;
      const afterWarn = getPeluqueroAfterAsistenteWarning(peluqueroEntry, asistenteMin);
      if (afterWarn) msgs.push(afterWarn);
    }
  }

  return msgs.length ? msgs.join(' ') : null;
}
