import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, from, map, of, switchMap, take, timeout } from 'rxjs';

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
              timeout(10000), // Timeout de 10 segundos
              switchMap((records) => {
                // Si se encontró por work_email, permitir acceso
                if (records.length > 0) {
                  return of(true);
                }
                
                // Si no se encontró, intentar buscar por email (campo alternativo)
                const emailParams = new HttpParams()
                  .set('select', 'id')
                  .set('email', `eq.${email}`)
                  .set('limit', '1');
                
                return http
                  .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/employees`, {
                    params: emailParams,
                  })
                  .pipe(
                    timeout(10000),
                    map((emailRecords) =>
                      emailRecords.length > 0
                        ? true
                        : router.createUrlTree(['/sin-acceso'])
                    ),
                    catchError(() => of(router.createUrlTree(['/sin-acceso'])))
                  );
              }),
              catchError((error) => {
                console.error('Error en authGuard:', error);
                return of(router.createUrlTree(['/sin-acceso']));
              })
            );
        })
      );
    }),
    catchError((error) => {
      console.error('Error en authGuard (nivel superior):', error);
      return of(router.createUrlTree(['/login']));
    })
  );
};
