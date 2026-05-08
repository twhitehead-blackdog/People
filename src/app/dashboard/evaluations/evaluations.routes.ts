import { Routes } from '@angular/router';

export const EVALUATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./evaluations-list.component').then((m) => m.EvaluationsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./evaluation-form.component').then((m) => m.EvaluationFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./evaluation-form.component').then((m) => m.EvaluationFormComponent),
  },
];
