import { OrganizationService } from '../services/organization.service';

/**
 * Helper function para obtener el nombre correcto de la tabla según la organización
 * @param table - Nombre base de la tabla (ej: 'employees', 'companies', 'branches')
 * @param isNaz - Si es true, retorna la tabla naz_*, si es false retorna la tabla normal
 * @returns Nombre de la tabla correcta
 */
/**
 * Helper function para obtener el nombre correcto de la tabla
 * Ya no se usan tablas naz_*, todo es por company_id en tablas compartidas
 * @param table - Nombre base de la tabla (ej: 'employees', 'companies', 'branches')
 * @param isNaz - Ya no se usa, se mantiene por compatibilidad
 * @returns Nombre de la tabla compartida
 */
export function getTableName(table: string, isNaz: boolean): string {
  // Ya no hay tablas naz_*, siempre retornar la tabla compartida
  return table;
}

/**
 * Helper para obtener el nombre de tabla usando OrganizationService
 * Ya no se usan tablas naz_*, todo es por company_id
 */
export function getTableNameFromService(table: string, orgService: OrganizationService): string {
  // Ya no hay tablas naz_*, siempre retornar la tabla compartida
  return table;
}

