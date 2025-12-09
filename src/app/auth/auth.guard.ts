import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { from, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

/**
 * Guard que protege rutas que requieren autenticación
 * Solo verifica que el usuario esté autenticado con Auth0
 */
export const authGuardFn: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.isAuthenticated$).pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        return of(router.createUrlTree(['/auth/login']));
      }
      return of(true);
    })
  );
};

