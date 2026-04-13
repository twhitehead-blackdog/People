/**
 * Definición de módulos y submódulos del sistema para control de permisos frontend
 * Esta estructura define toda la navegación administrativa
 */

export interface SubModule {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  route: string; // Ruta relativa al módulo padre
}

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  subModules: SubModule[];
}

// ============================================
// DEFINICIÓN DE TODOS LOS MÓDULOS DEL SISTEMA
// ============================================

export const SYSTEM_MODULES: ModuleDefinition[] = [
  {
    id: 'home',
    label: 'Inicio',
    description: 'Página principal del dashboard',
    icon: 'pi pi-home',
    route: '/admin/home',
    subModules: [
      { id: 'home_access', label: 'Acceso a Inicio', description: 'Permite ver la página principal del dashboard', icon: 'pi pi-home', route: '' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    description: 'Gestión administrativa del sistema',
    icon: 'pi pi-cog',
    route: '/admin',
    subModules: [
      { id: 'employees', label: 'Empleados', description: 'Lista y gestión de empleados', icon: 'pi pi-users', route: 'employees' },
      { id: 'organigrama', label: 'Organigrama', description: 'Vista jerárquica de la organización', icon: 'pi pi-sitemap', route: 'organigrama' },
      { id: 'companies', label: 'Empresas', description: 'Gestión de empresas', icon: 'pi pi-building', route: 'companies' },
      { id: 'departments', label: 'Departamentos', description: 'Gestión de departamentos', icon: 'pi pi-th-large', route: 'departments' },
      { id: 'positions', label: 'Cargos', description: 'Gestión de cargos y roles', icon: 'pi pi-id-card', route: 'positions' },
      { id: 'branches', label: 'Sucursales', description: 'Gestión de sucursales', icon: 'pi pi-map-marker', route: 'branches' },
      { id: 'settings', label: 'Configuración', description: 'Configuración general del sistema', icon: 'pi pi-cog', route: 'settings' },
      { id: 'user_management', label: 'Gestión de Usuarios', description: 'Administración de usuarios del portal', icon: 'pi pi-user-edit', route: 'user-management' },
      { id: 'permissions', label: 'Permisos', description: 'Control de permisos por cargo/usuario', icon: 'pi pi-lock', route: 'permissions' },
      { id: 'complaints', label: 'Quejas y Sugerencias', description: 'Buzón de quejas anónimas', icon: 'pi pi-inbox', route: 'complaints-inbox' },
      { id: 'job_applications', label: 'Postulaciones', description: 'Gestión de postulaciones de empleo', icon: 'pi pi-file-edit', route: 'job-applications' },
      { id: 'audit_tasks', label: 'Control de Tareas', description: 'Seguimiento y control de tareas de auditoría', icon: 'pi pi-check-square', route: 'audit-tasks' },
      { id: 'device_inventory', label: 'Inventario de Dispositivos', description: 'Gestión de dispositivos y equipos', icon: 'pi pi-mobile', route: 'device-inventory' },
    ],
  },
  {
    id: 'time_management',
    label: 'Gestión de Tiempo',
    description: 'Control de asistencia, horarios y turnos',
    icon: 'pi pi-clock',
    route: '/time-management',
    subModules: [
      { id: 'timelogs', label: 'Registros de Tiempo', description: 'Marcaciones de entrada/salida', icon: 'pi pi-clock', route: 'timelogs' },
      { id: 'timetables', label: 'Horarios', description: 'Gestión de horarios de empleados', icon: 'pi pi-calendar', route: 'timetables' },
      { id: 'schedules', label: 'Programaciones', description: 'Programaciones de turnos', icon: 'pi pi-calendar-plus', route: 'schedules' },
      { id: 'vet_schedule', label: 'Horario Veterinaria', description: 'Horarios específicos de veterinaria', icon: 'pi pi-calendar-clock', route: 'vet-schedule' },
      { id: 'salon_schedule', label: 'Horario Peluquería', description: 'Horarios específicos de peluquería', icon: 'pi pi-calendar-clock', route: 'salon-schedule' },
      { id: 'personnel_movements', label: 'Movimientos de Personal', description: 'Seguimiento de movimientos entre sucursales, incidencias y metas', icon: 'pi pi-map', route: 'movimientos-personal' },

    ],
  },
  {
    id: 'payroll',
    label: 'Nómina',
    description: 'Gestión de pagos, planillas y acreedores',
    icon: 'pi pi-money-bill',
    route: '/payroll',
    subModules: [
      { id: 'payrolls', label: 'Planillas', description: 'Gestión de planillas de pago', icon: 'pi pi-list', route: 'payrolls' },
      { id: 'creditors', label: 'Acreedores', description: 'Gestión de acreedores', icon: 'pi pi-users', route: 'creditors' },
      { id: 'banks', label: 'Bancos', description: 'Configuración de bancos', icon: 'pi pi-building', route: 'banks' },
      { id: 'payroll_admin', label: 'Config. Nómina', description: 'Configuración avanzada de nómina', icon: 'pi pi-sliders-h', route: 'admin' },
      { id: 'payroll_import', label: 'Importar Nómina', description: 'Importación masiva de datos de nómina', icon: 'pi pi-upload', route: 'import' },
    ],
  },
  {
    id: 'hr',
    label: 'Recursos Humanos',
    description: 'Módulos específicos de RRHH',
    icon: 'pi pi-briefcase',
    route: '/admin/hr',
    subModules: [
      { id: 'hr_time_dashboard', label: 'Dashboard de Tiempo', description: 'Panel de control de asistencia', icon: 'pi pi-chart-bar', route: 'time-dashboard' },
      { id: 'hr_disabilities', label: 'Incapacidades', description: 'Gestión de incapacidades', icon: 'pi pi-file-o', route: 'disabilities' },
      { id: 'hr_surveys', label: 'Encuestas', description: 'Gestión de encuestas de RRHH', icon: 'pi pi-chart-bar', route: 'surveys' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    description: 'Gestión de compras, insumos y uniformes',
    icon: 'pi pi-shopping-cart',
    route: '/admin/compras',
    subModules: [
      { id: 'compras_dashboard', label: 'Dashboard de Compras', description: 'Panel de aprobación de compras', icon: 'pi pi-shopping-cart', route: '' },
    ],
  },
  {
    id: 'performance',
    label: 'Evaluación 360°',
    description: 'Evaluación de desempeño',
    icon: 'pi pi-star',
    route: '/admin/performance',
    subModules: [
      { id: 'perf_dashboard', label: 'Dashboard', description: 'Resumen de evaluaciones', icon: 'pi pi-chart-pie', route: '' },
      { id: 'perf_templates', label: 'Plantillas', description: 'Plantillas de evaluación', icon: 'pi pi-copy', route: 'templates' },
      { id: 'perf_cycles', label: 'Ciclos', description: 'Ciclos de evaluación', icon: 'pi pi-sync', route: 'cycles' },
      { id: 'perf_reports', label: 'Reportes', description: 'Reportes de desempeño', icon: 'pi pi-chart-line', route: 'reports' },
    ],
  },
  {
    id: 'branch_manager',
    label: 'Gestión de Sucursal',
    description: 'Panel de gestión para gerentes de sucursal',
    icon: 'pi pi-shop',
    route: '/branch-manager',
    subModules: [
      { id: 'bm_dashboard', label: 'Dashboard', description: 'Panel principal de sucursal', icon: 'pi pi-home', route: '' },
      { id: 'bm_gestiones', label: 'Gestiones', description: 'Gestiones de sucursal', icon: 'pi pi-tasks', route: 'gestiones' },
    ],
  },
  {
    id: 'employee_portal',
    label: 'Portal del Empleado',
    description: 'Acceso al portal para empleados',
    icon: 'pi pi-user',
    route: '/my-portal',
    subModules: [
      { id: 'portal_access', label: 'Acceso al Portal', description: 'Permite acceder al portal del empleado', icon: 'pi pi-sign-in', route: '' },
    ],
  },
  {
    id: 'timeclock',
    label: 'Reloj Checador',
    description: 'Acceso al sistema de marcado de asistencia',
    icon: 'pi pi-stopwatch',
    route: '/timeclock',
    subModules: [
      { id: 'timeclock_access', label: 'Marcar Asistencia', description: 'Permite marcar entrada y salida', icon: 'pi pi-clock', route: '' },
    ],
  },
  {
    id: 'services',
    label: 'Servicios',
    description: 'Acceso a servicios integrados y herramientas avanzadas',
    icon: 'pi pi-server',
    route: '/services',
    subModules: [
      { id: 'live_access', label: 'Asistencia en Vivo', description: 'Vista en tiempo real de la asistencia', icon: 'pi pi-objects-column', route: '/live' },
      { id: 'analytics_access', label: 'Analytics', description: 'Panel de análisis y reportes avanzados', icon: 'pi pi-chart-line', route: '/analytics' },
      { id: 'launcher_access', label: 'Lanzador de Apps', description: 'Acceso al lanzador de aplicaciones', icon: 'pi pi-th-large', route: '/launcher' },
    ],
  },
];

// Helper para obtener todos los IDs de módulos
export function getAllModuleIds(): string[] {
  return SYSTEM_MODULES.map(m => m.id);
}

// Helper para obtener todos los IDs de submódulos
export function getAllSubModuleIds(): string[] {
  return SYSTEM_MODULES.flatMap(m => m.subModules.map(sm => sm.id));
}

// Helper para obtener un módulo por ID
export function getModuleById(moduleId: string): ModuleDefinition | undefined {
  return SYSTEM_MODULES.find(m => m.id === moduleId);
}

// Helper para obtener un submódulo por ID
export function getSubModuleById(subModuleId: string): { module: ModuleDefinition; subModule: SubModule } | undefined {
  for (const module of SYSTEM_MODULES) {
    const subModule = module.subModules.find(sm => sm.id === subModuleId);
    if (subModule) {
      return { module, subModule };
    }
  }
  return undefined;
}

// Obtener ruta completa de un submódulo
export function getFullRoute(moduleId: string, subModuleId?: string): string {
  const module = getModuleById(moduleId);
  if (!module) return '';
  
  if (!subModuleId) {
    return module.route;
  }
  
  const subModule = module.subModules.find(sm => sm.id === subModuleId);
  if (!subModule) return module.route;
  
  return `${module.route}/${subModule.route}`.replace(/\/+/g, '/');
}
