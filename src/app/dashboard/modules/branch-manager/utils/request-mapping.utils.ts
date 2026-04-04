/**
 * Pure functions for mapping and unifying branch employee requests.
 * Extracted from branch-manager.component.ts unifiedRequests / branchEmployeeRequests computeds.
 */
import { format, compareDesc } from 'date-fns';
import {
  getRequestColorClass,
  getRequestIcon,
  getRequestStatusLabel,
  getRequestStatusSeverity,
  getRequestTypeLabel,
  getRequestTypeSeverity,
} from '../../../request.helpers';
import { parseUTCDateString } from './timelog-processing.utils';

/**
 * Combine compensatory, disabilities, vacations and document requests
 * for employees in the current branch, enriched with employee data.
 */
export function mapBranchEmployeeRequests(
  compensatory: any[],
  disabilities: any[],
  vacations: any[],
  documents: any[],
  workPermits: any[],
  branchEmployeeIds: Set<string>,
  branchId: string,
  employeeMap: Record<string, any>,
  scheduleChanges: any[] = []
): any[] {
  const enrichedCompensatory = compensatory
    .filter((r) => r.employee?.branch_id === branchId)
    .map((r) => {
      const reviewer = r.reviewed_by ? employeeMap[r.reviewed_by] : null;
      return {
        ...r,
        reviewedByEmployee: reviewer
          ? `${reviewer.first_name} ${reviewer.father_name}`
          : r.reviewed_by,
        requestType: 'compensatorio' as const,
      };
    });

  const enrichedDisabilities = disabilities
    .filter((r) => branchEmployeeIds.has(r.employee_id))
    .map((r) => {
      const employee = employeeMap[r.employee_id];
      const reviewer = r.reviewed_by ? employeeMap[r.reviewed_by] : null;
      return {
        ...r,
        employee: employee || undefined,
        reviewedByEmployee: reviewer
          ? `${reviewer.first_name} ${reviewer.father_name}`
          : r.reviewed_by,
        requestType: 'incapacidad' as const,
      };
    });

  const enrichedVacations = vacations
    .filter((r) => branchEmployeeIds.has(r.employee_id))
    .map((r) => {
      const employee = employeeMap[r.employee_id];
      const reviewer = r.reviewed_by ? employeeMap[r.reviewed_by] : null;
      return {
        ...r,
        employee: employee || undefined,
        reviewedByEmployee: reviewer
          ? `${reviewer.first_name} ${reviewer.father_name}`
          : r.reviewed_by,
        requestType: 'vacaciones' as const,
      };
    });

  const enrichedDocuments = documents
    .filter((r) => branchEmployeeIds.has(r.employee_id))
    .map((r) => {
      const employee = employeeMap[r.employee_id];
      const reviewer = r.reviewed_by ? employeeMap[r.reviewed_by] : null;

      let requestType: 'documentos' | 'uniform_request' | 'timelog_correction' | 'supply_request' = 'documentos';
      if (r.document_type === 'uniform_request') {
        requestType = 'uniform_request';
      } else if (r.document_type === 'timelog_correction') {
        requestType = 'timelog_correction';
      } else if (r.document_type === 'supply_request') {
        requestType = 'supply_request';
      }

      return {
        ...r,
        employee: employee || undefined,
        reviewedByEmployee: reviewer
          ? `${reviewer.first_name} ${reviewer.father_name}`
          : r.reviewed_by,
        requestType,
        status: r.status || 'pending',
      };
    });

  const enrichedWorkPermits = workPermits
    .filter((r) => r.employee?.branch_id === branchId)
    .map((r) => {
      const reviewer = r.reviewed_by ? employeeMap[r.reviewed_by] : null;
      return {
        ...r,
        reviewedByEmployee: reviewer
          ? `${reviewer.first_name} ${reviewer.father_name}`
          : r.reviewed_by,
        requestType: 'work_permit' as const,
      };
    });

  const enrichedScheduleChanges = scheduleChanges
    .filter((r) => r.employee?.branch_id === branchId || branchEmployeeIds.has(r.employee_id))
    .map((r) => ({
      ...r,
      requestType: 'schedule_change' as const,
    }));

  return [
    ...enrichedCompensatory,
    ...enrichedDisabilities,
    ...enrichedVacations,
    ...enrichedDocuments,
    ...enrichedWorkPermits,
    ...enrichedScheduleChanges,
  ].sort(
    (a, b) => compareDesc(new Date(a.created_at), new Date(b.created_at))
  );
}

/**
 * Map a single branch employee request into a unified display object
 * with display fields (displayDate, summary, details, status/type labels).
 */
