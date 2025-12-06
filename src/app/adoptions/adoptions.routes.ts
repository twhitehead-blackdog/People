import { Routes } from '@angular/router';

export const ADOPTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./adoptions-layout.component').then(
        (x) => x.AdoptionsLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./adoptions-home.component').then((x) => x.AdoptionsHomeComponent),
      },
      {
        path: 'adoptar/:id',
        loadComponent: () =>
          import('./adoption-form.component').then(
            (x) => x.AdoptionFormComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../auth/profile.component').then((x) => x.ProfileComponent),
      },
    ],
  },
];

