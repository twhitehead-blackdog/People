import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, take, of } from 'rxjs';

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
          if (!employee) {
            return true; // Permitir acceso si no se encuentra el empleado
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
        })
      );
    })
  );
};

