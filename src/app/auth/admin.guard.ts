import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthWrapperService } from './auth-wrapper.service';
import { from, of } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';

/**
 * Guard que protege rutas solo para administradores
 * Verifica que el usuario esté autenticado Y sea admin
 */
export const adminGuardFn: CanActivateFn = () => {
  const auth = inject(AuthWrapperService);
  const router = inject(Router);

  return from(auth.isAuthenticated$).pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        return of(router.createUrlTree(['/auth/login']));
      }

      // Verificar si es admin
      return auth.isAdmin$().pipe(
        take(1),
        map((isAdmin) => {
          if (!isAdmin) {
            return router.createUrlTree(['/adoptions']);
          }
          return true;
        })
      );
    })
  );
};

