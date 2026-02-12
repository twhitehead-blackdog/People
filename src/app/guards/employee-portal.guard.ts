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
    dashboard_access: boolean;
    schedule_admin: boolean;
    schedule_approver: boolean;
    default_view?: string;
  };
  has_portal_access?: boolean;
  account_approved?: boolean;
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

const CACHE_DURATION = 30 * 1000; // 30 segundos

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
  const isAdmin = pos?.admin === true;
  const hasDashboardAccess = pos?.dashboard_access === true;
  const hasTimeManagementAccess =
    pos?.schedule_admin === true || pos?.schedule_approver === true;
  const isScheduleApprover = pos?.schedule_approver === true;
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

  // Admin tiene acceso a todo
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

  // Time management users en home → redirigir a time-management
  if (
    perms.hasTimeManagementAccess &&
    !perms.hasDashboardAccess &&
    isHomeRoute
  ) {
    return router.createUrlTree(['/time-management']);
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

  // Redirigir a vista predeterminada si está en home/root
  if (isHomeRoute && employee.position?.default_view) {
    const defaultView = employee.position.default_view;
    const routeMap: Record<string, string> = {
      home: '/home',
      admin: '/admin',
      payroll: '/payroll',
      'time-management': '/time-management',
      timeclock: '/timeclock',
      'employee-portal': '/employee-portal',
    };
    if (
      perms.hasTimeManagementAccess &&
      !perms.hasDashboardAccess &&
      defaultView === 'home'
    ) {
      return router.createUrlTree(['/time-management']);
    }
    const targetRoute = routeMap[defaultView] || '/home';
    return router.createUrlTree([targetRoute]);
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
      // Si no hay usuario de Auth0, denegar acceso
      if (!user) {
        return of(false);
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
      if (
        userEmail &&
        superAdminEmails.includes(userEmail) &&
        (currentTestMode === null || currentTestMode === 'admin')
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
          'id,work_email,position:positions(name,admin,dashboard_access,schedule_admin,schedule_approver,default_view),has_portal_access,account_approved',
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
            return false;
          }

          if (employee.account_approved === false) {
            employeeCache = null;
            return router.createUrlTree(['/sin-acceso']);
          }

          const perms = resolvePermissions(employee, testModeService);
          return resolveNavigation(perms, employee, route, state, router);
        }),
        catchError((error) => {
          console.error('Error en employeePortalGuard:', error);
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
          // Si no hay cache y hay error, permitir acceso por defecto (para evitar bloqueos)
          console.warn(
            'No hay cache y error en guard, permitiendo acceso por defecto'
          );
          return of(true);
        })
      );
    })
  );
};
