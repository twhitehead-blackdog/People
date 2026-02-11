import { getAllSubModuleIds, SubModule, ModuleDefinition } from './module-permissions.types';

// ============================================
// PERMISOS LEGADOS (mantener para compatibilidad)
// ============================================

export type LegacyPermissionKey =
  | 'admin'
  | 'schedule_admin'
  | 'schedule_approver'
  | 'dashboard_access'
  | 'view_salaries';

export const ALL_LEGACY_PERMISSIONS: LegacyPermissionKey[] = [
  'admin',
  'schedule_admin',
  'schedule_approver',
  'dashboard_access',
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
  dashboard_access: {
    key: 'dashboard_access',
    label: 'Acceso al Dashboard',
    description: 'Permite ingresar al panel administrativo (Dashboard).',
    icon: 'pi pi-th-large',
    severity: 'info',
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
 * Permiso específico para un submódulo
 */
export interface SubModulePermission {
  subModuleId: string;
  enabled: boolean;
}

/**
 * Permisos para un módulo completo (incluye todos sus submódulos)
 */
export interface ModulePermission {
  moduleId: string;
  enabled: boolean; // Si false, todo el módulo está bloqueado
  subModules: Record<string, boolean>; // Mapa de subModuleId -> boolean
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
 * Verifica si un usuario tiene acceso a un submódulo específico
 */
export function hasSubModuleAccess(
  frontendPermissions: FrontendPermissions,
  moduleId: string,
  subModuleId: string
): boolean {
  const module = frontendPermissions.modules[moduleId];
  if (!module) return false;
  if (!module.enabled) return false;
  
  // Si el submódulo no está definido, por defecto está desactivado
  return module.subModules[subModuleId] ?? false;
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
  
  // Verificar si tiene al menos un submódulo activo
  return Object.values(module.subModules).some(enabled => enabled);
}

/**
 * Obtiene la lista de rutas permitidas para un usuario
 */
export function getAllowedRoutes(frontendPermissions: FrontendPermissions): string[] {
  const allowedRoutes: string[] = [];
  
  for (const [moduleId, modulePerm] of Object.entries(frontendPermissions.modules)) {
    if (!modulePerm.enabled) continue;
    
    for (const [subModuleId, enabled] of Object.entries(modulePerm.subModules)) {
      if (enabled) {
        // Aquí necesitaríamos mapear de vuelta a rutas
        // Esto se hará en el servicio con acceso a SYSTEM_MODULES
      }
    }
  }
  
  return allowedRoutes;
}
