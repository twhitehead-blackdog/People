import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PermissionsStore } from '../core/permissions/permissions.store';
import { PermissionKey } from '../dashboard/pt-permissions/permissions.types';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Guard para verificar si el usuario tiene un permiso específico.
 *
 * Uso en rutas:
 * { path: '...', canActivate: [permissionGuard('dashboard.access')] }
 */
export const permissionGuard = (
  legacyPermission?: PermissionKey | PermissionKey[]
): CanActivateFn => {
  return async (route, state) => {
    const permissionsStore = inject(PermissionsStore);
    const permissionsService = inject(PermissionsService);
    const router = inject(Router);
    const dashboardStore = inject(DashboardStore);

    // 1. Determinar el permiso requerido
    let requiredKeys: PermissionKey[] = [];

    if (legacyPermission) {
      requiredKeys = Array.isArray(legacyPermission)
        ? legacyPermission
        : [legacyPermission];
    } else {
      const routeKey = route.data?.['permissionKey'] as PermissionKey;
      if (routeKey) {
        requiredKeys = [routeKey];
      }
    }

    if (requiredKeys.length === 0) {
      return true;
    }

    // 2. Esperar a que el employee esté cargado
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!dashboardStore.currentEmployee() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const employee = dashboardStore.currentEmployee();
    if (!employee) {
      router.navigate(['/login']);
      return false;
    }

    // 3. Si permisos no están cargados, cargarlos directamente
    if (!permissionsStore.isLoaded()) {
      await permissionsService.loadUserPermissions(employee);
    }

    // 4. Verificar Permisos
    const hasAccess = requiredKeys.some((key) => permissionsStore.can(key));

    if (hasAccess) {
      return true;
    }

    const messageService = inject(MessageService);
    messageService.add({
      severity: 'warn',
      summary: 'Sin permisos',
      detail: 'No tienes permisos para acceder a esta sección.',
      life: 4000,
    });
    router.navigate(['/home']);
    return false;
  };
};
