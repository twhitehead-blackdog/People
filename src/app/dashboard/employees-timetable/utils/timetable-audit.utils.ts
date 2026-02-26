import { ScheduleAuditLog } from '../../../services/schedule-audit.service';

export function getAuditActionLabel(action: ScheduleAuditLog['action']): string {
  const labels: Record<string, string> = {
    created: 'Creado',
    updated: 'Actualizado',
    deleted: 'Eliminado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    split: 'Dividido',
    split_range: 'Día eliminado de rango',
  };
  return labels[action] || action;
}

export function getAuditActionIcon(action: ScheduleAuditLog['action']): string {
  const icons: Record<string, string> = {
    created: 'pi-plus-circle',
    updated: 'pi-pencil',
    deleted: 'pi-trash',
    approved: 'pi-check-circle',
    rejected: 'pi-times-circle',
    split: 'pi-arrows-split',
    split_range: 'pi-calendar-minus',
  };
  return icons[action] || 'pi-info-circle';
}

export function getAuditActionColor(action: ScheduleAuditLog['action']): string {
  const colors: Record<string, string> = {
    created: 'text-green-400',
    updated: 'text-blue-400',
    deleted: 'text-red-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
    split: 'text-orange-400',
    split_range: 'text-yellow-400',
  };
  return colors[action] || 'text-gray-400';
}

export const AUDIT_ACTION_OPTIONS = [
  { label: 'Todas', value: null },
  { label: 'Creado', value: 'created' },
  { label: 'Editado', value: 'updated' },
  { label: 'Eliminado', value: 'deleted' },
  { label: 'Aprobado', value: 'approved' },
  { label: 'Rechazado', value: 'rejected' },
  { label: 'Dividido', value: 'split' },
  { label: 'Día eliminado de rango', value: 'split_range' },
];

export interface AuditFilterInput {
  allAuditHistory: ScheduleAuditLog[];
  selectedEmployeeFilter: string | null;
  selectedDateRange: Date[] | null;
  selectedActionFilter: string | null;
  auditSearchText: string;
}

export function filterAuditHistory(input: AuditFilterInput): ScheduleAuditLog[] {
  let filtered = [...input.allAuditHistory];

  if (input.selectedEmployeeFilter) {
    filtered = filtered.filter(
      (log) =>
        log.employee_schedule?.employee_id === input.selectedEmployeeFilter
    );
  }

  if (input.selectedDateRange && input.selectedDateRange.length === 2) {
    const [start, end] = input.selectedDateRange;
    filtered = filtered.filter((log) => {
      const logDate = new Date(log.changed_at);
      return logDate >= start && logDate <= end;
    });
  }

  if (input.selectedActionFilter) {
    filtered = filtered.filter(
      (log) => log.action === input.selectedActionFilter
    );
  }

  const searchText = input.auditSearchText.toLowerCase().trim();
  if (searchText) {
    filtered = filtered.filter((log) => {
      const employeeName =
        log.employee_schedule?.employee?.first_name +
        ' ' +
        log.employee_schedule?.employee?.father_name;
      const changedByName =
        log.changed_by_employee?.first_name +
        ' ' +
        log.changed_by_employee?.father_name;
      const comment = log.comment || '';
      return (
        employeeName?.toLowerCase().includes(searchText) ||
        changedByName?.toLowerCase().includes(searchText) ||
        comment.toLowerCase().includes(searchText) ||
        getAuditActionLabel(log.action).toLowerCase().includes(searchText)
      );
    });
  }

  return filtered;
}
