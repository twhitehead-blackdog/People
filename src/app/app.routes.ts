import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'adoptions',
    pathMatch: 'full',
  },
  {
    path: 'adoptions',
    loadChildren: () =>
      import('./adoptions/adoptions.routes').then((x) => x.ADOPTIONS_ROUTES),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login.component').then((x) => x.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./auth/register.component').then((x) => x.RegisterComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'adoptions', pathMatch: 'full' },
];
