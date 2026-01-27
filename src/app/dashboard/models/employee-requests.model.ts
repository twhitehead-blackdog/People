import { EmployeeSchedule, TimeoffCategory } from '../../models';

/**
 * Tipo de solicitud HR normalizado
 */
export type HRRequestType = 'VACACIONES' | 'INCAPACIDAD' | 'COMPENSATORIO';

/**
 * Representa una solicitud HR aprobada para mostrar en la grilla de horarios
 */
export interface EmployeeRequest {
  id: string;
  type: HRRequestType;
  start_date: string;
  end_date: string;
  is_request: true;
  approved_by: string;
  tooltip: string;
  color?: string;
  employee_id?: string;

  // Referencias a las solicitudes originales (para integración con horarios)
  vacation_request_id?: string;
  disability_request_id?: string;
  compensatory_request_id?: string;
}

/**
 * Helper para determinar si un GridItem es una solicitud HR
 */
export function isEmployeeRequest(item: GridItem): item is EmployeeRequest {
  return 'is_request' in item && item.is_request === true;
}

/**
 * Helper para determinar si un EmployeeSchedule está afectado por una solicitud HR
 */
export function hasHRTracking(schedule: EmployeeSchedule): boolean {
  return !!(
    schedule.is_timeoff ||
    schedule.is_compensatory ||
    schedule.vacation_request_id ||
    schedule.disability_request_id ||
    schedule.compensatory_request_id
  );
}

/**
 * Mapea el tipo de timeoff del schedule al tipo de request
 */
export function timeoffTypeToRequestType(
  timeoffType: TimeoffCategory
): HRRequestType {
  switch (timeoffType) {
    case 'VACACIONES':
      return 'VACACIONES';
    case 'INCAPACIDAD':
      return 'INCAPACIDAD';
    default:
      return 'VACACIONES';
  }
}

export type GridItem = EmployeeSchedule | EmployeeRequest;
