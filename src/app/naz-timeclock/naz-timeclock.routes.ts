import { Routes } from '@angular/router';

export const nazTimeclockRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./naz-timeclock.component').then((m) => m.NazTimeclockComponent),
  },
];

