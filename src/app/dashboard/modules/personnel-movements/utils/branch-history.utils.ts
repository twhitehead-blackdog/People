import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Employee } from '../../../../models';
import { BranchHistoryEntry, DailyEmployeeBranch } from '../models/personnel-movements.model';

/**
 * Build a chronological branch-stay history for an employee.
 * Unlike inferMovements, this includes stays at the base branch too,
 * and does not apply a minDays threshold.
 */
export function buildBranchHistory(
  employee: Pick<Employee, 'id' | 'first_name' | 'father_name' | 'branch_id'>,
  dailyBranches: DailyEmployeeBranch[],
  branchNameMap: Map<string, string>,
): BranchHistoryEntry[] {
  const result: BranchHistoryEntry[] = [];
  const name = `${employee.first_name} ${employee.father_name}`.trim();
  const base = employee.branch_id || null;

  let runStart: string | null = null;
  let runEnd: string | null = null;
  let runBranch: string | null = null;
  let prev: string | null = null;

  const flush = () => {
    if (!runStart || !runEnd || !runBranch) return;
    const duration =
      differenceInCalendarDays(parseISO(runEnd), parseISO(runStart)) + 1;
    result.push({
      employeeId: employee.id,
      employeeName: name,
      branchId: runBranch,
      branchName: branchNameMap.get(runBranch) ?? runBranch,
      startDate: runStart,
      endDate: runEnd,
      durationDays: duration,
      movementType: base !== null && runBranch === base ? 'base' : 'movimiento',
    });
    runStart = null;
    runEnd = null;
    runBranch = null;
  };

  for (const day of dailyBranches) {
    const gap =
      prev !== null && differenceInCalendarDays(parseISO(day.date), parseISO(prev)) > 1;
    if (gap) flush();
    if (runBranch !== null && runBranch !== day.branchId) flush();

    if (runStart === null) {
      runStart = day.date;
      runBranch = day.branchId;
    }
    runEnd = day.date;
    prev = day.date;
  }
  flush();
  return result;
}
