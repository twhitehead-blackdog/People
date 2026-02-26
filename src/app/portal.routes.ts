import { Route } from '@angular/router';
import { authGuardFn } from './guards/auth.guard';

export const portalRoutes: Route[] = [
  {
    path: '',
    canActivateChild: [authGuardFn],
    loadChildren: () =>
      import('./employee-portal/employee-portal.routes').then(
        (x) => x.EMPLOYEE_PORTAL_ROUTES
      ),
  },
  {
    path: 'employee-portal',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((x) => x.LoginComponent),
  },
  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('./no-access.component').then((x) => x.NoAccessComponent),
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' },
];
