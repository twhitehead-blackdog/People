import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, from, map, of, switchMap, take } from 'rxjs';
import { AuthBypassService } from './src/app/services/auth-bypass.service';

export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const bypassService = inject(AuthBypassService);

  // Verificar si el bypass está activo
  if (bypassService.isBypassActive()) {
    const user = bypassService.getCurrentUser();
    if (user?.email) {
      // Permitir acceso directo con bypass
      return of(true);
    }
  }

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
          
          // Buscar en ambas tablas: employees (Black Dog) y naz_employees (Naz)
          // Primero intentar en employees
          const params = new HttpParams()
            .set('select', 'id')
            .set('or', `(work_email.eq.${email},email.eq.${email})`);

          return http
            .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/employees`, {
              params,
            })
            .pipe(
              switchMap((records) => {
                // Si se encuentra en employees, permitir acceso
                if (records.length > 0) {
                  return of(true);
                }
                
                // Si no se encuentra, buscar en naz_employees
                const nazParams = new HttpParams()
                  .set('select', 'id')
                  .set('or', `(work_email.eq.${email},email.eq.${email})`);
                
                return http
                  .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/naz_employees`, {
                    params: nazParams,
                  })
                  .pipe(
                    map((nazRecords) =>
                      nazRecords.length > 0
                        ? true
                        : router.createUrlTree(['/sin-acceso'])
                    ),
                    catchError(() => of(router.createUrlTree(['/sin-acceso'])))
                  );
              }),
              catchError(() => {
                // Si falla la consulta a employees, intentar directamente en naz_employees
                const nazParams = new HttpParams()
                  .set('select', 'id')
                  .set('or', `(work_email.eq.${email},email.eq.${email})`);
                
                return http
                  .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/naz_employees`, {
                    params: nazParams,
                  })
                  .pipe(
                    map((nazRecords) =>
                      nazRecords.length > 0
                        ? true
                        : router.createUrlTree(['/sin-acceso'])
                    ),
                    catchError(() => of(router.createUrlTree(['/sin-acceso'])))
                  );
              })
            );
        })
      );
    })
  );
};
