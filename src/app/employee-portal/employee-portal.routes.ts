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
    ],
  },
];

