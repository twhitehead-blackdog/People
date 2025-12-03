import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, filter, from, map, of, switchMap, take, timeout } from 'rxjs';

export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  // Esperar a que Auth0 termine de verificar la sesión (puede tomar tiempo al recargar)
  return auth.isAuthenticated$.pipe(
    filter(isAuth => isAuth !== undefined), // Esperar hasta que tenga un valor definido
    take(1),
    timeout(5000), // Timeout de 5 segundos máximo
    switchMap((isLogged) => {
      if (!isLogged) {
        // Guardar la ruta actual para volver después del login
        const currentUrl = router.url;
        if (currentUrl && currentUrl !== '/login' && currentUrl !== '/') {
          localStorage.setItem('returnUrl', currentUrl);
        }
        return of(router.createUrlTree(['/login']));
      }

      return auth.user$.pipe(
        filter(user => user !== undefined), // Esperar hasta que el usuario esté cargado
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
    }),
    catchError(() => {
      // Si hay timeout o error, redirigir a login
      return of(router.createUrlTree(['/login']));
    })
  );
};
