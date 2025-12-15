import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, take, of, catchError } from 'rxjs';
import { OrganizationService } from '../services/organization.service';

// Tipo para el empleado con posición
type EmployeeWithPosition = {
  id: string;
  position?: { 
    name: string; 
    admin: boolean; 
    dashboard_access?: boolean; 
    default_view?: string;
  };
  has_portal_access?: boolean;
  account_approved?: boolean;
};

// Cache simple en memoria para evitar llamadas HTTP repetidas
let employeeCache: {
  email: string;
  employee: EmployeeWithPosition;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Función para invalidar el cache del guard
 * Útil cuando el empleado cambia de estado o permisos
 */
export function invalidateEmployeeCache(email?: string): void {
  if (email) {
    // Invalidar cache solo para un email específico
    if (employeeCache && employeeCache.email === email) {
      employeeCache = null;
    }
  } else {
    // Invalidar todo el cache
    employeeCache = null;
  }
}

/**
 * Guard que redirige a empleados normales (no admins) al portal
 * Solo los admins pueden acceder a rutas administrativas
 */
export const employeePortalGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const orgService = inject(OrganizationService);

  // Lista de correos con acceso completo (super admins)
  const superAdminEmails = ['mercadeo@blackdogpanama.com', 'soporte2@blackdogpanama.com'];
  
  // Lista de cargos que solo tienen acceso al portal (no al reloj de marcaciones)
  const portalOnlyPositions = [
    'Piso de venta',
    'Veterinario',
    'Peluquero',
    'Asistente de veterinario',
    'Asistente de peluquería',
  ];

  // Lista de cargos que tienen acceso especial a gestión de tiempo y reloj de marcaciones
  const timeManagementAccessPositions = [
    'gerente de tienda',
  ];

  return authService.user$.pipe(
    take(1),
    switchMap((user) => {
      // Verificar si el usuario actual es un super admin
      const userEmail = user?.email?.toLowerCase();
      
      if (userEmail && superAdminEmails.includes(userEmail)) {
        // Super admin tiene acceso a todo
        return of(true);
      }

      // Obtener información del empleado
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
        
        // Validar que account_approved sea true incluso en cache
        // Si account_approved es null o undefined, permitir acceso (compatibilidad con datos antiguos)
        if (employee.account_approved === false) {
          // Invalidar cache si el empleado está explícitamente desaprobado
          employeeCache = null;
          return of(router.createUrlTree(['/sin-acceso']));
        }
        
        const positionName = employee.position?.name || '';
        const isPortalOnlyPosition = portalOnlyPositions.some(
          (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
        );
        const hasTimeManagementAccess = timeManagementAccessPositions.some(
          (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
        );
        const hasPortalAccessOnly = 
          isPortalOnlyPosition || 
          (employee.has_portal_access === true && !employee.position?.admin);
        
        // Verificar permiso de dashboard
        // Si dashboard_access es null/undefined, permitir acceso (compatibilidad con datos antiguos)
        // Solo denegar si es explícitamente false
        const hasDashboardAccess = employee.position?.dashboard_access !== false;
        
        // Si el usuario es admin, siempre permitir acceso (independientemente de dashboard_access)
        const isAdmin = employee.position?.admin === true;

        const currentRoute = route.routeConfig?.path || '';
        const isTimeclockRoute = currentRoute === 'timeclock' || state.url.includes('/timeclock');
        const isTimeManagementRoute = currentRoute === 'time-management' || state.url.includes('/time-management');
        const isPortalRoute = currentRoute === 'my-portal' || state.url.includes('/my-portal') || state.url.includes('/employee-portal');
        const isHomeRoute = currentRoute === 'home' || state.url.includes('/home') || state.url === '/' || state.url === '';
        
        // Si tiene acceso especial a gestión de tiempo, permitir acceso a time-management y timeclock
        if (hasTimeManagementAccess && (isTimeManagementRoute || isTimeclockRoute)) {
          return of(true);
        }
        
        // Los gerentes de tienda NO pueden acceder a home (resumen), redirigir a time-management
        if (hasTimeManagementAccess && isHomeRoute) {
          return of(router.createUrlTree(['/time-management']));
        }
        
        // Si es gerente de tienda en ruta raíz sin dashboard_access, redirigir a time-management
        if (hasTimeManagementAccess && (state.url === '/' || state.url === '') && !hasDashboardAccess) {
          return of(router.createUrlTree(['/time-management']));
        }
        
        // Si es admin, permitir acceso a todas las rutas administrativas
        if (isAdmin) {
          return of(true);
        }
        
        // Si no tiene acceso al dashboard y está intentando acceder a rutas del dashboard, redirigir al portal
        // Pero excluir gerentes de tienda que tienen acceso especial
        if (!hasDashboardAccess && !isPortalRoute && !isTimeclockRoute && !isTimeManagementRoute && !hasTimeManagementAccess) {
          return of(router.createUrlTree(['/employee-portal']));
        }

        // Excluir gerentes de tienda de las restricciones de portal-only
        if (hasPortalAccessOnly && !hasTimeManagementAccess && isTimeclockRoute) {
          return of(router.createUrlTree(['/employee-portal']));
        }

        if (hasPortalAccessOnly && !hasTimeManagementAccess && !isPortalRoute && (isHomeRoute || !isTimeclockRoute)) {
          return of(router.createUrlTree(['/employee-portal']));
        }
        
        // Si está en la ruta raíz o home y tiene una vista predeterminada, redirigir
        // Pero los gerentes de tienda no pueden tener 'home' como vista predeterminada
        if ((isHomeRoute || state.url === '/' || state.url === '') && employee.position?.default_view) {
          const defaultView = employee.position.default_view;
          // Mapear la vista predeterminada a la ruta correcta
          const routeMap: Record<string, string> = {
            'home': '/home',
            'admin': '/admin',
            'payroll': '/payroll',
            'time-management': '/time-management',
            'timeclock': '/timeclock',
            'employee-portal': '/employee-portal',
          };
          // Si es gerente de tienda y la vista predeterminada es 'home', usar 'time-management' en su lugar
          if (hasTimeManagementAccess && defaultView === 'home') {
            return of(router.createUrlTree(['/time-management']));
          }
          const targetRoute = routeMap[defaultView] || '/home';
          return of(router.createUrlTree([targetRoute]));
        }

        if (isPortalRoute) {
          return of(true);
        }

        // Permitir acceso a gerentes de tienda incluso sin dashboard_access
        if (hasTimeManagementAccess) {
          return of(true);
        }

        return of(!hasPortalAccessOnly && hasDashboardAccess);
      }

      // Si no hay cache, hacer llamada HTTP
      // Ya no hay tablas naz_*, todo es por company_id en employees
      const companyId = orgService.getCurrentCompanyId();
      const params: any = {
        work_email: `eq.${user.email}`,
        select: 'id,position:positions(name,admin,dashboard_access,default_view),has_portal_access,account_approved',
      };
      
      // Filtrar por company_id si está disponible
      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }
      
      return http.get<Array<EmployeeWithPosition>>(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
        { params }
      ).pipe(
        catchError((error) => {
          // Si falla la consulta con dashboard_access/default_view, intentar sin esos campos
          console.warn('Error en consulta con dashboard_access, intentando sin esos campos:', error);
          return http.get<Array<{
            id: string;
            position?: { name: string; admin: boolean };
            has_portal_access?: boolean;
            account_approved?: boolean;
          }>>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
            {
              params: {
                work_email: `eq.${user.email}`,
                select: 'id,position:positions(name,admin),has_portal_access,account_approved',
              },
            }
          ).pipe(
            switchMap((employees) => {
              // Si se encuentra en employees, usar esos datos
              if (employees && employees.length > 0) {
                return of(employees.map(emp => ({
                  ...emp,
                  position: emp.position ? {
                    ...emp.position,
                    dashboard_access: undefined,
                    default_view: undefined,
                  } : undefined
                })));
              }
              
              // Si no hay empleados, retornar array vacío
              return of([]);
            })
          );
        }),
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
            // Si no se encuentra el empleado, invalidar cache y denegar acceso
            employeeCache = null;
            return false;
          }

          // Validar que account_approved no sea false antes de permitir acceso
          // Si account_approved es null o undefined, permitir acceso (compatibilidad con datos antiguos)
          if (employee.account_approved === false) {
            // Invalidar cache si el empleado está explícitamente desaprobado
            employeeCache = null;
            return router.createUrlTree(['/sin-acceso']);
          }

          const positionName = employee.position?.name || '';
          const isPortalOnlyPosition = portalOnlyPositions.some(
            (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
          );
          const hasTimeManagementAccess = timeManagementAccessPositions.some(
            (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
          );
          const hasPortalAccessOnly = 
            isPortalOnlyPosition || 
            (employee.has_portal_access === true && !employee.position?.admin);

          // Rutas que todos pueden acceder
          const currentRoute = route.routeConfig?.path || '';
          const isTimeclockRoute = currentRoute === 'timeclock' || state.url.includes('/timeclock');
          const isTimeManagementRoute = currentRoute === 'time-management' || state.url.includes('/time-management');
          const isPortalRoute = currentRoute === 'my-portal' || state.url.includes('/my-portal') || state.url.includes('/employee-portal');
          const isHomeRoute = currentRoute === 'home' || state.url.includes('/home') || state.url === '/' || state.url === '';
          
          // Verificar permiso de dashboard
          // Si dashboard_access es null/undefined, permitir acceso (compatibilidad con datos antiguos)
          // Solo denegar si es explícitamente false
          const hasDashboardAccess = employee.position?.dashboard_access !== false;
          
          // Si el usuario es admin, siempre permitir acceso (independientemente de dashboard_access)
          const isAdmin = employee.position?.admin === true;
          
          // Si tiene acceso especial a gestión de tiempo, permitir acceso a time-management y timeclock
          if (hasTimeManagementAccess && (isTimeManagementRoute || isTimeclockRoute)) {
            return true;
          }
          
          // Los gerentes de tienda NO pueden acceder a home (resumen), redirigir a time-management
          if (hasTimeManagementAccess && isHomeRoute) {
            return router.createUrlTree(['/time-management']);
          }
          
          // Si es gerente de tienda en ruta raíz sin dashboard_access, redirigir a time-management
          if (hasTimeManagementAccess && (state.url === '/' || state.url === '') && !hasDashboardAccess) {
            return router.createUrlTree(['/time-management']);
          }
          
          // Si es admin, permitir acceso a todas las rutas administrativas
          if (isAdmin) {
            return true;
          }
          
          // Si no tiene acceso al dashboard y está intentando acceder a rutas del dashboard, redirigir al portal
          // Pero excluir gerentes de tienda que tienen acceso especial
          if (!hasDashboardAccess && !isPortalRoute && !isTimeclockRoute && !isTimeManagementRoute && !hasTimeManagementAccess) {
            return router.createUrlTree(['/employee-portal']);
          }

          // Excluir gerentes de tienda de las restricciones de portal-only
          if (hasPortalAccessOnly && !hasTimeManagementAccess && isTimeclockRoute) {
            return router.createUrlTree(['/employee-portal']);
          }

          // Si tiene acceso solo al portal y está intentando acceder a home u otras rutas, redirigir al portal
          // Pero excluir gerentes de tienda
          if (hasPortalAccessOnly && !hasTimeManagementAccess && !isPortalRoute && (isHomeRoute || !isTimeclockRoute)) {
            return router.createUrlTree(['/employee-portal']);
          }
          
          // Si está en la ruta raíz o home y tiene una vista predeterminada, redirigir
          // Pero los gerentes de tienda no pueden tener 'home' como vista predeterminada
          if ((isHomeRoute || state.url === '/' || state.url === '') && employee.position?.default_view) {
            const defaultView = employee.position.default_view;
            // Mapear la vista predeterminada a la ruta correcta
            const routeMap: Record<string, string> = {
              'home': '/home',
              'admin': '/admin',
              'payroll': '/payroll',
              'time-management': '/time-management',
              'timeclock': '/timeclock',
              'employee-portal': '/employee-portal',
            };
            // Si es gerente de tienda y la vista predeterminada es 'home', usar 'time-management' en su lugar
            if (hasTimeManagementAccess && defaultView === 'home') {
              return router.createUrlTree(['/time-management']);
            }
            const targetRoute = routeMap[defaultView] || '/home';
            return router.createUrlTree([targetRoute]);
          }

          // Permitir acceso al portal siempre
          if (isPortalRoute) {
            return true;
          }

          // Permitir acceso a gerentes de tienda incluso sin dashboard_access
          if (hasTimeManagementAccess) {
            return true;
          }

          // Para otras rutas, permitir acceso si no tiene restricción de portal y tiene acceso al dashboard
          return !hasPortalAccessOnly && hasDashboardAccess;
        }),
        catchError((error) => {
          console.error('Error en employeePortalGuard:', error);
          // Si hay error en la llamada HTTP, usar cache si existe
          if (employeeCache && employeeCache.email === user.email) {
            const employee = employeeCache.employee;
            
            // Validar account_approved incluso en cache
            // Si account_approved es null o undefined, permitir acceso (compatibilidad con datos antiguos)
            if (employee.account_approved === false) {
              employeeCache = null;
              return of(router.createUrlTree(['/sin-acceso']));
            }
            
            const positionName = employee.position?.name || '';
            const isPortalOnlyPosition = portalOnlyPositions.some(
              (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
            );
            const hasTimeManagementAccess = timeManagementAccessPositions.some(
              (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
            );
            const hasPortalAccessOnly = 
              isPortalOnlyPosition || 
              (employee.has_portal_access === true && !employee.position?.admin);
            
            // Verificar permiso de dashboard
            const hasDashboardAccess = employee.position?.dashboard_access !== false;
            
            // Si el usuario es admin, siempre permitir acceso
            const isAdmin = employee.position?.admin === true;
            if (isAdmin) {
              return of(true);
            }
            
            // Si tiene acceso especial a gestión de tiempo, permitir acceso siempre
            if (hasTimeManagementAccess) {
              return of(true);
            }
            
            return of(!hasPortalAccessOnly && hasDashboardAccess);
          }
          // Si no hay cache y hay error, permitir acceso por defecto (para evitar bloqueos)
          // Esto es más permisivo pero evita que los usuarios queden bloqueados
          console.warn('No hay cache y error en guard, permitiendo acceso por defecto');
          return of(true);
        })
      );
    })
  );
};

