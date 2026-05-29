import { Routes } from '@angular/router';
import { employeePortalGuard } from '../guards/employee-portal.guard';

export const EMPLOYEE_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./employee-portal-layout.component').then(
        (x) => x.EmployeePortalLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./employee-portal.component').then(
            (x) => x.EmployeePortalComponent
          ),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('../dashboard/modules/branch-manager/ui/branch-manager-it-tickets-tab.component').then(
            (x) => x.BranchManagerItTicketsTabComponent
          ),
      },
      {
        path: 'suggestions',
        loadComponent: () =>
          import('../dashboard/modules/branch-manager/ui/branch-manager-suggestions-tab.component').then(
            (x) => x.BranchManagerSuggestionsTabComponent
          ),
      },
    ],
  },
];

