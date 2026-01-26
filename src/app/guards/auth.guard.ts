import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, filter, map, of, switchMap, take, timeout } from 'rxjs';

/**
 * Guard de autenticación para Auth0
 * Espera a que Auth0 termine de cargar antes de verificar autenticación
 * para evitar race conditions en navegaciones internas.
 */
export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  console.log('[AuthGuard] ========================================');
  console.log('[AuthGuard] Guard activated for route:', _route.url.toString());
  console.log(
    '[AuthGuard] Full path:',
    _route.pathFromRoot.map((r) => r.url.toString()).join('/')
  );

  // Esperar a que Auth0 esté completamente cargado antes de verificar
  // isLoading$ indica si Auth0 todavía está verificando el estado de autenticación
  return auth.isLoading$.pipe(
    filter((isLoading) => !isLoading), // Esperar hasta que Auth0 termine de cargar
    take(1),
    switchMap(() => auth.isAuthenticated$),
    take(1),
    switchMap((isLogged) => {
      console.log('[AuthGuard] Auth0 isAuthenticated:', isLogged);

      if (!isLogged) {
        console.log('[AuthGuard] Not authenticated, redirecting to /login');
        return of(router.createUrlTree(['/login']));
      }

      console.log('[AuthGuard] User is authenticated, checking employee...');

      return auth.user$.pipe(
        take(1),
        switchMap((user) => {
          console.log('[AuthGuard] User email:', user?.email);

          if (!user?.email) {
            console.log('[AuthGuard] No email found, redirecting to /login');
            return of(router.createUrlTree(['/login']));
          }

          const supabaseUrl = process.env['ENV_SUPABASE_URL'];
          if (!supabaseUrl) {
            console.log('[AuthGuard] No Supabase URL, allowing access');
            return of(true);
          }

          const email = user.email.toLowerCase();
          console.log('[AuthGuard] Checking employee in database for:', email);

          // Buscar en employees (tabla unificada que incluye todos los empleados con company_id)
          // Primero intentar buscar por work_email (más común)
          const params = new HttpParams()
            .set('select', 'id')
            .set('work_email', `eq.${email}`)
            .set('limit', '1');

          return http
            .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/employees`, {
              params,
            })
            .pipe(
              timeout(10000), // Timeout de 10 segundos
              switchMap((records) => {
                // Si se encontró por work_email, permitir acceso
                if (records.length > 0) {
                  console.log(
                    '[AuthGuard] Employee found by work_email, allowing access'
                  );
                  return of(true);
                }

                console.log(
                  '[AuthGuard] Not found by work_email, trying email field...'
                );

                // Si no se encontró, intentar buscar por email (campo alternativo)
                const emailParams = new HttpParams()
                  .set('select', 'id')
                  .set('email', `eq.${email}`)
                  .set('limit', '1');

                return http
                  .get<Array<{ id: string }>>(
                    `${supabaseUrl}/rest/v1/employees`,
                    {
                      params: emailParams,
                    }
                  )
                  .pipe(
                    timeout(10000),
                    map((emailRecords) => {
                      if (emailRecords.length > 0) {
                        console.log(
                          '[AuthGuard] Employee found by email field, allowing access'
                        );
                        return true;
                      }
                      console.log(
                        '[AuthGuard] Employee not found, redirecting to /sin-acceso'
                      );
                      return router.createUrlTree(['/sin-acceso']);
                    }),
                    catchError((err) => {
                      console.error(
                        '[AuthGuard] Error searching by email:',
                        err
                      );
                      return of(router.createUrlTree(['/sin-acceso']));
                    })
                  );
              }),
              catchError((error) => {
                console.error('[AuthGuard] Error searching employee:', error);
                return of(router.createUrlTree(['/sin-acceso']));
              })
            );
        })
      );
    }),
    catchError((error) => {
      console.error('[AuthGuard] Top level error:', error);
      return of(router.createUrlTree(['/login']));
    })
  );
};
