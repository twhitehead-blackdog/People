import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Employee } from '../../../../models';
import { DailyEmployeeBranch, PersonnelMovement } from '../models/personnel-movements.model';

interface TimelogRaw {
  id: string;
  employee_id: string;
  branch_id: string | null;
  punched_at: string;
}

/**
 * Collapse raw timelogs into one DailyEmployeeBranch per (employee, day).
 * The "dominant branch" of a day is the branch with the most punches.
 */
export function aggregateDailyBranches(
  timelogs: TimelogRaw[],
): Map<string, DailyEmployeeBranch[]> {
  // employeeId -> date -> (branchId -> count)
  const perEmployee = new Map<string, Map<string, Map<string, number>>>();

  for (const tl of timelogs) {
    if (!tl.branch_id || !tl.employee_id || !tl.punched_at) continue;
    const date = format(parseISO(tl.punched_at), 'yyyy-MM-dd');
    let byDate = perEmployee.get(tl.employee_id);
    if (!byDate) {
      byDate = new Map();
      perEmployee.set(tl.employee_id, byDate);
    }
    let byBranch = byDate.get(date);
    if (!byBranch) {
      byBranch = new Map();
      byDate.set(date, byBranch);
    }
    byBranch.set(tl.branch_id, (byBranch.get(tl.branch_id) ?? 0) + 1);
  }

  const result = new Map<string, DailyEmployeeBranch[]>();
  for (const [employeeId, byDate] of perEmployee) {
    const entries: DailyEmployeeBranch[] = [];
    for (const [date, byBranch] of byDate) {
      let dominantBranchId = '';
      let dominantCount = -1;
      let totalPunches = 0;
      const allBranchIds: string[] = [];
      for (const [branchId, count] of byBranch) {
        allBranchIds.push(branchId);
        totalPunches += count;
        if (count > dominantCount) {
          dominantCount = count;
          dominantBranchId = branchId;
        }
      }
      entries.push({ date, branchId: dominantBranchId, allBranchIds, punchCount: totalPunches });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    result.set(employeeId, entries);
  }
  return result;
}

/**
 * Infer movements for a single employee.
 *
 * A "movement" is a run of consecutive days where the employee's dominant
 * branch differs from their base branch. Non-consecutive runs (gap of more
 * than 1 calendar day) start a new movement. Runs shorter than `minDays`
 * are discarded.
 */
export function inferMovementsForEmployee(
  employee: Pick<Employee, 'id' | 'first_name' | 'father_name' | 'branch_id'>,
  dailyBranches: DailyEmployeeBranch[],
  branchNameMap: Map<string, string>,
  minDays: number,
): PersonnelMovement[] {
  const base = employee.branch_id || null;
  const result: PersonnelMovement[] = [];
  const name = `${employee.first_name} ${employee.father_name}`.trim();

  let runStartDate: string | null = null;
  let runEndDate: string | null = null;
  let runBranchId: string | null = null;
  let prevDateStr: string | null = null;

  const flush = () => {
    if (!runStartDate || !runEndDate || !runBranchId) return;
    const duration =
      differenceInCalendarDays(parseISO(runEndDate), parseISO(runStartDate)) + 1;
    if (duration >= minDays) {
      result.push({
        employeeId: employee.id,
        employeeName: name,
        employeeBaseBranchId: base,
        originBranchId: base,
        originBranchName: base ? branchNameMap.get(base) ?? null : null,
        destinationBranchId: runBranchId,
        destinationBranchName: branchNameMap.get(runBranchId) ?? runBranchId,
        startDate: runStartDate,
        endDate: runEndDate,
        durationDays: duration,
      });
    }
    runStartDate = null;
    runEndDate = null;
    runBranchId = null;
  };

  for (const day of dailyBranches) {
    const atBase = base !== null && day.branchId === base;
    const gapTooBig =
      prevDateStr !== null &&
      differenceInCalendarDays(parseISO(day.date), parseISO(prevDateStr)) > 1;

    if (atBase) {
      flush();
    } else {
      if (gapTooBig) flush();
      if (runBranchId !== null && runBranchId !== day.branchId) flush();

      if (runStartDate === null) {
        runStartDate = day.date;
        runBranchId = day.branchId;
      }
      runEndDate = day.date;
    }
    prevDateStr = day.date;
  }
  flush();
  return result;
}
