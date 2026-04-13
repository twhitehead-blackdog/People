import { format, parseISO } from 'date-fns';
import { Employee, EmployeeLateRecord, TimeoffData } from '../../../../models';
import { Incidencia } from '../models/personnel-movements.model';

/** Minimal shape of an employee_disabilities row used by this module. */
export interface DisabilityRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status?: string;
}

function fullName(e: Partial<Employee> | undefined, fallbackId: string): string {
  if (!e) return fallbackId;
  return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || fallbackId;
}

export function consolidateIncidencias(
  lates: EmployeeLateRecord[],
  disabilities: DisabilityRow[],
  unjustifiedTimeoffs: TimeoffData[],
  employeesById: Map<string, Employee>,
  branchNameMap: Map<string, string>,
): Incidencia[] {
  const result: Incidencia[] = [];

  for (const l of lates) {
    if (l.status && l.status !== 'active') continue;
    const emp = employeesById.get(l.employee_id);
    result.push({
      id: `late-${l.id}`,
      type: 'tardanza',
      employeeId: l.employee_id,
      employeeName: l.employee_name || fullName(emp, l.employee_id),
      date: l.timelog_date,
      endDate: null,
      branchId: l.branch_id ?? null,
      branchName:
        l.branch_name ?? (l.branch_id ? branchNameMap.get(l.branch_id) ?? null : null),
      detail: `${l.minutes_late} min tarde (programada ${l.scheduled_entry_time}, real ${l.actual_entry_time})`,
    });
  }

  for (const d of disabilities) {
    const emp = employeesById.get(d.employee_id);
    const empBranchId = emp?.branch_id ?? null;
    result.push({
      id: `dis-${d.id}`,
      type: 'certificado_medico',
      employeeId: d.employee_id,
      employeeName: fullName(emp, d.employee_id),
      date: d.start_date,
      endDate: d.end_date && d.end_date !== d.start_date ? d.end_date : null,
      branchId: empBranchId,
      branchName: empBranchId ? branchNameMap.get(empBranchId) ?? null : null,
      detail: d.reason?.trim() || 'Certificado médico',
    });
  }

  for (const t of unjustifiedTimeoffs) {
    if (t.is_approved) continue; // only unjustified (non-approved)
    const emp = employeesById.get(t.employee_id);
    const empBranchId = emp?.branch_id ?? null;
    result.push({
      id: `abs-${t.id}`,
      type: 'ausencia_injustificada',
      employeeId: t.employee_id,
      employeeName: fullName(emp, t.employee_id),
      date: typeof t.date_from === 'string' ? t.date_from : format(parseISO(t.date_from), 'yyyy-MM-dd'),
      endDate: t.date_to && t.date_to !== t.date_from ? t.date_to : null,
      branchId: empBranchId,
      branchName: empBranchId ? branchNameMap.get(empBranchId) ?? null : null,
      detail: 'Ausencia no justificada',
    });
  }

  result.sort((a, b) => b.date.localeCompare(a.date));
  return result;
}
