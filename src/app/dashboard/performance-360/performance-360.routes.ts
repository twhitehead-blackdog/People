import { Routes } from '@angular/router';
import { modulePermissionGuard } from '../../guards/permission.guard';

export const PERFORMANCE_360_ROUTES: Routes = [
  {
    path: '',
    canActivate: [modulePermissionGuard('performance', 'perf_dashboard')],
    loadComponent: () =>
      import('./performance-dashboard.component').then(
        (m) => m.PerformanceDashboardComponent
      ),
  },
  {
    path: 'new',
    canActivate: [modulePermissionGuard('performance', 'perf_templates')],
    loadComponent: () =>
      import('./performance-selection.component').then(
        (m) => m.PerformanceSelectionComponent
      ),
  },
  {
    path: 'evaluate/:evaluationId',
    canActivate: [modulePermissionGuard('performance', 'perf_cycles')],
    loadComponent: () =>
      import('./performance-evaluation-form.component').then(
        (m) => m.PerformanceEvaluationFormComponent
      ),
  },
  {
    path: 'report/:evaluationId',
    canActivate: [modulePermissionGuard('performance', 'perf_reports')],
    loadComponent: () =>
      import('./performance-report.component').then(
        (m) => m.PerformanceReportComponent
      ),
  },
];
