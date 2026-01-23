import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionKey } from '../dashboard/pt-permissions/permissions.types';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Guard para verificar si el usuario tiene un permiso específico.
 * Soporta verificar uno solo o una lista (OR logic).
 *
 * IMPORTANTE: Este guard ahora espera a que el empleado esté cargado
 * antes de verificar permisos para evitar race conditions.
 *
 * Uso: canActivate: [permissionGuard('admin')]
 * Uso múltiple: canActivate: [permissionGuard(['admin', 'schedule_admin'])]
 */
export const permissionGuard = (
  requiredPermission: PermissionKey | PermissionKey[]
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

    // Redirigir si no tiene acceso (podría ser a una página 403 o al home)
    console.log('[PermissionGuard] Access denied, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  };
};
