import { OrganizationService } from '../services/organization.service';

/**
 * Helper function para obtener el nombre correcto de la tabla según la organización
 * @param table - Nombre base de la tabla (ej: 'employees', 'companies', 'branches')
 * @param isNaz - Si es true, retorna la tabla naz_*, si es false retorna la tabla normal
 * @returns Nombre de la tabla correcta
 */
export function getTableName(table: string, isNaz: boolean): string {
  if (!isNaz) {
    return table;
  }
  
  // Mapeo de tablas normales a tablas naz_*
  const nazTableMap: Record<string, string> = {
    'employees': 'naz_employees',
    'companies': 'naz_companies',
    'branches': 'naz_branches',
    'departments': 'naz_departments',
    'positions': 'naz_positions',
    'schedules': 'naz_schedules',
    'employee_schedules': 'naz_employee_schedules',
    'timelogs': 'naz_timelogs',
    'attendance_sheets': 'naz_attendance_sheets',
  };
  
  return nazTableMap[table] || table;
}

/**
 * Helper para obtener el nombre de tabla usando OrganizationService
 */
export function getTableNameFromService(table: string, orgService: OrganizationService): string {
  return getTableName(table, orgService.isNaz());
}

