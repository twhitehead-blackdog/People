import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LegacyPermissionKey } from '../dashboard/pt-permissions/permissions.types';
import { SYSTEM_MODULES } from '../dashboard/pt-permissions/module-permissions.types';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Espera a que el empleado esté cargado en el store (máximo 5 segundos)
 */
async function waitForEmployee(dashboardStore: InstanceType<typeof DashboardStore>): Promise<boolean> {
  const maxWait = 5000;
  const checkInterval = 100;
  let waited = 0;

  while (!dashboardStore.currentEmployee() && waited < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }

  return !!dashboardStore.currentEmployee();
}

/**
 * Encuentra la primera ruta disponible basándose en los permisos del usuario.
 * Orden de prioridad: home > admin > time-management > payroll > my-portal
 */
function findFirstAvailableRoute(permissions: PermissionsService): string {
  // Orden de prioridad para redirect
  // NOTA: las rutas del dashboard están montadas en path '' (raíz), NO en /dashboard
  // Home va al final porque contiene información sensible (headcount, salarios, tardanzas)
  const moduleRouteMap: { moduleId: string; route: string }[] = [
    { moduleId: 'branch_manager', route: '/branch-manager' },
    { moduleId: 'time_management', route: '/time-management' },
    { moduleId: 'timeclock', route: '/timeclock' },
    { moduleId: 'admin', route: '/admin' },
    { moduleId: 'payroll', route: '/payroll' },
    { moduleId: 'home', route: '/home' },
  ];

  for (const entry of moduleRouteMap) {
    if (permissions.canAccessModule(entry.moduleId)) {
      return entry.route;
    }
  }

  // Fallback: portal del empleado (siempre accesible)
  return '/my-portal';
}

/**
 * Guard para verificar si el usuario tiene un permiso específico (legacy).
 * Soporta verificar uno solo o una lista (OR logic).
 *
 * Uso: canActivate: [permissionGuard('admin')]
 * Uso múltiple: canActivate: [permissionGuard(['admin', 'schedule_admin'])]
 */
export const permissionGuard = (
  requiredPermission: LegacyPermissionKey | LegacyPermissionKey[]
): CanActivateFn => {
  return async () => {
    const permissions = inject(PermissionsService);
    const router = inject(Router);
    const dashboardStore = inject(DashboardStore);

    const keys = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    const loaded = await waitForEmployee(dashboardStore);
    if (!loaded) {
      router.navigate(['/my-portal']);
      return false;
    }

    const hasAccess = keys.some((key) => permissions.canCurrentUser(key));

    if (hasAccess) {
      return true;
    }

    router.navigate([findFirstAvailableRoute(permissions)]);
    return false;
  };
};

/**
 * Guard para verificar acceso a un módulo/submódulo específico del frontend.
 *
 * Uso: canActivate: [modulePermissionGuard('admin', 'employees')]
 * Uso solo módulo: canActivate: [modulePermissionGuard('admin')]
 */
export const modulePermissionGuard = (
  moduleId: string,
  subModuleId?: string
): CanActivateFn => {
  return async () => {
    const permissions = inject(PermissionsService);
    const router = inject(Router);
    const dashboardStore = inject(DashboardStore);

    const loaded = await waitForEmployee(dashboardStore);
    if (!loaded) {
      router.navigate(['/my-portal']);
      return false;
    }

    let hasAccess = false;

    if (subModuleId) {
      hasAccess = permissions.canAccessSubModule(moduleId, subModuleId);
    } else {
      hasAccess = permissions.canAccessModule(moduleId);
    }

    if (hasAccess) {
      return true;
    }

    // Redirect inteligente: buscar la primera ruta disponible (evita loops)
    router.navigate([findFirstAvailableRoute(permissions)]);
    return false;
  };
};

/**
 * Guard combinado que verifica permiso legacy O permiso de módulo.
 *
 * Uso: canActivate: [combinedPermissionGuard('admin', 'admin', 'employees')]
 */
export const combinedPermissionGuard = (
  legacyPermission: LegacyPermissionKey,
  moduleId: string,
  subModuleId?: string
): CanActivateFn => {
  return async () => {
    const permissions = inject(PermissionsService);
    const router = inject(Router);
    const dashboardStore = inject(DashboardStore);

    const loaded = await waitForEmployee(dashboardStore);
    if (!loaded) {
      router.navigate(['/my-portal']);
      return false;
    }

    const hasLegacyAccess = permissions.canCurrentUser(legacyPermission);

    let hasModuleAccess = false;
    if (subModuleId) {
      hasModuleAccess = permissions.canAccessSubModule(moduleId, subModuleId);
    } else {
      hasModuleAccess = permissions.canAccessModule(moduleId);
    }

    const hasAccess = hasLegacyAccess || hasModuleAccess;

    if (hasAccess) {
      return true;
    }

    router.navigate([findFirstAvailableRoute(permissions)]);
    return false;
  };
};

/**
 * Guard para la ruta /home.
 * Si el módulo 'home' está desactivado, redirige al primer módulo disponible.
 * Si está activado (o el empleado aún no cargó), permite el acceso.
 */
export const homeGuard: CanActivateFn = async () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);
  const dashboardStore = inject(DashboardStore);

  const loaded = await waitForEmployee(dashboardStore);
  if (!loaded) {
    // Si no cargó el empleado, dejar pasar (employeePortalGuard ya maneja esto)
    return true;
  }

  // Si home está habilitado, dejar pasar normalmente
  if (permissions.canAccessModule('home')) {
    return true;
  }

  // Home desactivado: buscar primera ruta disponible (excluyendo home)
  const fallback = findFirstAvailableRoute(permissions);

  // Si el fallback es home (porque home está primero en la lista), ir a admin directamente
  if (fallback === '/home') {
    router.navigate(['/admin']);
  } else {
    router.navigate([fallback]);
  }
  return false;
};
