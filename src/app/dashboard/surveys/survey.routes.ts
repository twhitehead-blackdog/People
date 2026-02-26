import { Routes } from '@angular/router';
import { modulePermissionGuard } from '../../guards/permission.guard';

export const SURVEY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [modulePermissionGuard('hr', 'hr_surveys')],
    loadComponent: () =>
      import('./survey-list.component').then(
        (m) => m.SurveyListComponent
      ),
  },
  {
    path: 'new',
    canActivate: [modulePermissionGuard('hr', 'hr_surveys')],
    loadComponent: () =>
      import('./survey-builder.component').then(
        (m) => m.SurveyBuilderComponent
      ),
  },
  {
    path: 'edit/:surveyId',
    canActivate: [modulePermissionGuard('hr', 'hr_surveys')],
    loadComponent: () =>
      import('./survey-builder.component').then(
        (m) => m.SurveyBuilderComponent
      ),
  },
  {
    path: 'results/:surveyId',
    canActivate: [modulePermissionGuard('hr', 'hr_surveys')],
    loadComponent: () =>
      import('./survey-results.component').then(
        (m) => m.SurveyResultsComponent
      ),
  },
];
