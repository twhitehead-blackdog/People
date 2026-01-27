// =====================================================
// TIPOS LEGACY (mantener compatibilidad)
// =====================================================

export type PermissionKey =
  | 'admin'
  | 'schedule_admin'
  | 'schedule_approver'
  | 'dashboard_access';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'admin',
  'schedule_admin',
  'schedule_approver',
  'dashboard_access',
];

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  icon: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}

export const PERMISSION_DEFINITIONS: Record<
  PermissionKey,
  PermissionDefinition
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
};

// =====================================================
// NUEVO SISTEMA DE PERMISOS POR MÓDULO
// =====================================================

/** Acciones granulares por módulo */
export type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

/** Estado de acceso de un módulo */
export type AccessState = 'full' | 'partial' | 'blocked' | 'none';

/** Origen del permiso */
export type PermissionSource =
  | 'position'
  | 'employee_override'
  | 'blocked'
  | 'none';

/** Módulo del sistema (desde BD) */
export interface SystemModule {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  route: string;
  parentId: string | null;
  orderIndex: number;
  isActive: boolean;
  children?: SystemModule[];
}

/** Permiso efectivo calculado para un módulo */
export interface EffectivePermission {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  moduleIcon: string;
  moduleRoute: string;
  parentId: string | null;
  orderIndex: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isBlocked: boolean;
  source: PermissionSource;
  expiresAt?: Date | string | null;
}

/** Nodo del árbol de permisos para UI */
export interface ModulePermissionNode {
  key: string;
  label: string;
  data: EffectivePermission;
  icon: string;
  children?: ModulePermissionNode[];
  expanded?: boolean;
  selectable?: boolean;
  styleClass?: string;
}

/** Perfil de permisos de usuario (nuevo) */
export interface ModuleUserPermissionProfile {
  employeeId: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  branchId: string;
  branchName: string;

  /** Permisos efectivos por módulo */
  modulePermissions: EffectivePermission[];

  /** Resumen de estado */
  accessState: AccessState;
  totalModules: number;
  accessibleModules: number;
  blockedModules: number;

  /** Metadata */
  hasOverrides: boolean;
  lastModified?: Date | string;
  modifiedBy?: string;
}

/** Payload para clonar permisos */
export interface ClonePermissionsPayload {
  sourceEmployeeId: string;
  targetEmployeeId: string;
  includeOverrides: boolean;
}

/** Payload para resetear permisos */
export interface ResetPermissionsPayload {
  employeeId: string;
}

/** Payload para actualizar un override */
export interface UpdateOverridePayload {
  employeeId: string;
  moduleId: string;
  canView?: boolean | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  isBlocked?: boolean;
  reason?: string;
}

/** Payload para actualizar permisos de cargo */
export interface UpdatePositionPermissionsPayload {
  positionId: string;
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** Registro de auditoría */
export interface PermissionAuditLog {
  id: string;
  targetType: 'position' | 'employee';
  targetId: string;
  moduleId?: string;
  moduleCode?: string;
  action: 'grant' | 'revoke' | 'block' | 'unblock' | 'clone' | 'reset' | 'bulk_update';
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  performedBy: string;
  performedAt: Date | string;
  ipAddress?: string;
  userAgent?: string;
}

// =====================================================
// LEGACY: Perfil de permisos (compatibilidad)
// =====================================================

export interface UserPermissionProfile {
  employeeId: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  branchName: string;
  permissions: Record<PermissionKey, boolean>;
  sources: Record<PermissionKey, 'position' | 'user_override'>;
  userType: 'employee' | 'manager' | 'admin' | 'superadmin';
  isSupportUser: boolean;
  testMode: boolean;

  /** Nuevo: perfil de módulos (opcional para compatibilidad) */
  moduleProfile?: ModuleUserPermissionProfile;
}

// =====================================================
// HELPERS
// =====================================================

/** Calcula el estado de acceso general */
export function calculateAccessState(
  permissions: EffectivePermission[]
): AccessState {
  const total = permissions.length;
  if (total === 0) return 'none';

  const accessible = permissions.filter((p) => p.canView && !p.isBlocked).length;
  const blocked = permissions.filter((p) => p.isBlocked).length;

  if (blocked === total) return 'blocked';
  if (accessible === total) return 'full';
  if (accessible > 0) return 'partial';
  return 'none';
}

/** Convierte permisos efectivos a árbol para p-tree */
export function buildPermissionTree(
  permissions: EffectivePermission[]
): ModulePermissionNode[] {
  const rootModules = permissions.filter((p) => !p.parentId);
  const childrenMap = new Map<string, EffectivePermission[]>();

  // Agrupar hijos por parentId
  permissions.forEach((p) => {
    if (p.parentId) {
      const children = childrenMap.get(p.parentId) || [];
      children.push(p);
      childrenMap.set(p.parentId, children);
    }
  });

  // Construir árbol recursivamente
  const buildNode = (perm: EffectivePermission): ModulePermissionNode => {
    const children = childrenMap.get(perm.moduleId) || [];
    return {
      key: perm.moduleId,
      label: perm.moduleName,
      data: perm,
      icon: perm.moduleIcon,
      expanded: true,
      selectable: true,
      styleClass: perm.isBlocked
        ? 'blocked-module'
        : perm.source === 'employee_override'
          ? 'override-module'
          : '',
      children: children
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(buildNode),
    };
  };

  return rootModules
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(buildNode);
}

/** Obtiene el severity para un estado de acceso */
export function getAccessStateSeverity(
  state: AccessState
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (state) {
    case 'full':
      return 'success';
    case 'partial':
      return 'warn';
    case 'blocked':
      return 'danger';
    case 'none':
    default:
      return 'secondary';
  }
}

/** Obtiene el label para un estado de acceso */
export function getAccessStateLabel(state: AccessState): string {
  switch (state) {
    case 'full':
      return 'Acceso Total';
    case 'partial':
      return 'Acceso Parcial';
    case 'blocked':
      return 'Bloqueado';
    case 'none':
    default:
      return 'Sin Acceso';
  }
}

/** Obtiene el icono para un estado de acceso */
export function getAccessStateIcon(state: AccessState): string {
  switch (state) {
    case 'full':
      return 'pi pi-check-circle';
    case 'partial':
      return 'pi pi-minus-circle';
    case 'blocked':
      return 'pi pi-lock';
    case 'none':
    default:
      return 'pi pi-times-circle';
  }
}
