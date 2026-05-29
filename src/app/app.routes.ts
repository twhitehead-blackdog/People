import { Route } from '@angular/router';
import { authGuardFn } from './guards/auth.guard';
import { timeclockKioskGuard } from './guards/timeclock-kiosk.guard';

export const appRoutes: Route[] = [
  {
    path: 'qr',
    loadComponent: () =>
      import('./qr-generator.component').then((x) => x.QrGeneratorComponent),
  },
  {
    path: 'card/:employee_id',
    loadComponent: () =>
      import('./business-card/business-card.component').then(
        (x) => x.BusinessCardComponent
      ),
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
    path: 'out-of-hours',
    loadComponent: () =>
      import('./out-of-hours.component').then((x) => x.OutOfHoursComponent),
  },
  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('./no-access.component').then((x) => x.NoAccessComponent),
  },
  {
    path: 'timeclock-kiosk',
    loadComponent: () =>
      import('./timeclock.component').then((x) => x.TimeclockComponent),
    canActivate: [timeclockKioskGuard],
  },
  {
    path: 'timeclock-kiosk-mobile',
    loadComponent: () =>
      import('./timeclock.component').then((x) => x.TimeclockComponent),
    canActivate: [timeclockKioskGuard],
  },
  {
    path: 'naz-timeclock',
    loadChildren: () =>
      import('./naz-timeclock/naz-timeclock.routes').then(
        (x) => x.nazTimeclockRoutes
      ),
  },
  // dp-timeclock (huellas DigitalPersona) desactivado por orden del usuario (2026-05-28).
  // Redirige al timeclock estándar. Para reactivar, restaurar el loadComponent original.
  {
    path: 'dp-timeclock',
    redirectTo: 'timeclock',
    pathMatch: 'full',
  },
  {
    path: 'job-fair',
    loadComponent: () =>
      import('./job-fair/job-fair-form.component').then(
        (x) => x.JobFairFormComponent
      ),
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' },
];
