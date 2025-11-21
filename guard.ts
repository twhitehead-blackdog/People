import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, from, map, of, switchMap, take } from 'rxjs';

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
  // Permitir caracteres válidos según RFC 5321 (incluyendo comas en quoted local parts)
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

export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  return from(auth.isAuthenticated$).pipe(
    take(1),
    switchMap((isLogged) => {
      if (!isLogged) {
        return of(router.createUrlTree(['/login']));
      }

      return auth.user$.pipe(
        take(1),
        switchMap((user) => {
          if (!user?.email) {
            return of(router.createUrlTree(['/login']));
          }

          const supabaseUrl = process.env['ENV_SUPABASE_URL'];
          if (!supabaseUrl) {
            // Fail securely: deny access if Supabase URL is not configured
            // This prevents unauthorized access when environment variables are misconfigured
            console.error(
              '⚠️ Security: ENV_SUPABASE_URL is not configured. Access denied.'
            );
            return of(router.createUrlTree(['/login']));
          }

          try {
            // Escapar y citar el email correctamente para PostgREST
            const escapedEmail = escapeEmailForPostgREST(user.email);

            // Construir el filtro OR de manera segura con email correctamente citado
            const params = new HttpParams()
              .set('select', 'id')
              .set(
                'or',
                `(work_email.eq.${escapedEmail},email.eq.${escapedEmail})`
              );

            return http
              .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/employees`, {
                params,
              })
              .pipe(
                map((records) =>
                  records.length > 0
                    ? true
                    : router.createUrlTree(['/sin-acceso'])
                ),
                catchError(() => of(router.createUrlTree(['/sin-acceso'])))
              );
          } catch (error) {
            // Si el email es inválido, denegar acceso por seguridad
            console.error('⚠️ Security: Invalid email format detected:', error);
            return of(router.createUrlTree(['/login']));
          }
        })
      );
    })
  );
};
