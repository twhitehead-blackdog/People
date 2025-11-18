import { Route } from '@angular/router';
import { authGuardFn } from '../../guard';

export const appRoutes: Route[] = [
  {
    path: 'qr',
    loadComponent: () =>
      import('./qr-generator.component').then((x) => x.QrGeneratorComponent),
  },
  {
    path: 'employee-portal',
    canActivateChild: [authGuardFn],
    loadChildren: () =>
      import('./employee-portal/employee-portal.routes').then(
        (x) => x.EMPLOYEE_PORTAL_ROUTES
      ),
  },
  {
    path: '',
    canActivateChild: [authGuardFn],
    loadChildren: () =>
      import('./dashboard/dashboard.routes').then((x) => x.DASHBOARD_ROUTES),
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
