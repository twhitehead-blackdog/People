import { Routes } from '@angular/router';
import { permissionGuard } from '../../guards/permission.guard';

export const PERFORMANCE_360_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./performance-dashboard.component').then(
        (m) => m.PerformanceDashboardComponent
      ),
  },
  {
    path: 'new',
    canActivate: [permissionGuard(['admin', 'schedule_admin'])],
    loadComponent: () =>
      import('./performance-selection.component').then(
        (m) => m.PerformanceSelectionComponent
      ),
  },
  {
    path: 'evaluate/:evaluationId',
    canActivate: [permissionGuard(['admin', 'schedule_admin'])],
    loadComponent: () =>
      import('./performance-evaluation-form.component').then(
        (m) => m.PerformanceEvaluationFormComponent
      ),
  },
  {
    path: 'report/:evaluationId',
    canActivate: [permissionGuard('dashboard_access')],
    loadComponent: () =>
      import('./performance-report.component').then(
        (m) => m.PerformanceReportComponent
      ),
  },
];
