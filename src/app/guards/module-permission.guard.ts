import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModuleAction } from '../dashboard/pt-permissions/permissions.types';
import { ModulePermissionsService } from '../services/module-permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Guard para verificar si el usuario tiene acceso a un módulo específico.
 *
 * Uso:
 *   canActivate: [modulePermissionGuard('admin')]
 *   canActivate: [modulePermissionGuard('admin.employees', 'edit')]
 *   canActivate: [modulePermissionGuard(['admin', 'time_management'])]
 *
 * @param requiredModule - Código del módulo o array de códigos (lógica OR)
 * @param requiredAction - Acción requerida (view, create, edit, delete). Default: 'view'
 */
export const modulePermissionGuard = (
  requiredModule: string | string[],
  requiredAction: ModuleAction = 'view'
): CanActivateFn => {
  return async () => {
    const modulePermissions = inject(ModulePermissionsService);
    const dashboardStore = inject(DashboardStore);
    const router = inject(Router);

    const moduleCodes = Array.isArray(requiredModule)
      ? requiredModule
      : [requiredModule];

    // Log para debug (solo en desarrollo)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[ModulePermissionGuard] Checking access:', {
        modules: moduleCodes,
        action: requiredAction,
      });
    }

    // Esperar a que el empleado esté cargado
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentEmployee = dashboardStore.currentEmployee();

    if (!currentEmployee) {
      console.warn('[ModulePermissionGuard] No employee loaded, redirecting');
      router.navigate(['/dashboard']);
      return false;
    }

    // Inicializar servicio si es necesario
    if (!modulePermissions.isInitialized()) {
      await modulePermissions.initialize();
    }

    // Cargar permisos del usuario si no están cargados
    if (modulePermissions.getCurrentPermissions().length === 0) {
      await modulePermissions.loadCurrentUserPermissions(currentEmployee.id);
    }

    // Verificar si es admin (admins tienen acceso a todo)
    const isAdmin = dashboardStore.isAdmin();
    if (isAdmin) {
      return true;
    }

    // Verificar acceso a AL MENOS UNO de los módulos requeridos
    const hasAccess = moduleCodes.some((code) =>
      modulePermissions.canAccess(code, requiredAction)
    );

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[ModulePermissionGuard] Access result:', {
        modules: moduleCodes,
        action: requiredAction,
        hasAccess,
        isAdmin,
      });
    }

    if (hasAccess) {
      return true;
    }

    // Redirigir a página de acceso denegado o al dashboard
    console.warn('[ModulePermissionGuard] Access denied for modules:', moduleCodes);
    router.navigate(['/dashboard'], {
      queryParams: {
        accessDenied: true,
        module: moduleCodes.join(','),
      },
    });

    return false;
  };
};

/**
 * Guard factory para verificar múltiples permisos con lógica AND
 * Todos los módulos deben tener el acceso requerido
 *
 * Uso:
 *   canActivate: [modulePermissionGuardAll(['admin', 'payroll'], 'edit')]
 */
export const modulePermissionGuardAll = (
  requiredModules: string[],
  requiredAction: ModuleAction = 'view'
): CanActivateFn => {
  return async () => {
    const modulePermissions = inject(ModulePermissionsService);
    const dashboardStore = inject(DashboardStore);
    const router = inject(Router);

    // Esperar carga del empleado
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentEmployee = dashboardStore.currentEmployee();

    if (!currentEmployee) {
      router.navigate(['/dashboard']);
      return false;
    }

    // Admins tienen acceso a todo
    if (dashboardStore.isAdmin()) {
      return true;
    }

    // Inicializar si es necesario
    if (!modulePermissions.isInitialized()) {
      await modulePermissions.initialize();
    }

    if (modulePermissions.getCurrentPermissions().length === 0) {
      await modulePermissions.loadCurrentUserPermissions(currentEmployee.id);
    }

    // Verificar acceso a TODOS los módulos
    const hasAccess = requiredModules.every((code) =>
      modulePermissions.canAccess(code, requiredAction)
    );

    if (!hasAccess) {
      router.navigate(['/dashboard'], {
        queryParams: {
          accessDenied: true,
          module: requiredModules.join(','),
        },
      });
    }

    return hasAccess;
  };
};

/**
 * Guard que verifica si el usuario tiene acceso a cualquier submódulo de un módulo padre
 *
 * Uso:
 *   canActivate: [moduleChildAccessGuard('admin')]
 */
export const moduleChildAccessGuard = (parentModuleCode: string): CanActivateFn => {
  return async () => {
    const modulePermissions = inject(ModulePermissionsService);
    const dashboardStore = inject(DashboardStore);
    const router = inject(Router);

    // Esperar carga del empleado
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentEmployee = dashboardStore.currentEmployee();

    if (!currentEmployee) {
      router.navigate(['/dashboard']);
      return false;
    }

    // Admins tienen acceso a todo
    if (dashboardStore.isAdmin()) {
      return true;
    }

    // Inicializar si es necesario
    if (!modulePermissions.isInitialized()) {
      await modulePermissions.initialize();
    }

    if (modulePermissions.getCurrentPermissions().length === 0) {
      await modulePermissions.loadCurrentUserPermissions(currentEmployee.id);
    }

    // Verificar acceso al módulo padre o cualquier hijo
    const permissions = modulePermissions.getCurrentPermissions();
    const hasAccess = permissions.some(
      (p) =>
        (p.moduleCode === parentModuleCode ||
          p.moduleCode.startsWith(`${parentModuleCode}.`)) &&
        p.canView &&
        !p.isBlocked
    );

    if (!hasAccess) {
      router.navigate(['/dashboard'], {
        queryParams: {
          accessDenied: true,
          module: parentModuleCode,
        },
      });
    }

    return hasAccess;
  };
};
