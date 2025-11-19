import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, take, of, catchError } from 'rxjs';

// Cache simple en memoria para evitar llamadas HTTP repetidas
let employeeCache: {
  email: string;
  employee: any;
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

  // Lista de correos con acceso completo (super admins)
  const superAdminEmails = ['mercadeo@blackdogpanama.com'];
  
  // Lista de cargos que solo tienen acceso al portal (no al reloj de marcaciones)
  const portalOnlyPositions = [
    'Piso de venta',
    'Veterinario',
    'Peluquero',
    'Asistente de veterinario',
    'Asistente de peluquería',
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
        const hasPortalAccessOnly = 
          isPortalOnlyPosition || 
          (employee.has_portal_access === true && !employee.position?.admin);

        const currentRoute = route.routeConfig?.path || '';
        const isTimeclockRoute = currentRoute === 'timeclock' || state.url.includes('/timeclock');
        const isPortalRoute = currentRoute === 'my-portal' || state.url.includes('/my-portal') || state.url.includes('/employee-portal');
        const isHomeRoute = currentRoute === 'home' || state.url.includes('/home') || state.url === '/' || state.url === '';

        if (hasPortalAccessOnly && isTimeclockRoute) {
          return of(router.createUrlTree(['/employee-portal']));
        }

        if (hasPortalAccessOnly && !isPortalRoute && (isHomeRoute || !isTimeclockRoute)) {
          return of(router.createUrlTree(['/employee-portal']));
        }

        if (isPortalRoute) {
          return of(true);
        }

        return of(!hasPortalAccessOnly);
      }

      // Si no hay cache, hacer llamada HTTP
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
        map((employees) => {
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
          const hasPortalAccessOnly = 
            isPortalOnlyPosition || 
            (employee.has_portal_access === true && !employee.position?.admin);

          // Rutas que todos pueden acceder
          const currentRoute = route.routeConfig?.path || '';
          const isTimeclockRoute = currentRoute === 'timeclock' || state.url.includes('/timeclock');
          const isPortalRoute = currentRoute === 'my-portal' || state.url.includes('/my-portal') || state.url.includes('/employee-portal');
          const isHomeRoute = currentRoute === 'home' || state.url.includes('/home') || state.url === '/' || state.url === '';

          // Si tiene acceso solo al portal y está intentando acceder al reloj de marcaciones, redirigir
          if (hasPortalAccessOnly && isTimeclockRoute) {
            return router.createUrlTree(['/employee-portal']);
          }

          // Si tiene acceso solo al portal y está intentando acceder a home u otras rutas, redirigir al portal
          if (hasPortalAccessOnly && !isPortalRoute && (isHomeRoute || !isTimeclockRoute)) {
            return router.createUrlTree(['/employee-portal']);
          }

          // Permitir acceso al portal siempre
          if (isPortalRoute) {
            return true;
          }

          // Para otras rutas, permitir acceso si no tiene restricción de portal
          return !hasPortalAccessOnly;
        }),
        catchError(() => {
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
            const hasPortalAccessOnly = 
              isPortalOnlyPosition || 
              (employee.has_portal_access === true && !employee.position?.admin);
            
            return of(!hasPortalAccessOnly);
          }
          // Si no hay cache y hay error, denegar acceso por seguridad
          return of(false);
        })
      );
    })
  );
};

