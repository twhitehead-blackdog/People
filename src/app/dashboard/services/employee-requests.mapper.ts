import { format, parse } from 'date-fns';
import { EmployeeRequest } from '../models/employee-requests.model';

export function mapVacationToRequest(data: any): EmployeeRequest {
  // Tooltip format: "{type} aprobado por RRHH | Fecha: {startDate} - {endDate}"
  const startDate = data.start_date;
  const endDate = data.end_date;

  return {
    id: data.id,
    type: 'VACACIONES',
    start_date: startDate,
    end_date: endDate,
    is_request: true,
    approved_by: 'RRHH', // Hardcoded or from data.reviewed_by
    tooltip: `VACACIONES aprobado por RRHH | Fecha: ${formatDate(
      startDate
    )} - ${formatDate(endDate)}`,
    color: 'purple',
    employee_id: data.employee_id,
  };
}

export function mapDisabilityToRequest(data: any): EmployeeRequest {
  const startDate = data.start_date;
  const endDate = data.end_date;

  return {
    id: data.id,
    type: 'INCAPACIDAD',
    start_date: startDate,
    end_date: endDate,
    is_request: true,
    approved_by: 'RRHH',
    tooltip: `INCAPACIDAD aprobado por RRHH | Fecha: ${formatDate(
      startDate
    )} - ${formatDate(endDate)}`,
    color: 'red',
    employee_id: data.employee_id,
  };
}

export function mapCompensatoryToRequest(data: any): EmployeeRequest {
  const isHours = data.compensatory_type === 'hours';
  // For hours, date_from might be full ISO or date. usage: date_from, date_to
  // We need to display it on the schedule.

  const startDate = data.date_from;
  const endDate = data.date_to;

  return {
    id: data.id,
    type: 'COMPENSATORIO',
    start_date: startDate,
    end_date: endDate,
    is_request: true,
    approved_by: 'RRHH',
    tooltip: `COMPENSATORIO aprobado por RRHH | Fecha: ${formatDate(
      startDate
    )}`, // Simplified for compensatory usually
    color: 'green',
    employee_id: data.employee_id,
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // Parse YYYY-MM-DD explicitly as local date
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}
