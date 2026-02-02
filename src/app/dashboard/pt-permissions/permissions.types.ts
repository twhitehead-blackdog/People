export type PermissionKey =
  // Dashboard
  | 'dashboard.access'
  | 'dashboard_access' // Legacy bridge
  // Employees
  | 'employees.read'
  | 'employees.write'
  // Structure
  | 'structure.read'
  | 'structure.write'
  // HR Time
  | 'hr.time.read'
  | 'hr.time.write'
  // Schedules
  | 'schedules.read'
  | 'schedules.write'
  | 'schedule_admin' // Legacy bridge
  | 'schedule_approver' // Legacy bridge
  // Payroll
  | 'payroll.read'
  | 'payroll.write'
  // Finance
  | 'finance.read'
  | 'finance.write'
  | 'salaries.view'
  | 'view_salaries' // Legacy bridge
  // Admin
  | 'admin.users'
  | 'admin.permissions'
  | 'admin.settings'
  | 'admin'; // Legacy bridge

export const ALL_PERMISSIONS: PermissionKey[] = [
  'dashboard.access',
  'employees.read',
  'employees.write',
  'structure.read',
  'structure.write',
  'hr.time.read',
  'hr.time.write',
  'schedules.read',
  'schedules.write',
  'payroll.read',
  'payroll.write',
  'finance.read',
  'finance.write',
  'salaries.view',
  'admin.users',
  'admin.permissions',
  'admin.settings',
  // Legacy
  'admin',
  'schedule_admin',
  'schedule_approver',
  'dashboard_access',
  'view_salaries',
];

/** Permission keys that can be managed as user overrides (excludes legacy bridge keys) */
export const EDITABLE_PERMISSIONS: PermissionKey[] = [
  'dashboard.access',
  'employees.read',
  'employees.write',
  'structure.read',
  'structure.write',
  'hr.time.read',
  'hr.time.write',
  'schedules.read',
  'schedules.write',
  'payroll.read',
  'payroll.write',
  'finance.read',
  'finance.write',
  'salaries.view',
  'admin.users',
  'admin.permissions',
  'admin.settings',
];

export interface UserPermissionOverride {
  employeeId: string;
  permissionKey: PermissionKey;
  granted: boolean;
  /**
   * PHASE 1: Always undefined
   * FUTURE: Will contain expiration timestamp
   */
  expiresAt?: Date;
}

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
  'dashboard.access': {
    key: 'dashboard.access',
    label: 'Acceso al Dashboard',
    description: 'Permite ingresar al panel administrativo (Dashboard).',
    icon: 'pi pi-th-large',
    severity: 'info',
  },
  'employees.read': {
    key: 'employees.read',
    label: 'Ver Empleados',
    description: 'Permite ver la lista y detalles de empleados.',
    icon: 'pi pi-users',
    severity: 'info',
  },
  'employees.write': {
    key: 'employees.write',
    label: 'Editar Empleados',
    description: 'Permite crear, editar y eliminar empleados.',
    icon: 'pi pi-user-edit',
    severity: 'warn',
  },
  'structure.read': {
    key: 'structure.read',
    label: 'Ver Estructura',
    description: 'Ver empresas, departamentos, cargos y sucursales.',
    icon: 'pi pi-building',
    severity: 'info',
  },
  'structure.write': {
    key: 'structure.write',
    label: 'Editar Estructura',
    description: 'Gestionar empresas, departamentos, cargos y sucursales.',
    icon: 'pi pi-sitemap',
    severity: 'warn',
  },
  'hr.time.read': {
    key: 'hr.time.read',
    label: 'Ver Gestión de Tiempo',
    description: 'Ver dashboard de tiempo, incapacidades y vacaciones.',
    icon: 'pi pi-clock',
    severity: 'info',
  },
  'hr.time.write': {
    key: 'hr.time.write',
    label: 'Gestionar Tiempo',
    description: 'Gestionar incapacidades, vacaciones y aprobaciones.',
    icon: 'pi pi-calendar-plus',
    severity: 'warn',
  },
  'schedules.read': {
    key: 'schedules.read',
    label: 'Ver Horarios',
    description: 'Ver horarios, rotaciones y turnos.',
    icon: 'pi pi-calendar',
    severity: 'info',
  },
  'schedules.write': {
    key: 'schedules.write',
    label: 'Gestionar Horarios',
    description: 'Crear y editar horarios y turnos de empleados.',
    icon: 'pi pi-calendar-times',
    severity: 'warn',
  },
  'payroll.read': {
    key: 'payroll.read',
    label: 'Ver Planilla',
    description: 'Ver cálculos de planilla y pagos.',
    icon: 'pi pi-wallet',
    severity: 'danger',
  },
  'payroll.write': {
    key: 'payroll.write',
    label: 'Gestionar Planilla',
    description: 'Procesar planilla, deducciones y pagos.',
    icon: 'pi pi-money-bill',
    severity: 'danger',
  },
  'finance.read': {
    key: 'finance.read',
    label: 'Ver Finanzas',
    description: 'Ver acreedores y bancos.',
    icon: 'pi pi-chart-line',
    severity: 'danger',
  },
  'finance.write': {
    key: 'finance.write',
    label: 'Gestionar Finanzas',
    description: 'Gestionar acreedores y bancos.',
    icon: 'pi pi-chart-bar',
    severity: 'danger',
  },
  'salaries.view': {
    key: 'salaries.view',
    label: 'Ver Salarios',
    description: 'Permite visualizar información salarial sensible.',
    icon: 'pi pi-dollar',
    severity: 'danger',
  },
  'admin.users': {
    key: 'admin.users',
    label: 'Gestión de Usuarios',
    description: 'Administrar accesos y cuentas de usuario.',
    icon: 'pi pi-user-plus',
    severity: 'danger',
  },
  'admin.permissions': {
    key: 'admin.permissions',
    label: 'Gestión de Permisos',
    description: 'Configurar permisos y roles del sistema.',
    icon: 'pi pi-lock',
    severity: 'danger',
  },
  'admin.settings': {
    key: 'admin.settings',
    label: 'Configuraciones',
    description: 'Acceso a configuraciones globales del sistema.',
    icon: 'pi pi-cog',
    severity: 'danger',
  },
  // Legacy Definitions (Mapped to new keys strictly for UI compatibility)
  admin: {
    key: 'admin',
    label: 'Administrador (Legacy)',
    description: 'Acceso total heredado.',
    icon: 'pi pi-shield',
    severity: 'danger',
  },
  schedule_admin: {
    key: 'schedule_admin',
    label: 'Admin Horarios (Legacy)',
    description: 'Gestión de horarios heredada.',
    icon: 'pi pi-calendar',
    severity: 'warn',
  },
  schedule_approver: {
    key: 'schedule_approver',
    label: 'Aprobador (Legacy)',
    description: 'Aprobación de horarios heredada.',
    icon: 'pi pi-check-circle',
    severity: 'success',
  },
  dashboard_access: {
    key: 'dashboard_access',
    label: 'Acceso Dashboard (Legacy)',
    description: 'Acceso básico heredado.',
    icon: 'pi pi-th-large',
    severity: 'info',
  },
  view_salaries: {
    key: 'view_salaries',
    label: 'Ver Salarios (Legacy)',
    description: 'Visibilidad de salarios heredada.',
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
