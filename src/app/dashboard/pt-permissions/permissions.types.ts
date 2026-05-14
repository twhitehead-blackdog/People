import { getAllSubModuleIds, SubModule, ModuleDefinition } from './module-permissions.types';

// ============================================
// PERMISOS LEGADOS (mantener para compatibilidad)
// ============================================

export type LegacyPermissionKey =
  | 'admin'
  | 'schedule_admin'
  | 'schedule_approver'
  | 'view_salaries';

export const ALL_LEGACY_PERMISSIONS: LegacyPermissionKey[] = [
  'admin',
  'schedule_admin',
  'schedule_approver',
  'view_salaries',
];

export interface LegacyPermissionDefinition {
  key: LegacyPermissionKey;
  label: string;
  description: string;
  icon: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}

export const LEGACY_PERMISSION_DEFINITIONS: Record<
  LegacyPermissionKey,
  LegacyPermissionDefinition
> = {
  admin: {
    key: 'admin',
    label: 'Administrador',
    description:
      'Acceso total al sistema, configuraciones y gestión de usuarios.',
    icon: 'pi pi-lock',
    severity: 'danger',
  },
  schedule_admin: {
    key: 'schedule_admin',
    label: 'Admin. de Horarios',
    description: 'Permite crear, editar y gestionar horarios de empleados.',
    icon: 'pi pi-calendar',
    severity: 'warn',
  },
  schedule_approver: {
    key: 'schedule_approver',
    label: 'Aprobador de Horarios',
    description: 'Permite confirmar y aprobar horas trabajadas y turnos.',
    icon: 'pi pi-check-circle',
    severity: 'success',
  },
  view_salaries: {
    key: 'view_salaries',
    label: 'Ver Salarios',
    description:
      'Permite visualizar información salarial y financiera sensible.',
    icon: 'pi pi-money-bill',
    severity: 'danger',
  },
};

// ============================================
// NUEVO: PERMISOS POR MÓDULO/SUBMÓDULO (FRONTEND)
// ============================================

/**
 * Modo de acceso a un submódulo:
 *  - false      = sin acceso
 *  - 'read'     = solo lectura (oculta crear/editar/eliminar)
 *  - true       = acceso completo (escritura)
 */
export type SubModuleAccess = boolean | 'read';

export type SubModuleMode = 'none' | 'read' | 'write';

/**
 * Permiso específico para un submódulo
 */
export interface SubModulePermission {
  subModuleId: string;
  enabled: SubModuleAccess;
}

/**
 * Permisos para un módulo completo (incluye todos sus submódulos)
 */
export interface ModulePermission {
  moduleId: string;
  enabled: boolean; // Si false, todo el módulo está bloqueado
  subModules: Record<string, SubModuleAccess>; // subModuleId -> false|'read'|true
}

/**
 * Estructura completa de permisos de frontend por cargo/usuario
 * Almacena qué módulos y submódulos puede ver cada persona
 */
export interface FrontendPermissions {
  // Versión para migraciones futuras
  version: number;
  // Permisos por módulo
  modules: Record<string, ModulePermission>;
}

/**
 * Estructura por defecto: todos los módulos desactivados
 */
export function createDefaultFrontendPermissions(): FrontendPermissions {
  const moduleIds = getAllSubModuleIds();
  const modules: Record<string, ModulePermission> = {};
  
  // Inicializar todos los módulos como desactivados
  // Esto se hará dinámicamente en el servicio basado en SYSTEM_MODULES
  
  return {
    version: 1,
    modules,
  };
}

// ============================================
// INTERFACES DE PERFIL DE USUARIO
// ============================================

export interface UserPermissionProfile {
  employeeId: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  branchName: string;
  // Permisos legados (combinación de cargo + overrides)
  permissions: Record<LegacyPermissionKey, boolean>;
  // Origen de cada permiso: 'position' | 'user_override'
  sources: Record<LegacyPermissionKey, 'position' | 'user_override'>;
  // NUEVO: Permisos de frontend por módulo/submódulo
  frontendPermissions: FrontendPermissions;
  // Override de permisos de frontend a nivel de empleado (raw)
  employeeFrontendPermissions?: FrontendPermissions;
  // Indica si el empleado tiene un override personalizado
  hasEmployeeOverride: boolean;
  userType: 'employee' | 'manager' | 'admin' | 'superadmin';
  isSupportUser: boolean;
  testMode: boolean;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

export function checkSalaryAccess(positionName?: string): boolean {
  if (!positionName) return false;
  const allowedRoles = [
    'Desarrollador y Soporte IT',
    'Encargada de Recursos Humanos',
    'Encargada de Contabilidad',
  ];
  return allowedRoles.some(
    (role) => role.toLowerCase() === positionName.toLowerCase()
  );
}

/**
 * Normaliza el valor crudo de un submódulo a uno de los tres modos canónicos.
 */
export function normalizeSubModuleMode(raw: SubModuleAccess | undefined): SubModuleMode {
  if (raw === true) return 'write';
  if (raw === 'read') return 'read';
  return 'none';
}

/**
 * Retorna el modo de acceso de un usuario a un submódulo: 'none' | 'read' | 'write'.
 * Si el módulo padre está deshabilitado, el resultado es 'none'.
 */
export function getSubModuleMode(
  frontendPermissions: FrontendPermissions,
  moduleId: string,
  subModuleId: string
): SubModuleMode {
  const module = frontendPermissions.modules[moduleId];
  if (!module || !module.enabled) return 'none';
  return normalizeSubModuleMode(module.subModules[subModuleId]);
}

/**
 * Verifica si un usuario tiene acceso a un submódulo específico.
 * Por defecto cualquier acceso (read o write) cuenta como acceso.
 * Pasar `requiredMode: 'write'` para exigir acceso de escritura.
 */
export function hasSubModuleAccess(
  frontendPermissions: FrontendPermissions,
  moduleId: string,
  subModuleId: string,
  requiredMode: 'any' | 'write' = 'any'
): boolean {
  const mode = getSubModuleMode(frontendPermissions, moduleId, subModuleId);
  if (mode === 'none') return false;
  if (requiredMode === 'write') return mode === 'write';
  return true;
}

/**
 * Verifica si un usuario tiene acceso a al menos un submódulo de un módulo
 */
export function hasModuleAccess(
  frontendPermissions: FrontendPermissions,
  moduleId: string
): boolean {
  const module = frontendPermissions.modules[moduleId];
  if (!module) return false;
  if (!module.enabled) return false;

  // Verificar si tiene al menos un submódulo activo (lectura o escritura)
  return Object.values(module.subModules).some(v => normalizeSubModuleMode(v) !== 'none');
}

