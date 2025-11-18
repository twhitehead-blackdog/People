import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { from, map, take } from 'rxjs';

export const authGuardFn: CanActivateFn = (next: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return from(auth.isAuthenticated$).pipe(
    take(1),
    map((isLogged) => (isLogged ? isLogged : router.createUrlTree(['/login'])))
  );
};
