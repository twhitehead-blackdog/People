import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, switchMap, take, of } from 'rxjs';

/**
 * Escapa y cita correctamente un email para uso en filtros PostgREST.
 * PostgREST requiere que los valores string estén entre comillas dobles.
 * Cualquier comilla doble dentro del email debe ser escapada.
 * 
 * @param email - El email a escapar y citar
 * @returns El email correctamente escapado y citado para PostgREST
 */
function escapeEmailForPostgREST(email: string): string {
  // Validar formato básico de email para prevenir caracteres peligrosos
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email: email must be a non-empty string');
  }

  // Normalizar a lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validar formato básico de email (debe contener @)
  if (!normalizedEmail.includes('@')) {
    throw new Error('Invalid email format: must contain @');
  }

  // Escapar comillas dobles dentro del email (reemplazar " con \"")
  const escapedEmail = normalizedEmail.replace(/"/g, '""');
  
  // Citar el email con comillas dobles para PostgREST
  return `"${escapedEmail}"`;
}

/**
 * Guard que protege el reloj de marcaciones
 * Solo permite acceso a empleados autenticados y aprobados
 */
export const timeclockGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  // Lista de correos con acceso completo (super admins)
  const superAdminEmails = ['mercadeo@blackdogpanama.com'];

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

      let params: HttpParams;
      try {
        // Escapar y citar el email correctamente para PostgREST
        const escapedEmail = escapeEmailForPostgREST(user.email);
        params = new HttpParams()
          .set('work_email', `eq.${escapedEmail}`)
          .set('select', 'id,position:positions(name,admin),has_portal_access,account_approved');
      } catch (error) {
        // Si el email es inválido, denegar acceso por seguridad
        console.error('⚠️ Security: Invalid email format detected:', error);
        router.navigate(['/login']);
        return of(false);
      }

      return http.get<Array<{
        id: string;
        position?: { name: string; admin: boolean };
        has_portal_access?: boolean;
        account_approved?: boolean;
      }>>(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
        { params }
      ).pipe(
        map((employees) => {
          const employee = employees[0];
          
          // Si no se encuentra el empleado, denegar acceso
          if (!employee) {
            router.navigate(['/login']);
            return false;
          }

          // Verificar si la cuenta está aprobada
          // Si account_approved es null o undefined, se considera no aprobado
          if (employee.account_approved === false || employee.account_approved === null || employee.account_approved === undefined) {
            // Redirigir al portal con mensaje de espera de aprobación
            router.navigate(['/employee-portal'], {
              queryParams: { pending_approval: 'true' }
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
          const timeManagementAccessPositions = [
            'gerente de tienda',
          ];

          const positionName = employee.position?.name || '';
          const isPortalOnlyPosition = portalOnlyPositions.some(
            (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
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

