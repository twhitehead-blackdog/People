import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, filter, map, of, switchMap, take, timeout } from 'rxjs';
import { getEnv } from '../utils/env.utils';

/**
 * Guard de autenticación para Auth0
 * Espera a que Auth0 termine de cargar antes de verificar autenticación
 * para evitar race conditions en navegaciones internas.
 */
export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const isDev = isDevMode();

  // Esperar a que Auth0 esté completamente cargado antes de verificar
  // isLoading$ indica si Auth0 todavía está verificando el estado de autenticación
  return auth.isLoading$.pipe(
    filter((isLoading) => !isLoading), // Esperar hasta que Auth0 termine de cargar
    take(1),
    switchMap(() => auth.isAuthenticated$),
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

          const supabaseUrl = getEnv('ENV_SUPABASE_URL');
          if (!supabaseUrl) {
            return of(true);
          }

          const email = user.email.toLowerCase();

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
              timeout(10000),
              switchMap((records) => {
                if (records.length > 0) {
                  return of(true);
                }

                // Si no se encontró por work_email, intentar por email
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
                        return true;
                      }
                      return router.createUrlTree(['/sin-acceso']);
                    }),
                    catchError(() => {
                      return of(router.createUrlTree(['/sin-acceso']));
                    })
                  );
              }),
              catchError((error) => {
                if (isDev) {
                  console.error('[AuthGuard] Error searching employee:', error);
                }
                return of(router.createUrlTree(['/sin-acceso']));
              })
            );
        })
      );
    }),
    catchError((error) => {
      if (isDev) {
        console.error('[AuthGuard] Top level error:', error);
      }
      return of(router.createUrlTree(['/login']));
    })
  );
};
