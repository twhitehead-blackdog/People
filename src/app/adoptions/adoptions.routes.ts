import { Routes } from '@angular/router';
import { adminGuardFn } from '../auth/admin.guard';
import { authGuardFn } from '../auth/auth.guard';

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
          import('./adoptions-home.component').then(
            (x) => x.AdoptionsHomeComponent
          ),
      },
      {
        path: 'adoptar/:id',
        canActivate: [authGuardFn],
        loadComponent: () =>
          import('./adoption-form.component').then(
            (x) => x.AdoptionFormComponent
          ),
      },
      {
        path: 'profile',
        canActivate: [authGuardFn],
        loadComponent: () =>
          import('../auth/profile.component').then((x) => x.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuardFn],
        loadComponent: () =>
          import('./admin-panel.component').then((x) => x.AdminPanelComponent),
      },
    ],
  },
];
