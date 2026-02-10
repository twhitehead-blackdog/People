import { Routes } from '@angular/router';
import { employeePortalGuard } from '../guards/employee-portal.guard';
import { permissionGuard } from '../guards/permission.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard.component').then((x) => x.DashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./home.component').then((x) => x.HomeComponent),
        canActivate: [employeePortalGuard],
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./admin.component').then((x) => x.AdminComponent),
        canActivate: [employeePortalGuard],
        children: [
          {
            path: 'employees',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./employee-list.component').then(
                    (x) => x.EmployeeListComponent
                  ),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./employee-form.component').then(
                    (x) => x.EmployeeFormComponent
                  ),
              },
              {
                path: ':employee_id',
                loadComponent: () =>
                  import('./employee-detail.component').then(
                    (x) => x.EmployeeDetailComponent
                  ),
              },

              {
                path: ':employee_id/edit',
                loadComponent: () =>
                  import('./employee-form.component').then(
                    (x) => x.EmployeeFormComponent
                  ),
              },
            ],
          },
          {
            path: 'organigrama',
            loadComponent: () =>
              import('./organigrama.component').then(
                (x) => x.OrganigramaComponent
              ),
          },
          {
            path: 'companies',
            loadComponent: () =>
              import('./companies.component').then((x) => x.CompaniesComponent),
          },
          {
            path: 'departments',
            loadComponent: () =>
              import('./departments.component').then(
                (x) => x.DepartmentsComponent
              ),
          },
          {
            path: 'positions',
            loadComponent: () =>
              import('./positions.component').then((x) => x.PositionsComponent),
          },
          {
            path: 'branches',
            loadComponent: () =>
              import('./branches.component').then((x) => x.BranchesComponent),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./settings.component').then((x) => x.SettingsComponent),
          },
          {
            path: 'user-management',
            loadComponent: () =>
              import('./user-management.component').then(
                (x) => x.UserManagementComponent
              ),
          },
          {
            path: 'permissions',
            loadComponent: () =>
              import('./pt-permissions/permissions-management.component').then(
                (x) => x.PermissionsManagementComponent
              ),
            canActivate: [permissionGuard('admin')],
          },
          {
            path: 'complaints-inbox',
            loadComponent: () =>
              import('./complaints-inbox.component').then(
                (x) => x.ComplaintsInboxComponent
              ),
          },
          {
            path: 'job-applications',
            loadComponent: () =>
              import('./job-applications-list.component').then(
                (x) => x.JobApplicationsListComponent
              ),
          },
          {
            path: 'device-inventory',
            loadComponent: () =>
              import('./device-inventory.component').then(
                (x) => x.DeviceInventoryComponent
              ),
          },
          {
            path: 'hr',
            children: [
              {
                path: 'time-dashboard',
                loadComponent: () =>
                  import('./hr-time-dashboard.component').then(
                    (x) => x.HRTimeDashboardComponent
                  ),
              },
              {
                path: 'disabilities',
                loadComponent: () =>
                  import('./hr-disabilities.component').then(
                    (x) => x.HRDisabilitiesComponent
                  ),
              },
              { path: '', redirectTo: 'time-dashboard', pathMatch: 'full' },
            ],
          },
          {
            path: 'audit-tasks',
            loadComponent: () =>
              import('./audit-tasks.component').then(
                (x) => x.AuditTasksComponent
              ),
          },
          {
            path: 'performance',
            loadChildren: () =>
              import('./performance-360/performance-360.routes').then(
                (m) => m.PERFORMANCE_360_ROUTES
              ),
          },
          { path: '', redirectTo: 'employees', pathMatch: 'full' },
        ],
      },
      {
        path: 'time-management',
        loadComponent: () =>
          import('./time-management.component').then(
            (x) => x.TimeManagementComponent
          ),
        canActivate: [employeePortalGuard],
        children: [
          {
            path: 'timelogs',
            loadComponent: () =>
              import('./timelogs.component').then((x) => x.TimelogsComponent),
          },
          {
            path: 'timetables',
            loadComponent: () =>
              import('./employees-timetable.component').then(
                (x) => x.EmployeesTimetableComponent
              ),
          },

          {
            path: 'schedules',
            loadComponent: () =>
              import('./schedules.component').then((x) => x.SchedulesComponent),
          },
          {
            path: 'vet-schedule',
            loadComponent: () =>
              import('./vet-schedule.component').then(
                (x) => x.VetScheduleComponent
              ),
          },
          {
            path: 'salon-schedule',
            loadComponent: () =>
              import('./salon-schedule.component').then(
                (x) => x.SalonScheduleComponent
              ),
          },
          {
            path: 'shifts',
            loadComponent: () =>
              import('./shifts.component').then((x) => x.ShiftsComponent),
          },
          { path: '', redirectTo: 'timetables', pathMatch: 'full' },
        ],
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./payroll.component').then((x) => x.PayrollComponent),
        canActivate: [employeePortalGuard],
        children: [
          {
            path: 'payrolls',
            loadComponent: () =>
              import('./payrolls.component').then((x) => x.PayrollsComponent),
          },
          {
            path: 'payrolls/:payroll_id',
            loadComponent: () =>
              import('./payrolls-details.component').then(
                (x) => x.PayrollsDetailsComponent
              ),
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id',
            loadComponent: () =>
              import('./payroll-payments-details.component').then(
                (x) => x.PayrollPaymentsDetailsComponent
              ),
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id/draft',
            loadComponent: () =>
              import('./payroll-summary.component').then(
                (x) => x.PayrollSummaryComponent
              ),
          },
          {
            path: 'creditors',
            loadComponent: () =>
              import('./creditors.component').then((x) => x.CreditorsComponent),
          },
          {
            path: 'banks',
            loadComponent: () =>
              import('./banks.component').then((x) => x.BanksComponent),
          },
          { path: '', redirectTo: 'payrolls', pathMatch: 'full' },
        ],
      },
      {
        path: 'timeclock',
        loadComponent: () =>
          import('../timeclock.component').then((x) => x.TimeclockComponent),
        canActivate: [
          () =>
            import('../guards/timeclock.guard').then((m) => m.timeclockGuard),
        ],
      },
      {
        path: 'my-portal',
        loadComponent: () =>
          import('./employee-portal.component').then(
            (x) => x.EmployeePortalComponent
          ),
      },
      {
        path: 'branch-manager',
        loadComponent: () =>
          import('./branch-manager.component').then(
            (x) => x.BranchManagerComponent
          ),
        canActivate: [employeePortalGuard],
      },
    ],
  },
];
