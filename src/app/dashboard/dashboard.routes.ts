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
        canActivate: [permissionGuard('dashboard.access')],
        data: { permissionKey: 'dashboard.access' },
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
                canActivate: [permissionGuard('employees.read')],
                data: { permissionKey: 'employees.read' },
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./employee-form.component').then(
                    (x) => x.EmployeeFormComponent
                  ),
                canActivate: [permissionGuard('employees.write')],
                data: { permissionKey: 'employees.write' },
              },
              {
                path: ':employee_id',
                loadComponent: () =>
                  import('./employee-detail.component').then(
                    (x) => x.EmployeeDetailComponent
                  ),
                canActivate: [permissionGuard('employees.read')],
                data: { permissionKey: 'employees.read' },
              },

              {
                path: ':employee_id/edit',
                loadComponent: () =>
                  import('./employee-form.component').then(
                    (x) => x.EmployeeFormComponent
                  ),
                canActivate: [permissionGuard('employees.write')],
                data: { permissionKey: 'employees.write' },
              },
            ],
          },
          {
            path: 'organigrama',
            loadComponent: () =>
              import('./organigrama.component').then(
                (x) => x.OrganigramaComponent
              ),
            data: { permissionKey: 'structure.read' },
            canActivate: [permissionGuard('structure.read')],
          },
          {
            path: 'companies',
            loadComponent: () =>
              import('./companies.component').then((x) => x.CompaniesComponent),
            canActivate: [permissionGuard('structure.read')],
            data: { permissionKey: 'structure.read' },
          },
          {
            path: 'departments',
            loadComponent: () =>
              import('./departments.component').then(
                (x) => x.DepartmentsComponent
              ),
            canActivate: [permissionGuard('structure.read')],
            data: { permissionKey: 'structure.read' },
          },
          {
            path: 'positions',
            loadComponent: () =>
              import('./positions.component').then((x) => x.PositionsComponent),
            canActivate: [permissionGuard('structure.read')],
            data: { permissionKey: 'structure.read' },
          },
          {
            path: 'branches',
            loadComponent: () =>
              import('./branches.component').then((x) => x.BranchesComponent),
            canActivate: [permissionGuard('structure.read')],
            data: { permissionKey: 'structure.read' },
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./settings.component').then((x) => x.SettingsComponent),
            data: { permissionKey: 'admin.settings' },
            canActivate: [permissionGuard('admin.settings')],
          },
          {
            path: 'user-management',
            loadComponent: () =>
              import('./user-management.component').then(
                (x) => x.UserManagementComponent
              ),
            data: { permissionKey: 'admin.users' },
            canActivate: [permissionGuard('admin.users')],
          },
          {
            path: 'permissions',
            loadComponent: () =>
              import('./pt-permissions/permissions-management.component').then(
                (x) => x.PermissionsManagementComponent
              ),
            // Legacy passed 'admin', now using specific key
            canActivate: [permissionGuard('admin.permissions')],
            data: { permissionKey: 'admin.permissions' },
          },
          {
            path: 'complaints-inbox',
            loadComponent: () =>
              import('./complaints-inbox.component').then(
                (x) => x.ComplaintsInboxComponent
              ),
            canActivate: [permissionGuard('hr.time.read')],
            data: { permissionKey: 'hr.time.read' },
          },
          {
            path: 'job-applications',
            loadComponent: () =>
              import('./job-applications-list.component').then(
                (x) => x.JobApplicationsListComponent
              ),
            canActivate: [permissionGuard('employees.read')],
            data: { permissionKey: 'employees.read' },
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
                canActivate: [permissionGuard('hr.time.read')],
                data: { permissionKey: 'hr.time.read' },
              },
              {
                path: 'disabilities',
                loadComponent: () =>
                  import('./hr-disabilities.component').then(
                    (x) => x.HRDisabilitiesComponent
                  ),
                canActivate: [permissionGuard('hr.time.read')],
                data: { permissionKey: 'hr.time.read' },
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
            canActivate: [permissionGuard('employees.read')],
            data: { permissionKey: 'employees.read' },
          },
          {
            path: 'performance',
            loadChildren: () =>
              import('./performance-360/performance-360.routes').then(
                (m) => m.PERFORMANCE_360_ROUTES
              ),
            canActivate: [permissionGuard('employees.read')],
            data: { permissionKey: 'employees.read' },
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
        canActivate: [employeePortalGuard, permissionGuard('schedules.read')],
        data: { permissionKey: 'schedules.read' },
        children: [
          {
            path: 'timelogs',
            loadComponent: () =>
              import('./timelogs.component').then((x) => x.TimelogsComponent),
            canActivate: [permissionGuard('schedules.read')],
            data: { permissionKey: 'schedules.read' },
          },
          {
            path: 'timetables',
            loadComponent: () =>
              import('./employees-timetable.component').then(
                (x) => x.EmployeesTimetableComponent
              ),
            canActivate: [permissionGuard('schedules.read')],
            data: { permissionKey: 'schedules.read' },
          },
          {
            path: 'schedules',
            loadComponent: () =>
              import('./schedules.component').then((x) => x.SchedulesComponent),
            canActivate: [permissionGuard('schedules.write')],
            data: { permissionKey: 'schedules.write' },
          },
          {
            path: 'vet-schedule',
            loadComponent: () =>
              import('./vet-schedule.component').then(
                (x) => x.VetScheduleComponent
              ),
            canActivate: [permissionGuard('schedules.write')],
            data: { permissionKey: 'schedules.write' },
          },
          {
            path: 'salon-schedule',
            loadComponent: () =>
              import('./salon-schedule.component').then(
                (x) => x.SalonScheduleComponent
              ),
            canActivate: [permissionGuard('schedules.write')],
            data: { permissionKey: 'schedules.write' },
          },
          {
            path: 'shifts',
            loadComponent: () =>
              import('./shifts.component').then((x) => x.ShiftsComponent),
            canActivate: [permissionGuard('schedules.write')],
            data: { permissionKey: 'schedules.write' },
          },
          { path: '', redirectTo: 'timetables', pathMatch: 'full' },
        ],
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./payroll.component').then((x) => x.PayrollComponent),
        canActivate: [employeePortalGuard, permissionGuard('payroll.read')],
        data: { permissionKey: 'payroll.read' },
        children: [
          {
            path: 'payrolls',
            loadComponent: () =>
              import('./payrolls.component').then((x) => x.PayrollsComponent),
            canActivate: [permissionGuard('payroll.read')],
            data: { permissionKey: 'payroll.read' },
          },
          {
            path: 'payrolls/:payroll_id',
            loadComponent: () =>
              import('./payrolls-details.component').then(
                (x) => x.PayrollsDetailsComponent
              ),
            canActivate: [permissionGuard('payroll.read')],
            data: { permissionKey: 'payroll.read' },
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id',
            loadComponent: () =>
              import('./payroll-payments-details.component').then(
                (x) => x.PayrollPaymentsDetailsComponent
              ),
            canActivate: [permissionGuard('payroll.read')],
            data: { permissionKey: 'payroll.read' },
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id/draft',
            loadComponent: () =>
              import('./payroll-summary.component').then(
                (x) => x.PayrollSummaryComponent
              ),
            canActivate: [permissionGuard('payroll.write')],
            data: { permissionKey: 'payroll.write' },
          },
          {
            path: 'creditors',
            loadComponent: () =>
              import('./creditors.component').then((x) => x.CreditorsComponent),
            data: { permissionKey: 'finance.read' },
            canActivate: [permissionGuard('finance.read')],
          },
          {
            path: 'banks',
            loadComponent: () =>
              import('./banks.component').then((x) => x.BanksComponent),
            data: { permissionKey: 'finance.read' },
            canActivate: [permissionGuard('finance.read')],
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
        canActivate: [employeePortalGuard, permissionGuard('schedules.read')],
        data: { permissionKey: 'schedules.read' },
      },
    ],
  },
];
