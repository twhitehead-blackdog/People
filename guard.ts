import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, from, map, of, switchMap, take } from 'rxjs';

export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Verificar si estamos en un origen seguro
  const isSecureOrigin =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // Si no estamos en origen seguro (acceso desde IP local), redirigir a login sin Auth0
  if (!isSecureOrigin) {
    console.warn(
      'Acceso desde IP local sin HTTPS - Auth0 no disponible, redirigiendo a login'
    );
    return of(router.createUrlTree(['/login']));
  }

  // Comportamiento normal con Auth0
  try {
    const auth = inject(AuthService);
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
      catchError((error) => {
        // Si Auth0 falla, redirigir a login
        console.warn('Error en Auth0 guard:', error);
        return of(router.createUrlTree(['/login']));
      })
    );
  } catch (error) {
    // Si Auth0 no está disponible, redirigir a login
    console.warn('Auth0 no disponible, redirigiendo a login');
    return of(router.createUrlTree(['/login']));
  }
};
