import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Employee } from '../../../../models';
import { resolveEmployeeScheduleForDate } from '../../../../utils/employee-schedule.utils';
import { Incidencia } from '../models/personnel-movements.model';

const PANAMA_TZ = 'America/Panama';
const TOLERANCE_MIN = 5;

/** "HH:MM" or "HH:MM:SS" → "h:mm AM/PM". */
function toAmPm(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export interface ScheduleRow {
  id: string;
  name?: string;
  entry_time?: string | null;
  exit_time?: string | null;
  day_off?: boolean | null;
}

export interface EmployeeScheduleRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  approved?: boolean | null;
  created_at?: string | null;
  time_off_type?: string | null;
  schedule?: ScheduleRow | null;
}

interface ExitRow {
  id: string;
  employee_id: string;
  branch_id: string | null;
  punched_at: string;
  type: string;
}

/**
 * Computes "salida temprana" incidencias by comparing each day's last exit
 * punch against the employee's scheduled exit_time (Panama timezone).
 * A 5-minute tolerance is applied (mirrors the late-arrival convention).
 */
export function computeEarlyExits(
  timelogs: ExitRow[],
  employeeSchedules: EmployeeScheduleRow[],
  employeesById: Map<string, Employee>,
  branchNameMap: Map<string, string>,
): Incidencia[] {
  // Latest exit per (employee, day in Panama tz)
  const latestExit = new Map<
    string,
    { exit: Date; branchId: string | null; date: string }
  >();
  for (const t of timelogs) {
    if (t.type !== 'exit' || !t.employee_id || !t.punched_at) continue;
    const dt = parseISO(t.punched_at);
    const date = formatInTimeZone(dt, PANAMA_TZ, 'yyyy-MM-dd');
    const key = `${t.employee_id}|${date}`;
    const cur = latestExit.get(key);
    if (!cur || cur.exit < dt) {
      latestExit.set(key, { exit: dt, branchId: t.branch_id, date });
    }
  }

  const result: Incidencia[] = [];
  for (const [key, { exit, branchId, date }] of latestExit) {
    const [employeeId] = key.split('|');
    const sched = resolveEmployeeScheduleForDate(employeeId, date, employeeSchedules);
    const s = sched?.schedule;
    if (!s || s.day_off || !s.exit_time) continue;

    const [eh, em] = s.exit_time.split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(eh) || Number.isNaN(em)) continue;

    // Compare in Panama local time: build local HH:MM for the exit.
    const localHM = formatInTimeZone(exit, PANAMA_TZ, 'HH:mm');
    const [actH, actM] = localHM.split(':').map((n) => parseInt(n, 10));
    const actualMin = actH * 60 + actM;
    const schedMin = eh * 60 + em;
    const diff = schedMin - actualMin;
    if (diff <= TOLERANCE_MIN) continue;

    const emp = employeesById.get(employeeId);
    const name = emp
      ? `${emp.first_name} ${emp.father_name}`.trim() || employeeId
      : employeeId;
    result.push({
      id: `early-${employeeId}-${date}`,
      type: 'salida_temprana',
      employeeId,
      employeeName: name,
      date,
      endDate: null,
      branchId,
      branchName: branchId ? branchNameMap.get(branchId) ?? null : null,
      detail: `${diff} min antes (programada ${toAmPm(s.exit_time)}, real ${toAmPm(localHM)})`,
    });
  }
  return result;
}
