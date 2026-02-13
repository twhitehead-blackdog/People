import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LegacyPermissionKey } from '../dashboard/pt-permissions/permissions.types';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Guard para verificar si el usuario tiene un permiso específico (legacy).
 * Soporta verificar uno solo o una lista (OR logic).
 *
 * IMPORTANTE: Este guard ahora espera a que el empleado esté cargado
 * antes de verificar permisos para evitar race conditions.
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

    console.log('========================================');
    console.log('[PermissionGuard] *** GUARD ACTIVATED ***');
    console.log('[PermissionGuard] Checking permissions:', keys);
    console.log(
      '[PermissionGuard] Current employee (before wait):',
      dashboardStore.currentEmployee()
    );

    // Esperar hasta que el empleado esté cargado (máximo 5 segundos)
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentEmployee = dashboardStore.currentEmployee();
    console.log(
      '[PermissionGuard] Current employee after wait:',
      currentEmployee?.first_name,
      currentEmployee?.father_name
    );
    console.log('[PermissionGuard] Position:', currentEmployee?.position);

    if (!currentEmployee) {
      console.warn(
        '[PermissionGuard] No employee loaded after waiting, redirecting'
      );
      router.navigate(['/dashboard']);
      return false;
    }

    // Verificar si tiene AL MENOS UNO de los permisos requeridos
    const hasAccess = keys.some((key) => {
      const result = permissions.canCurrentUser(key);
      console.log(`[PermissionGuard] Permission ${key}: ${result}`);
      return result;
    });

    console.log('[PermissionGuard] Has access:', hasAccess);

    if (hasAccess) {
      return true;
    }

    // Redirigir si no tiene acceso
    console.log('[PermissionGuard] Access denied, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  };
};

/**
 * Guard para verificar acceso a un módulo/submódulo específico del frontend.
 * Este guard usa la nueva estructura de permisos por módulo.
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

    console.log('========================================');
    console.log('[ModulePermissionGuard] *** GUARD ACTIVATED ***');
    console.log('[ModulePermissionGuard] Module:', moduleId);
    console.log('[ModulePermissionGuard] SubModule:', subModuleId || '(any)');

    // Esperar hasta que el empleado esté cargado
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

    // Verificar acceso
    let hasAccess = false;
    
    if (subModuleId) {
      // Verificar acceso específico al submódulo
      hasAccess = permissions.canAccessSubModule(moduleId, subModuleId);
    } else {
      // Verificar acceso al módulo completo (cualquier submódulo)
      hasAccess = permissions.canAccessModule(moduleId);
    }

    console.log('[ModulePermissionGuard] Has access:', hasAccess);

    if (hasAccess) {
      return true;
    }

    // Redirigir si no tiene acceso
    console.log('[ModulePermissionGuard] Access denied, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  };
};

/**
 * Guard combinado que verifica permiso legacy O permiso de módulo.
 * Útil para la transición entre sistemas de permisos.
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

    console.log('========================================');
    console.log('[CombinedPermissionGuard] *** GUARD ACTIVATED ***');

    // Esperar hasta que el empleado esté cargado
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentEmployee = dashboardStore.currentEmployee();

    if (!currentEmployee) {
      console.warn('[CombinedPermissionGuard] No employee loaded, redirecting');
      router.navigate(['/dashboard']);
      return false;
    }

    // Verificar permiso legacy
    const hasLegacyAccess = permissions.canCurrentUser(legacyPermission);
    
    // Verificar permiso de módulo
    let hasModuleAccess = false;
    if (subModuleId) {
      hasModuleAccess = permissions.canAccessSubModule(moduleId, subModuleId);
    } else {
      hasModuleAccess = permissions.canAccessModule(moduleId);
    }

    const hasAccess = hasLegacyAccess || hasModuleAccess;

    console.log('[CombinedPermissionGuard] Legacy access:', hasLegacyAccess);
    console.log('[CombinedPermissionGuard] Module access:', hasModuleAccess);
    console.log('[CombinedPermissionGuard] Has access:', hasAccess);

    if (hasAccess) {
      return true;
    }

    console.log('[CombinedPermissionGuard] Access denied, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  };
};
