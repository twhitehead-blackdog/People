import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, map, of, switchMap, take } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { TestModeService } from '../services/test-mode.service';

// Tipo para el empleado con posición
type EmployeeWithPosition = {
  id: string;
  work_email?: string;
  position?: {
    name: string;
    admin: boolean;
    schedule_admin: boolean;
    schedule_approver: boolean;
    default_view?: string;
  };
  has_portal_access?: boolean;
  account_approved?: boolean;
  legacy_permissions_override?: string | Record<string, boolean>;
  frontend_permissions_override?: string | Record<string, any>;
};

// Permisos resueltos
type ResolvedPermissions = {
  isAdmin: boolean;
  hasDashboardAccess: boolean;
  hasTimeManagementAccess: boolean;
  hasPortalAccessOnly: boolean;
  isScheduleApprover: boolean;
};

// Cache simple en memoria para evitar llamadas HTTP repetidas
let employeeCache: {
  email: string;
  employee: EmployeeWithPosition;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 15 * 1000; // 15 segundos (reducido para reflejar cambios de permisos más rápido)

/**
 * Función para invalidar el cache del guard
 * Útil cuando el empleado cambia de estado o permisos
 */
export function invalidateEmployeeCache(email?: string): void {
  if (email) {
    if (employeeCache && employeeCache.email === email) {
      employeeCache = null;
    }
  } else {
    employeeCache = null;
  }
}

// Lista de correos con acceso completo (super admins)
const superAdminEmails = [
  'mercadeo@blackdogpanama.com',
  'soporte2@blackdogpanama.com',
];

/**
 * Resuelve los permisos de un empleado basándose en los flags de su posición.
 * Aplica test mode overrides si el usuario es soporte2.
 */
function resolvePermissions(
  employee: EmployeeWithPosition,
  testModeService: TestModeService
): ResolvedPermissions {
  const isSupportUser =
    employee.work_email && testModeService.isSupportUser(employee.work_email);
  const currentTestMode = testModeService.getMode();

  // Test mode overrides
  if (isSupportUser && currentTestMode !== null) {
    if (currentTestMode === 'empleado') {
      return {
        isAdmin: false,
        hasDashboardAccess: false,
        hasTimeManagementAccess: false,
        hasPortalAccessOnly: true,
        isScheduleApprover: false,
      };
    }
    if (currentTestMode === 'gerente') {
      return {
        isAdmin: false,
        hasDashboardAccess: false,
        hasTimeManagementAccess: true,
        hasPortalAccessOnly: false,
        isScheduleApprover: true,
      };
    }
    if (currentTestMode === 'admin') {
      return {
        isAdmin: true,
        hasDashboardAccess: true,
        hasTimeManagementAccess: true,
        hasPortalAccessOnly: false,
        isScheduleApprover: true,
      };
    }
  }

  const pos = employee.position;

  // Base: flags de la posición
  let isAdmin = pos?.admin === true;
  let hasDashboardAccess = false;
  let hasTimeManagementAccess =
    pos?.schedule_admin === true || pos?.schedule_approver === true;
  let isScheduleApprover = pos?.schedule_approver === true;

  // Override: legacy_permissions_override del empleado
  if (employee.legacy_permissions_override) {
    try {
      const legacy = typeof employee.legacy_permissions_override === 'string'
        ? JSON.parse(employee.legacy_permissions_override)
        : employee.legacy_permissions_override;
      if (legacy.admin !== undefined) isAdmin = legacy.admin === true;
      if (legacy.schedule_admin !== undefined || legacy.schedule_approver !== undefined) {
        hasTimeManagementAccess = legacy.schedule_admin === true || legacy.schedule_approver === true;
      }
      if (legacy.schedule_approver !== undefined) isScheduleApprover = legacy.schedule_approver === true;
    } catch (e) { /* ignore parse errors */ }
  }

  // hasDashboardAccess se deriva de admin flag + frontend_permissions_override
  if (isAdmin) {
    hasDashboardAccess = true;
  }

  // frontend_permissions_override determina acceso al dashboard por módulos
  if (employee.frontend_permissions_override) {
    try {
      const frontend = typeof employee.frontend_permissions_override === 'string'
        ? JSON.parse(employee.frontend_permissions_override)
        : employee.frontend_permissions_override;
      if (frontend?.modules) {
        const modules = frontend.modules as Record<string, { enabled?: boolean }>;
        if (modules['admin']?.enabled) hasDashboardAccess = true;
        if (modules['payroll']?.enabled) hasDashboardAccess = true;
        if (modules['hr']?.enabled) hasDashboardAccess = true;
        if (modules['performance']?.enabled) hasDashboardAccess = true;
        if (modules['time_management']?.enabled) hasTimeManagementAccess = true;
        if (modules['branch_manager']?.enabled) hasTimeManagementAccess = true;
        if (modules['timeclock']?.enabled) hasTimeManagementAccess = true;
      }
    } catch (e) { /* ignore parse errors */ }
  }

  const hasPortalAccessOnly =
    !isAdmin && !hasDashboardAccess && !hasTimeManagementAccess;

  return {
    isAdmin,
    hasDashboardAccess,
    hasTimeManagementAccess,
    hasPortalAccessOnly,
    isScheduleApprover,
  };
}

/**
 * Resuelve la navegación basándose en los permisos y la ruta solicitada.
 */
function resolveNavigation(
  perms: ResolvedPermissions,
  employee: EmployeeWithPosition,
  route: any,
  state: any,
  router: Router
): boolean | UrlTree {
  const currentRoute = route.routeConfig?.path || '';
  const isTimeclockRoute =
    currentRoute === 'timeclock' || state.url.includes('/timeclock');
  const isTimeManagementRoute =
    currentRoute === 'time-management' ||
    state.url.includes('/time-management');
  const isBranchManagerRoute =
    currentRoute === 'branch-manager' ||
    state.url.includes('/branch-manager');
  const isPortalRoute =
    currentRoute === 'my-portal' ||
    state.url.includes('/my-portal') ||
    state.url.includes('/employee-portal');
  const isHomeRoute =
    currentRoute === 'home' ||
    state.url.includes('/home') ||
    state.url === '/' ||
    state.url === '';

  // Home route requiere acceso al dashboard (admin o módulos frontend habilitados)
  if (isHomeRoute && !perms.hasDashboardAccess) {
    if (perms.hasTimeManagementAccess) {
      return router.createUrlTree(['/time-management']);
    }
    return router.createUrlTree(['/my-portal']);
  }

  // Home route: si el módulo 'home' está desactivado en frontend_permissions_override, redirigir
  if (isHomeRoute && perms.hasDashboardAccess) {
    let homeDisabled = false;
    let modules: Record<string, { enabled?: boolean }> = {};
    if (employee.frontend_permissions_override) {
      try {
        const fp = typeof employee.frontend_permissions_override === 'string'
          ? JSON.parse(employee.frontend_permissions_override)
          : employee.frontend_permissions_override;
        modules = (fp?.modules || {}) as Record<string, { enabled?: boolean }>;
        const homeModule = modules['home'];
        if (homeModule && homeModule.enabled === false) {
          homeDisabled = true;
        }
      } catch (e) { /* ignore */ }
    }
    if (homeDisabled) {
      // Buscar primer módulo disponible (no home)
      const fallbackOrder = [
        { id: 'admin', route: '/admin' },
        { id: 'time_management', route: '/time-management' },
        { id: 'payroll', route: '/payroll' },
        { id: 'branch_manager', route: '/branch-manager' },
        { id: 'timeclock', route: '/timeclock' },
      ];
      for (const fb of fallbackOrder) {
        if (modules[fb.id]?.enabled) {
          return router.createUrlTree([fb.route]);
        }
      }
      // Si ningún módulo está habilitado, ir al portal
      return router.createUrlTree(['/my-portal']);
    }
  }

  // Admin tiene acceso a todo (excepto home sin hasDashboardAccess, ya filtrado arriba)
  if (perms.isAdmin) {
    return true;
  }

  // Si tiene acceso a gestión de tiempo, permitir time-management, timeclock y branch-manager
  if (
    perms.hasTimeManagementAccess &&
    (isTimeManagementRoute || isTimeclockRoute || isBranchManagerRoute)
  ) {
    return true;
  }

  // Portal-only users: redirigir a employee-portal desde cualquier ruta no-portal
  if (perms.hasPortalAccessOnly && !isPortalRoute) {
    return router.createUrlTree(['/employee-portal']);
  }

  // Sin acceso al dashboard y no es ruta de portal/timeclock/time-management
  if (
    !perms.hasDashboardAccess &&
    !isPortalRoute &&
    !isTimeclockRoute &&
    !isTimeManagementRoute
  ) {
    return router.createUrlTree(['/employee-portal']);
  }

  // Portal siempre accesible
  if (isPortalRoute) {
    return true;
  }

  // Time management users pueden acceder a sus rutas
  if (perms.hasTimeManagementAccess) {
    return true;
  }

  return perms.hasDashboardAccess;
}

/**
 * Guard que redirige a empleados normales (no admins) al portal
 * Solo los admins pueden acceder a rutas administrativas
 */
export const employeePortalGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const apiUrl = inject(ApiUrlService);
  const orgService = inject(OrganizationService);
  const testModeService = inject(TestModeService);

  return authService.user$.pipe(
    take(1),
    switchMap((user: any) => {
      // Si no hay usuario de Auth0, redirigir a sin-acceso
      if (!user) {
        return of(router.createUrlTree(['/sin-acceso']));
      }

      const userEmail = user?.email?.toLowerCase();
      const isSupportUser =
        userEmail && testModeService.isSupportUser(userEmail);
      const currentTestMode = testModeService.getMode();

      // Si es soporte2 y está en modo de prueba, aplicar las restricciones del modo
      if (isSupportUser && currentTestMode !== null) {
        if (currentTestMode === 'empleado') {
          const isPortalRoute =
            state.url.includes('/employee-portal') ||
            state.url.includes('/my-portal');
          if (!isPortalRoute) {
            return of(router.createUrlTree(['/employee-portal']));
          }
          return of(true);
        }
        if (currentTestMode === 'gerente') {
          const isTimeManagementRoute = state.url.includes('/time-management');
          const isTimeclockRoute = state.url.includes('/timeclock');
          const isBranchManagerRoute = state.url.includes('/branch-manager');
          const isPortalRoute =
            state.url.includes('/employee-portal') ||
            state.url.includes('/my-portal');

          if (
            isTimeManagementRoute ||
            isTimeclockRoute ||
            isBranchManagerRoute ||
            isPortalRoute
          ) {
            return of(true);
          }
          return of(router.createUrlTree(['/time-management']));
        }
        // Si está en modo "admin", continuar con el flujo normal (sin restricciones)
      }

      // Super admin bypass (solo si no está en modo de prueba restringido)
      // Para /home NO hacemos bypass: necesitamos verificar si home está deshabilitado
      const isHomeRoute =
        state.url.includes('/home') || state.url === '/' || state.url === '';
      if (
        userEmail &&
        superAdminEmails.includes(userEmail) &&
        (currentTestMode === null || currentTestMode === 'admin') &&
        !isHomeRoute
      ) {
        return of(true);
      }

      if (!user?.email) {
        return of(false);
      }

      // Verificar cache
      const now = Date.now();
      if (
        employeeCache &&
        employeeCache.email === user.email &&
        now - employeeCache.timestamp < CACHE_DURATION
      ) {
        const employee = employeeCache.employee;

        if (employee.account_approved === false) {
          employeeCache = null;
          return of(router.createUrlTree(['/sin-acceso']));
        }

        const perms = resolvePermissions(employee, testModeService);
        return of(resolveNavigation(perms, employee, route, state, router));
      }

      // Si no hay cache, hacer llamada HTTP
      const companyId = orgService.getCurrentCompanyId();
      const params: any = {
        work_email: `eq.${user.email}`,
        select:
          'id,work_email,position:positions(name,admin,schedule_admin,schedule_approver,default_view),has_portal_access,account_approved,legacy_permissions_override,frontend_permissions_override',
      };

      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }

      const url = apiUrl.build('rest/v1/employees', params);
      return http.get<Array<EmployeeWithPosition>>(url).pipe(
        map((employees: Array<EmployeeWithPosition>) => {
          const employee = employees[0];

          // Actualizar cache
          if (employee) {
            employeeCache = {
              email: user.email!,
              employee,
              timestamp: Date.now(),
            };
          }

          if (!employee) {
            employeeCache = null;
            return router.createUrlTree(['/sin-acceso']);
          }

          if (employee.account_approved === false) {
            employeeCache = null;
            return router.createUrlTree(['/sin-acceso']);
          }

          const perms = resolvePermissions(employee, testModeService);
          return resolveNavigation(perms, employee, route, state, router);
        }),
        catchError(() => {
          // Si hay error, usar cache si existe
          if (employeeCache && employeeCache.email === user.email) {
            const employee = employeeCache.employee;

            if (employee.account_approved === false) {
              employeeCache = null;
              return of(router.createUrlTree(['/sin-acceso']));
            }

            const perms = resolvePermissions(employee, testModeService);
            return of(
              resolveNavigation(perms, employee, route, state, router)
            );
          }
          // Si no hay cache y hay error, redirigir a sin-acceso para evitar pantalla negra
          return of(router.createUrlTree(['/sin-acceso']));
        })
      );
    })
  );
};
