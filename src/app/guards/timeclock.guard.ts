import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, of, switchMap, take } from 'rxjs';

/**
 * Guard que protege el reloj de marcaciones
 * Solo permite acceso a empleados autenticados y aprobados
 */
export const timeclockGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  // Lista de correos con acceso completo (super admins)
  const superAdminEmails = [
    'mercadeo@blackdogpanama.com',
    'soporte2@blackdogpanama.com',
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
        // No autenticado, redirigir a login
        router.navigate(['/login']);
        return of(false);
      }

      return http
        .get<
          Array<{
            id: string;
            position?: { name: string; admin: boolean };
            has_portal_access?: boolean;
            account_approved?: boolean;
          }>
        >(`${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`, {
          params: {
            work_email: `eq.${user.email}`,
            select:
              'id,position:positions(name,admin),has_portal_access,account_approved',
          },
        })
        .pipe(
          map((employees) => {
            const employee = employees[0];

            // Si no se encuentra el empleado, denegar acceso
            if (!employee) {
              router.navigate(['/login']);
              return false;
            }

            // Verificar si la cuenta está aprobada
            // Si account_approved es null o undefined, se considera no aprobado
            if (
              employee.account_approved === false ||
              employee.account_approved === null ||
              employee.account_approved === undefined
            ) {
              // Redirigir al portal con mensaje de espera de aprobación
              router.navigate(['/employee-portal'], {
                queryParams: { pending_approval: 'true' },
              });
              return false;
            }

            // Lista de cargos que solo tienen acceso al portal (no al reloj de marcaciones)
            const portalOnlyPositions = [
              'Piso de venta',
              'Veterinario',
              'Peluquero',
              'Asistente de veterinario',
              'Asistente de peluquería',
            ];

            // Lista de cargos que tienen acceso especial a gestión de tiempo y reloj de marcaciones
            const timeManagementAccessPositions = ['gerente de tienda'];

            const positionName = employee.position?.name || '';
            const isPortalOnlyPosition = portalOnlyPositions.some((pos) =>
              positionName.toLowerCase().includes(pos.toLowerCase())
            );
            const hasTimeManagementAccess = timeManagementAccessPositions.some(
              (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
            );

            // Si tiene acceso especial a gestión de tiempo, permitir acceso al timeclock
            if (hasTimeManagementAccess) {
              return employee.account_approved === true;
            }

            // Si tiene un cargo que solo permite acceso al portal, denegar acceso al timeclock
            if (isPortalOnlyPosition) {
              router.navigate(['/employee-portal']);
              return false;
            }

            // Permitir acceso si la cuenta está aprobada y no tiene restricciones
            return employee.account_approved === true;
          })
        );
    })
  );
};