export function mapUnifiedRequest(r: any): any {
  let displayDate = '';
  let displayDateLabel = 'Fecha';
  let summary = '';
  let details: { label: string; value: string }[] = [];
  let cleanReason = '';

  if (r.requestType === 'compensatorio') {
    const fromDate = parseUTCDateString(r.date_from);
    const toDateVal = parseUTCDateString(r.date_to);
    const from = fromDate ? format(fromDate, 'dd/MM/yyyy') : '-';
    const to = toDateVal ? format(toDateVal, 'dd/MM/yyyy') : '-';

    if (r.compensatory_type === 'hours' || from === to) {
      displayDate = from;
      displayDateLabel = 'Fecha del compensatorio';
    } else {
      displayDate = `${from} – ${to}`;
      displayDateLabel = 'Período del compensatorio';
    }
    summary = 'Compensatorio';
    details = [
      { label: 'Fecha del compensatorio', value: displayDate },
      { label: 'Tipo', value: r.compensatory_type === 'hours' ? 'Horas' : 'Días' },
      {
        label: 'Cantidad',
        value: `${r.compensatory_amount} ${r.compensatory_type === 'hours' ? 'hora(s)' : 'día(s)'}`,
      },
    ];

    if (r.notes) {
      if (Array.isArray(r.notes)) {
        const reasonNote = r.notes.find(
          (note: any) =>
            typeof note === 'string' &&
            note.trim() !== '' &&
            !note.includes('Tipo:') &&
            !note.includes('Cantidad solicitada:') &&
            !note.includes('Fecha compensatorio:') &&
            !note.includes('Hora inicio:') &&
            !note.includes('Hora fin:') &&
            !note.includes('Fechas horas extra:')
        );
        if (reasonNote) cleanReason = reasonNote;
      } else if (typeof r.notes === 'string') {
        const parts = r.notes.split(',');
        const cleanParts = parts
          .map((p: string) => p.trim())
          .filter(
            (p: string) =>
              p !== '' &&
              !p.startsWith('Tipo:') &&
              !p.startsWith('Cantidad solicitada:') &&
              !p.startsWith('Fecha compensatorio:') &&
              !p.startsWith('Hora inicio:') &&
              !p.startsWith('Hora fin:') &&
              !p.startsWith('Fechas horas extra:')
          );
        cleanReason = cleanParts.join(', ');
      }
    }

    if (cleanReason) {
      details.push({ label: 'Notas', value: cleanReason });
    }
  } else if (r.requestType === 'incapacidad') {
    const startDate = parseUTCDateString(r.start_date);
    const endDate = parseUTCDateString(r.end_date);
    const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
    const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

    if (start === end) {
      displayDate = start;
      displayDateLabel = 'Fecha';
    } else {
      displayDate = `${start} – ${end}`;
      displayDateLabel = 'Período';
    }
    summary = 'Incapacidad Médica';
    details = [
      { label: 'Fecha de Inicio', value: start },
      { label: 'Fecha de Fin', value: end },
    ];
    if (r.description) details.push({ label: 'Descripción', value: r.description });
  } else if (r.requestType === 'vacaciones') {
    const startDate = parseUTCDateString(r.start_date);
    const endDate = parseUTCDateString(r.end_date);
    const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
    const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

    if (start === end) {
      displayDate = start;
      displayDateLabel = 'Fecha';
    } else {
      displayDate = `${start} – ${end}`;
      displayDateLabel = 'Período';
    }
    summary = 'Vacaciones';
    if (r.reason) details.push({ label: 'Razón', value: r.reason });
  } else if (r.requestType === 'documentos') {
    const reqDate = parseUTCDateString(r.required_date);
    displayDate = reqDate ? format(reqDate, 'dd/MM/yyyy') : '-';
    summary = r.document_type || 'Solicitud de Documento';
    details = [{ label: 'Fecha requerida', value: displayDate }];
    if (r.reason) details.push({ label: 'Razón', value: r.reason });
  } else if (r.requestType === 'uniform_request') {
    const metadata = r.metadata || {};
    displayDate = r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '-';
    const itemType = metadata.item_type || 'Prenda';
    const size = metadata.size || '-';
    const quantity = metadata.quantity || 1;
    summary = `${quantity}x ${itemType} - Talla ${size}`;
    details = [
      { label: 'Prenda', value: itemType },
      { label: 'Talla', value: size },
      { label: 'Cantidad', value: String(quantity) },
    ];
    if (r.reason) details.push({ label: 'Notas', value: r.reason });
  } else if (r.requestType === 'supply_request') {
    const metadata = r.metadata || {};
    displayDate = r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '-';
    const area = metadata.area || '-';
    const description = metadata.supply_description || '-';
    const reason = metadata.supply_reason || r.reason || '-';
    summary = `Insumo - ${area}`;
    details = [
      { label: 'Área', value: area },
      { label: 'Descripción', value: description },
      { label: 'Motivo', value: reason },
    ];
  } else if (r.requestType === 'timelog_correction') {
    const metadata = r.metadata || {};
    const timelogDateParsed = parseUTCDateString(metadata.timelog_date);
    const timelogDate = timelogDateParsed ? format(timelogDateParsed, 'dd/MM/yyyy') : '-';
    displayDate = timelogDate;
    const timelogTypeLabels: Record<string, string> = {
      entry: 'Entrada',
      lunch_start: 'Inicio Almuerzo',
      lunch_end: 'Fin Almuerzo',
      exit: 'Salida',
    };
    const timelogTypeLabel = timelogTypeLabels[metadata.timelog_type] || metadata.timelog_type || '-';
    summary = `Corrección de ${timelogTypeLabel}`;
    details = [
      { label: 'Fecha', value: timelogDate },
      { label: 'Tipo de Marcación', value: timelogTypeLabel },
    ];
    if (r.reason) details.push({ label: 'Motivo', value: r.reason });
    if (metadata.attachment_url) details.push({ label: 'Adjunto', value: 'Sí' });
  } else if (r.requestType === 'work_permit') {
    const startDate = parseUTCDateString(r.start_date);
    const endDate = parseUTCDateString(r.end_date);
    const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
    const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

    if (start === end) {
      displayDate = start;
      displayDateLabel = 'Fecha';
    } else {
      displayDate = `${start} – ${end}`;
      displayDateLabel = 'Período';
    }

    const permitTypeLabels: Record<string, string> = {
      family_death: 'Defunción',
      personal: 'Personal',
      medical: 'Tema Médico',
      other: 'Otros',
    };
    const permitLabel = permitTypeLabels[r.permit_type] || r.permit_type || 'Permiso';
    summary = `Permiso - ${permitLabel}`;
    details = [
      { label: 'Tipo de Permiso', value: permitLabel },
      { label: 'Fecha de Inicio', value: start },
      { label: 'Fecha de Fin', value: end },
    ];
    if (r.start_time && r.end_time) {
      details.push({ label: 'Horario', value: `${r.start_time} – ${r.end_time}` });
    }
    if (r.equivalent_value) {
      const unit = r.equivalent_unit === 'hours' ? 'hora(s)' : 'día(s)';
      details.push({ label: 'Equivalente', value: `${r.equivalent_value} ${unit}` });
    }
    if (r.observations) details.push({ label: 'Observaciones', value: r.observations });
  } else if (r.requestType === 'schedule_change') {
    const scheduleDate = parseUTCDateString(r.schedule_date);
    displayDate = scheduleDate ? format(scheduleDate, 'dd/MM/yyyy') : r.schedule_date || '-';
    displayDateLabel = 'Fecha del cambio';
    const changeTypeLabels: Record<string, string> = {
      create: 'Agregar',
      update: 'Cambiar',
      delete: 'Eliminar',
    };
    const changeLabel = changeTypeLabels[r.request_type] || r.request_type;
    const proposed = r.proposed_schedule?.name;
    const current = r.current_schedule?.name;
    summary = proposed ? `${changeLabel}: ${current || '—'} → ${proposed}` : `${changeLabel} horario`;
    details = [{ label: 'Fecha del cambio', value: displayDate }];
    if (current) details.push({ label: 'Horario actual', value: current });
    if (proposed) details.push({ label: 'Horario propuesto', value: proposed });
    if (r.reason) details.push({ label: 'Motivo', value: r.reason });
    if (r.review_notes) details.push({ label: 'Notas de revisión', value: r.review_notes });
  }

  return {
    ...r,
    reason: r.requestType === 'compensatorio' && cleanReason ? cleanReason : r.reason,
    unified: {
      displayDate,
      displayDateLabel,
      summary,
      details,
      statusLabel: getRequestStatusLabel(r),
      statusSeverity: getRequestStatusSeverity(r),
      typeLabel: getRequestTypeLabel(r.requestType),
      typeSeverity: getRequestTypeSeverity(r.requestType),
      icon: getRequestIcon(r.requestType),
      colorClassActive: getRequestColorClass(r.requestType, true),
      colorClassBg: getRequestColorClass(r.requestType, false),
    },
  };
}

/**
 * Extract the compensatory date from the notes field (consistent with hr-disabilities).
 */
export function getCompensatoryDateFromNotes(data: any): string | null {
  if (data.notes) {
    const notesArray = Array.isArray(data.notes)
      ? data.notes
      : typeof data.notes === 'string'
        ? [data.notes]
        : [];

    const dateNote = notesArray.find(
      (note: any) => typeof note === 'string' && note.includes('Fecha compensatorio:')
    );

    if (dateNote) {
      const match = dateNote.match(/Fecha compensatorio:\s*(.+)/);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          try {
            const date = new Date(dateStr);
            return format(date, 'dd/MM/yyyy');
          } catch {
            return dateStr;
          }
        }
        return dateStr;
      }
    }
  }
  return null;
}
