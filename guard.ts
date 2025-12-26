import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, from, map, of, switchMap, take } from 'rxjs';

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
          const params = new HttpParams()
            .set('select', 'id')
            .set('or', `(work_email.eq.${email},email.eq.${email})`);

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
        })
      );
    })
  );
};
