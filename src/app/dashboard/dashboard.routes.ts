import { Routes } from '@angular/router';
import { employeePortalGuard } from '../guards/employee-portal.guard';
import { modulePermissionGuard } from '../guards/permission.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard.component').then((x) => x.DashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'launcher',
        pathMatch: 'full',
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./admin.component').then((x) => x.AdminComponent),
        canActivate: [employeePortalGuard, modulePermissionGuard('admin')],
        children: [
          {
            path: 'employees',
            canActivate: [modulePermissionGuard('admin', 'employees')],
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
            canActivate: [modulePermissionGuard('admin', 'organigrama')],
            loadComponent: () =>
              import('./organigrama.component').then(
                (x) => x.OrganigramaComponent
              ),
          },
          {
            path: 'companies',
            canActivate: [modulePermissionGuard('admin', 'companies')],
            loadComponent: () =>
              import('./companies.component').then((x) => x.CompaniesComponent),
          },
          {
            path: 'departments',
            canActivate: [modulePermissionGuard('admin', 'departments')],
            loadComponent: () =>
              import('./departments.component').then(
                (x) => x.DepartmentsComponent
              ),
          },
          {
            path: 'positions',
            canActivate: [modulePermissionGuard('admin', 'positions')],
            loadComponent: () =>
              import('./positions.component').then((x) => x.PositionsComponent),
          },
          {
            path: 'branches',
            canActivate: [modulePermissionGuard('admin', 'branches')],
            loadComponent: () =>
              import('./branches.component').then((x) => x.BranchesComponent),
          },
          {
            path: 'settings',
            canActivate: [modulePermissionGuard('admin', 'settings')],
            loadComponent: () =>
              import('./settings.component').then((x) => x.SettingsComponent),
          },
          {
            path: 'user-management',
            canActivate: [modulePermissionGuard('admin', 'user_management')],
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
            canActivate: [modulePermissionGuard('admin', 'permissions')],
          },
          {
            path: 'complaints-inbox',
            canActivate: [modulePermissionGuard('admin', 'complaints')],
            loadComponent: () =>
              import('./complaints-inbox.component').then(
                (x) => x.ComplaintsInboxComponent
              ),
          },
          {
            path: 'job-applications',
            canActivate: [modulePermissionGuard('admin', 'job_applications')],
            loadComponent: () =>
              import('./job-applications-list.component').then(
                (x) => x.JobApplicationsListComponent
              ),
          },
          {
            path: 'device-inventory',
            canActivate: [modulePermissionGuard('admin', 'device_inventory')],
            loadComponent: () =>
              import('./device-inventory.component').then(
                (x) => x.DeviceInventoryComponent
              ),
          },
          {
            path: 'hr',
            canActivate: [modulePermissionGuard('hr')],
            children: [
              {
                path: 'time-dashboard',
                canActivate: [modulePermissionGuard('hr', 'hr_time_dashboard')],
                loadComponent: () =>
                  import('./hr-time-dashboard.component').then(
                    (x) => x.HRTimeDashboardComponent
                  ),
              },
              {
                path: 'disabilities',
                canActivate: [modulePermissionGuard('hr', 'hr_disabilities')],
                loadComponent: () =>
                  import('./hr-disabilities.component').then(
                    (x) => x.HRDisabilitiesComponent
                  ),
              },
              { path: '', redirectTo: 'time-dashboard', pathMatch: 'full' },
            ],
          },
          {
            path: 'compras',
            canActivate: [modulePermissionGuard('compras', 'compras_dashboard')],
            loadComponent: () =>
              import('./compras-dashboard.component').then(
                (x) => x.ComprasDashboardComponent
              ),
          },
          {
            path: 'audit-tasks',
            canActivate: [modulePermissionGuard('admin', 'audit_tasks')],
            loadComponent: () =>
              import('./audit-tasks.component').then(
                (x) => x.AuditTasksComponent
              ),
          },
          {
            path: 'performance',
            canActivate: [modulePermissionGuard('performance')],
            loadChildren: () =>
              import('./performance-360/performance-360.routes').then(
                (m) => m.PERFORMANCE_360_ROUTES
              ),
          },
          {
            path: 'surveys',
            canActivate: [modulePermissionGuard('hr', 'hr_surveys')],
            loadChildren: () =>
              import('./surveys/survey.routes').then(
                (m) => m.SURVEY_ROUTES
              ),
          },
          {
            path: 'home',
            canActivate: [modulePermissionGuard('home')],
            loadComponent: () =>
              import('./home.component').then((x) => x.HomeComponent),
          },
          {
            path: 'hub',
            data: { module: 'admin' },
            loadComponent: () =>
              import('./module-launcher/module-launcher.component').then(
                (x) => x.ModuleLauncherComponent
              ),
          },
          { path: '', redirectTo: 'hub', pathMatch: 'full' },
        ],
      },
      {
        path: 'time-management',
        loadComponent: () =>
          import('./time-management.component').then(
            (x) => x.TimeManagementComponent
          ),
        canActivate: [employeePortalGuard, modulePermissionGuard('time_management')],
        children: [
          {
            path: 'timelogs',
            canActivate: [modulePermissionGuard('time_management', 'timelogs')],
            loadComponent: () =>
              import('./timelogs.component').then((x) => x.TimelogsComponent),
          },
          {
            path: 'timetables',
            canActivate: [modulePermissionGuard('time_management', 'timetables')],
            loadComponent: () =>
              import('./employees-timetable.component').then(
                (x) => x.EmployeesTimetableComponent
              ),
          },
          {
            path: 'schedules',
            canActivate: [modulePermissionGuard('time_management', 'schedules')],
            loadComponent: () =>
              import('./schedules.component').then((x) => x.SchedulesComponent),
          },
          {
            path: 'vet-schedule',
            canActivate: [modulePermissionGuard('time_management', 'vet_schedule')],
            loadComponent: () =>
              import('./vet-schedule.component').then(
                (x) => x.VetScheduleComponent
              ),
          },
          {
            path: 'salon-schedule',
            canActivate: [modulePermissionGuard('time_management', 'salon_schedule')],
            loadComponent: () =>
              import('./salon-schedule.component').then(
                (x) => x.SalonScheduleComponent
              ),
          },

          {
            path: 'hub',
            data: { module: 'time-management' },
            loadComponent: () =>
              import('./module-launcher/module-launcher.component').then(
                (x) => x.ModuleLauncherComponent
              ),
          },
          { path: '', redirectTo: 'hub', pathMatch: 'full' },
        ],
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./payroll.component').then((x) => x.PayrollComponent),
        canActivate: [employeePortalGuard, modulePermissionGuard('payroll')],
        children: [
          {
            path: 'payrolls',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payrolls.component').then((x) => x.PayrollsComponent),
          },
          {
            path: 'payrolls/:payroll_id',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payrolls-details.component').then(
                (x) => x.PayrollsDetailsComponent
              ),
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payroll-payments-details.component').then(
                (x) => x.PayrollPaymentsDetailsComponent
              ),
          },
          {
            path: 'payrolls/:payroll_id/payments/:payment_id/draft',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payroll-summary.component').then(
                (x) => x.PayrollSummaryComponent
              ),
          },
          {
            path: 'creditors',
            canActivate: [modulePermissionGuard('payroll', 'creditors')],
            loadComponent: () =>
              import('./creditors.component').then((x) => x.CreditorsComponent),
          },
          {
            path: 'banks',
            canActivate: [modulePermissionGuard('payroll', 'banks')],
            loadComponent: () =>
              import('./banks.component').then((x) => x.BanksComponent),
          },
          {
            path: 'admin',
            canActivate: [modulePermissionGuard('payroll', 'payroll_admin')],
            loadComponent: () =>
              import('./payroll-admin.component').then(
                (x) => x.PayrollAdminComponent
              ),
          },
          {
            path: 'decimo',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payroll-decimo.component').then(
                (x) => x.PayrollDecimoComponent
              ),
          },
          {
            path: 'vacations',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            loadComponent: () =>
              import('./payroll-vacations.component').then(
                (x) => x.PayrollVacationsComponent
              ),
          },
          {
            path: 'liquidation',
            canActivate: [modulePermissionGuard('payroll', 'payrolls')],
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./payroll-liquidation.component').then(
                    (x) => x.PayrollLiquidationComponent
                  ),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./payroll-liquidation-form.component').then(
                    (x) => x.PayrollLiquidationFormComponent
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./payroll-liquidation-detail.component').then(
                    (x) => x.PayrollLiquidationDetailComponent
                  ),
              },
            ],
          },
          {
            path: 'import',
            canActivate: [modulePermissionGuard('payroll', 'payroll_import')],
            loadComponent: () =>
              import('./payroll-import.component').then(
                (x) => x.PayrollImportComponent
              ),
          },
          {
            path: 'hub',
            data: { module: 'payroll' },
            loadComponent: () =>
              import('./module-launcher/module-launcher.component').then(
                (x) => x.ModuleLauncherComponent
              ),
          },
          { path: '', redirectTo: 'hub', pathMatch: 'full' },
        ],
      },
      {
        path: 'timeclock',
        loadComponent: () =>
          import('../timeclock.component').then((x) => x.TimeclockComponent),
        canActivate: [
          modulePermissionGuard('timeclock'),
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
        canActivate: [employeePortalGuard, modulePermissionGuard('branch_manager')],
      },
      {
        path: 'launcher',
        loadComponent: () =>
          import('./app-launcher/app-launcher.component').then(
            (x) => x.AppLauncherComponent
          ),
        canActivate: [employeePortalGuard, modulePermissionGuard('services', 'launcher_access')],
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./analytics-embed/analytics-embed.component').then(
            (x) => x.AnalyticsEmbedComponent
          ),
        canActivate: [modulePermissionGuard('services', 'analytics_access')],
      },
      {
        path: 'live',
        loadComponent: () =>
          import('./live-embed/live-embed.component').then(
            (x) => x.LiveEmbedComponent
          ),
        canActivate: [employeePortalGuard, modulePermissionGuard('services', 'live_access')],
      },
    ],
  },
];
