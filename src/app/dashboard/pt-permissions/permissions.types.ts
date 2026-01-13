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

export interface UserPermissionProfile {
  employeeId: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  branchName: string;
  // Permisos efectivos (combinación de cargo + overrides)
  permissions: Record<PermissionKey, boolean>;
  // Origen de cada permiso: 'position' | 'user_override'
  sources: Record<PermissionKey, 'position' | 'user_override'>;
  userType: 'employee' | 'manager' | 'admin' | 'superadmin';
  isSupportUser: boolean;
  testMode: boolean;
}
