export type PermissionKey =
  | 'admin'
  | 'schedule_admin'
  | 'schedule_approver'
  | 'dashboard_access'
  | 'view_salaries';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'admin',
  'schedule_admin',
  'schedule_approver',
  'dashboard_access',
  'view_salaries',
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
  view_salaries: {
    key: 'view_salaries',
    label: 'Ver Salarios',
    description:
      'Permite visualizar información salarial y financiera sensible.',
    icon: 'pi pi-money-bill',
    severity: 'danger',
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
