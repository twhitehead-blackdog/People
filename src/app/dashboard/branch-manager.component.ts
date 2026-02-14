import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { BranchesStore } from '../stores/branches.store';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { BranchManagerGestionesComponent } from './branch-manager-gestiones.component';
import { Reminder } from './modules/branch-manager/models/branch-manager.model';
import { BranchManagerService } from './modules/branch-manager/data/branch-manager.service';
import { BranchManagerRemindersTabComponent } from './modules/branch-manager/ui/branch-manager-reminders-tab.component';
import { BranchManagerRequestsTabComponent } from './modules/branch-manager/ui/branch-manager-requests-tab.component';
import { BranchManagerTimelogsTabComponent } from './modules/branch-manager/ui/branch-manager-timelogs-tab.component';
import { RequestDetailsDialogComponent } from './modules/branch-manager/ui/request-details-dialog.component';
import {
  processTimelogsForDisplay,
} from './modules/branch-manager/utils/timelog-processing.utils';
import {
  mapBranchEmployeeRequests,
  mapUnifiedRequest,
} from './modules/branch-manager/utils/request-mapping.utils';

@Component({
  selector: 'pt-branch-manager',
  standalone: true,
  imports: [
    Card,
    TabsModule,
    Button,
    TooltipModule,
    ToastModule,
    Select,
    FormsModule,
    NgClass,
    BranchManagerGestionesComponent,
    BranchManagerRemindersTabComponent,
    BranchManagerRequestsTabComponent,
    BranchManagerTimelogsTabComponent,
    RequestDetailsDialogComponent,
  ],
  providers: [MessageService],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('staggerFade', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('50ms', [
              animate(
                '0.3s ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  template: `
    <div
      [ngClass]="{ 'naz-theme': isNaz() }"
      class="p-6 md:p-8 lg:p-10 space-y-8"
    >
      <!-- Header Moderno -->
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
        @fadeIn
      >
        <div class="flex items-center gap-3 md:gap-5">
          <div
            class="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 duration-300 flex-shrink-0"
          >
            <i class="pi pi-shop text-white text-xl md:text-2xl"></i>
          </div>
          <div class="min-w-0">
            <h1
              class="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight truncate"
            >
              Gestión de Tienda
            </h1>
            <p class="text-gray-400 text-xs md:text-sm mt-1">
              @if (isAdmin()) {
              <span class="flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                ></span>
                <span class="font-medium">Administración de sucursales</span>
              </span>
              } @else {
              <span class="flex items-center gap-2">
                <i class="pi pi-map-marker text-indigo-400"></i>
                <span class="font-medium text-gray-300">{{
                  currentBranch()?.name || 'Sucursal'
                }}</span>
              </span>
              }
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 md:gap-3 flex-wrap">
          @if (isAdmin()) {
          <div
            class="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 border border-white/10 w-full sm:w-auto"
          >
            <i class="pi pi-building text-indigo-400 flex-shrink-0"></i>
            <p-select
              [options]="availableBranches()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="selectedBranchId"
              placeholder="Todas las sucursales"
              showClear
              appendTo="body"
              styleClass="w-full sm:w-56 border-0 bg-transparent"
              (ngModelChange)="onBranchChange()"
            />
          </div>
          } @if (unreadNotificationsCount() > 0) {
          <p-button
            icon="pi pi-bell"
            severity="warn"
            [badge]="unreadNotificationsCount().toString()"
            rounded
            (onClick)="markAllNotificationsAsRead()"
            pTooltip="Marcar todas como leídas"
            styleClass="shadow-lg shadow-amber-500/20"
          />
          }
        </div>
      </div>

      <!-- Dashboard de Métricas - Diseño Moderno -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 py-2 md:py-4" @staggerFade>
        <!-- Empleados -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-users text-emerald-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                todayStats().totalEmployees
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Empleados hoy</p>
          </div>
        </div>

        <!-- Retrasos -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-clock text-rose-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                todayStats().delayed
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Retrasos hoy</p>
          </div>
        </div>

        <!-- Notificaciones -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-bell text-blue-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                unreadNotificationsCount()
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Notificaciones</p>
          </div>
        </div>

        <!-- Recordatorios -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-bookmark text-amber-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                pendingRemindersCount()
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Recordatorios</p>
          </div>
        </div>
      </div>

      <!-- Card Principal -->
      <p-card @fadeIn>
        <p-tabs value="timelogs">
          <p-tablist class="flex-wrap">
            <p-tab value="timelogs">
              <i class="pi pi-clock mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Marcaciones</span>
              <span class="sm:hidden">Marcas</span>
            </p-tab>
            <p-tab value="gestiones">
              <i class="pi pi-file-edit mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Gestiones</span>
              <span class="sm:hidden">Gestiones</span>
            </p-tab>
            <p-tab value="employee-requests">
              <i class="pi pi-list mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Mis Solicitudes de Empleados</span>
              <span class="sm:hidden">Solicitudes</span>
            </p-tab>
            <p-tab value="reminders">
              <i class="pi pi-bookmark mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Recordatorios</span>
              <span class="sm:hidden">Record.</span>
              @if (pendingRemindersCount() > 0) {
              <span
                class="ml-1 md:ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 md:px-2 py-0.5 font-semibold"
              >
                {{ pendingRemindersCount() }}
              </span>
              }
            </p-tab>
          </p-tablist>

          <p-tabpanel value="employee-requests">
            <pt-branch-manager-requests-tab
              [unifiedRequests]="unifiedRequests()"
              [filteredCount]="filteredBranchEmployeeRequests().length"
              [isLoading]="
                compensatoryTimeoffsApi.isLoading() ||
                disabilitiesApi.isLoading() ||
                vacationsApi.isLoading() ||
                documentRequestsApi.isLoading()
              "
              [isMobile]="isMobile()"
              [(requestTypeFilter)]="requestTypeFilter"
              [(requestStatusFilter)]="requestStatusFilter"
              (refresh)="refreshEmployeeRequests()"
              (viewDetails)="viewRequestDetails($event)"
            />
          </p-tabpanel>

          <p-tabpanel value="timelogs">
            <pt-branch-manager-timelogs-tab
              [filteredTimelogs]="filteredTimelogs()"
              [todayStats]="todayStats()"
              [isLoading]="timelogsResource.isLoading()"
              [branchEmployees]="branchEmployees()"
              [isMobile]="isMobile()"
              [(selectedDate)]="selectedDate"
              [(selectedEmployeeId)]="selectedEmployeeId"
              (refresh)="refreshTimelogs()"
            />
          </p-tabpanel>

          <p-tabpanel value="gestiones">
            <pt-branch-manager-gestiones
              [branchEmployees]="branchEmployees()"
              [currentBranch]="currentBranch()"
              [currentEmployee]="currentEmployee()"
              (requestCreated)="refreshEmployeeRequests()"
            />
          </p-tabpanel>

          <p-tabpanel value="reminders">
            <pt-branch-manager-reminders-tab
              [filteredReminders]="filteredReminders()"
              [branchEmployees]="branchEmployees()"
              [isLoading]="
                remindersResource.isLoading() ||
                auditTaskInstancesResource.isLoading()
              "
              [isMobile]="isMobile()"
              [(selectedEmployeeForReminder)]="selectedEmployeeForReminder"
              (refresh)="refreshReminders()"
              (complete)="completeReminder($event)"
              (markNotApplicable)="markReminderNotApplicable($event)"
              (deleteReminder)="deleteReminder($event)"
              (create)="createReminderFromTab($event)"
            />
          </p-tabpanel>
        </p-tabs>
      </p-card>

      <!-- Diálogo de Detalles de Solicitud -->
      <pt-request-details-dialog
        [(visible)]="showRequestDetailsDialog"
        [request]="selectedRequest()"
        [isMobile]="isMobile()"
        (downloadDoc)="downloadDocument($event)"
      />
    </div>
  `,
  styles: `
    /* Modern Tab Styling */
    ::ng-deep .p-tablist {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 0;
    }
    ::ng-deep .p-tab {
      border-radius: 0.75rem 0.75rem 0 0;
      transition: all 0.2s ease;
    }
    ::ng-deep .p-tab:hover {
      background: rgba(255,255,255,0.05);
    }
    ::ng-deep .p-tab-active {
      background: rgba(99, 102, 241, 0.15) !important;
      border-bottom: 2px solid rgb(99, 102, 241);
    }

    /* Modern Table Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.1);
      padding: 1rem;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      transition: all 0.2s ease;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: rgba(255,255,255,0.05) !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: rgba(255,255,255,0.05);
      padding: 0.875rem 1rem;
    }

    /* Modern Card Styling */
    ::ng-deep .p-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem;
      backdrop-filter: blur(10px);
    }
    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem;
    }

    /* Modern Select Styling */
    ::ng-deep .p-select {
      border-radius: 0.75rem;
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05);
    }
    ::ng-deep .p-select:hover {
      border-color: rgba(99, 102, 241, 0.5);
    }

    /* Modern Button Styling */
    ::ng-deep .p-button.p-button-outlined {
      border-radius: 0.75rem;
    }

    /* Modern Avatar Styling */
    ::ng-deep .p-avatar {
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Paginator Styling */
    ::ng-deep .p-paginator {
      background: transparent;
      border: none;
      padding: 1rem 0;
    }

    /* Responsive Table */
    ::ng-deep .p-datatable-responsive .p-datatable-tbody > tr > td .p-column-title {
      display: none;
    }

    @media screen and (max-width: 768px) {
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-thead {
        display: none;
      }

      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr {
        display: block;
        margin-bottom: 0.5rem;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.5rem;
      }

      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: 0.75rem 1rem;
      }

      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td:last-child {
        border-bottom: none;
      }

      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td .p-column-title {
        display: block;
        font-weight: 600;
        color: #9ca3af;
      }

      ::ng-deep .p-tablist {
        flex-wrap: wrap;
      }

      ::ng-deep .p-tab {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchManagerComponent {
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private apiUrl = inject(ApiUrlService);
  public store = inject(DashboardStore);
  private employeesStore = inject(EmployeesStore);
  private branchesStore = inject(BranchesStore);
  private organizationService = inject(OrganizationService);
  public service = inject(BranchManagerService);

  public isNaz = computed(() => this.organizationService.isNaz());
  public isAdmin = computed(() => this.store.isAdmin());
  public currentBranchFromStore = computed(() => this.store.currentBranch());

  public selectedBranchId = signal<string | null>(null);

  // Si es admin, puede seleccionar cualquier sucursal, si no, usa su sucursal
  public currentBranch = computed(() => {
    if (this.isAdmin()) {
      const branchId = this.selectedBranchId();
      if (branchId) {
        return (
          this.branchesStore.entities().find((b) => b.id === branchId) || null
        );
      }
      return this.currentBranchFromStore();
    }
    return this.currentBranchFromStore();
  });

  // Lista de sucursales para el selector (solo para admins)
  public availableBranches = computed(() => {
    if (!this.isAdmin()) return [];
    return this.branchesStore.entities().filter((b) => b.is_active);
  });

  public isMobile = signal<boolean>(window.innerWidth < 768);
  public selectedEmployeeId = signal<string | null>(null);
  public selectedDate = signal<Date>(new Date());
  public selectedEmployeeForReminder = signal<string | null>(null);
  public showRequestDetailsDialog = signal(false);
  public selectedRequest = signal<any>(null);

  constructor() {
    // Inicializar sucursal seleccionada para admins
    if (this.isAdmin() && this.currentBranchFromStore()) {
      this.selectedBranchId.set(this.currentBranchFromStore()?.id || null);
    }

    // Sync component signals → service
    effect(() => {
      this.service.currentBranch.set(this.currentBranch());
    });
    effect(() => {
      this.service.selectedDate.set(this.selectedDate());
    });

    // Auto-refresh notifications every 30 seconds
    setInterval(() => {
      this.service.refreshNotifications();
    }, 30000);

    // Listen for window resize to update isMobile
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.isMobile.set(window.innerWidth < 768);
      });
    }
  }

  // Branch employees
  public branchEmployees = computed(() => {
    const branchId = this.currentBranch()?.id;
    let employees = this.employeesStore
      .employeesList()
      .filter((emp) => emp.is_active);
    if (branchId) {
      employees = employees.filter((emp) => emp.branch_id === branchId);
    }
    return employees.map((emp) => ({
      ...emp,
      short_name: `${emp.first_name} ${emp.father_name}`,
    }));
  });

  // Current employee (branch manager)
  public currentEmployee = computed(() => this.store.currentEmployee());

  // Delegated to service
  public get compensatoryTimeoffsApi() { return this.service.compensatoryTimeoffsApi; }
  public get disabilitiesApi() { return this.service.disabilitiesApi; }
  public get vacationsApi() { return this.service.vacationsApi; }
  public get documentRequestsApi() { return this.service.documentRequestsApi; }
  public get timelogsResource() { return this.service.timelogsResource; }
  public get timelogSchedulesResource() { return this.service.timelogSchedulesResource; }
  public get enrichedNotifications() { return this.service.enrichedNotifications; }
  public get remindersResource() { return this.service.remindersResource; }
  public get auditTaskInstancesResource() { return this.service.auditTaskInstancesResource; }
  public get allReminders() { return this.service.allReminders; }

  // Combinar todas las solicitudes de empleados de la sucursal
  public branchEmployeeRequests = computed(() => {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!branchId || !companyId) return [];

    const branchEmployeeIds = new Set(this.branchEmployees().map((e) => e.id));

    return mapBranchEmployeeRequests(
      this.compensatoryTimeoffsApi.value() || [],
      this.disabilitiesApi.value() || [],
      this.vacationsApi.value() || [],
      this.documentRequestsApi.value() || [],
      branchEmployeeIds,
      branchId,
      this.employeesStore.entityMap()
    );
  });

  // Filters for employee requests
  public requestTypeFilter = signal<string | null>(null);
  public requestStatusFilter = signal<string | null>(null);

  public filteredBranchEmployeeRequests = computed(() => {
    let requests = this.branchEmployeeRequests();

    const typeFilter = this.requestTypeFilter();
    if (typeFilter) {
      requests = requests.filter((r) => r.requestType === typeFilter);
    }

    const statusFilter = this.requestStatusFilter();
    if (statusFilter) {
      requests = requests.filter((r) => {
        const status = r.status || r.review_status;
        return status === statusFilter;
      });
    }

    return requests;
  });

  public unifiedRequests = computed(() => {
    return this.filteredBranchEmployeeRequests().map(mapUnifiedRequest);
  });

  // Computed values
  public unreadNotificationsCount = computed(() => {
    return this.enrichedNotifications().filter((n) => !n.is_read).length || 0;
  });

  public todayStats = computed(() => {
    const logs = this.filteredTimelogs();
    return {
      totalEmployees: logs.length,
      onTime: logs.filter(
        (log: any) =>
          !log.is_delayed &&
          !log.is_missing &&
          !log.lunch_exceeded &&
          !log.is_early_exit &&
          log.entry_time
      ).length,
      delayed: logs.filter((log: any) => log.is_delayed).length,
      missing: logs.filter((log: any) => !log.entry_time).length,
      lunchExceeded: logs.filter((log: any) => log.lunch_exceeded).length,
      earlyExit: logs.filter((log: any) => log.is_early_exit).length,
    };
  });

  public pendingRemindersCount = computed(() => {
    return this.allReminders().filter(
      (r) => !r.is_completed && r.status !== 'not_applicable'
    ).length;
  });

  public filteredTimelogs = computed(() => {
    return processTimelogsForDisplay(
      this.timelogsResource.value() || [],
      this.timelogSchedulesResource.value() || [],
      this.branchEmployees(),
      this.selectedDate(),
      this.currentBranch()?.id || null,
      this.selectedEmployeeId()
    );
  });

  public filteredReminders = computed(() => {
    const reminders = this.allReminders();
    const employeeId = this.selectedEmployeeForReminder();
    if (!employeeId) return reminders;
    return reminders.filter((r) => r.employee_id === employeeId);
  });

  // Actions
  public onBranchChange() {
    this.service.reload();
  }

  public refreshNotifications() { this.service.refreshNotifications(); }
  public refreshTimelogs() { this.service.refreshTimelogs(); }
  public refreshReminders() { this.service.refreshReminders(); }
  public refreshEmployeeRequests() { this.service.refreshEmployeeRequests(); }

  public viewRequestDetails(request: any) {
    this.selectedRequest.set(request);
    this.showRequestDetailsDialog.set(true);
  }

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
  }

  public markAllNotificationsAsRead() {
    const unreadIds = this.enrichedNotifications()
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    this.service.markAllNotificationsAsRead(unreadIds).subscribe({
      next: () => {
        this.refreshNotifications();
        this.message.add({ severity: 'success', summary: 'Todas las notificaciones marcadas como leídas' });
      },
      error: () => {
        this.message.add({ severity: 'error', summary: 'Error al marcar notificaciones' });
      },
    });
  }

  public createReminderFromTab(data: { employeeId: string | null; message: string; dueDate: Date }) {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    let finalBranchId: string | undefined = branchId;
    if (!finalBranchId && data.employeeId) {
      const employee = this.employeesStore.entities().find((e) => e.id === data.employeeId);
      finalBranchId = employee?.branch_id || undefined;
    }
    if (!finalBranchId) {
      this.message.add({ severity: 'warn', summary: 'Selecciona una sucursal o un empleado' });
      return;
    }

    this.service.createReminder({
      employee_id: data.employeeId,
      branch_id: finalBranchId,
      company_id: companyId,
      message: data.message,
      due_date: data.dueDate.toISOString(),
    }).subscribe({
      next: () => {
        this.message.add({ severity: 'success', summary: 'Recordatorio creado' });
        this.refreshReminders();
      },
      error: () => {
        this.message.add({ severity: 'error', summary: 'Error al crear recordatorio' });
      },
    });
  }

  public completeReminder(reminder: Reminder) {
    this.service.completeReminder(reminder).subscribe({
      next: () => {
        this.refreshReminders();
        this.message.add({
          severity: 'success',
          summary: reminder.audit_task_instance_id ? 'Tarea completada' : 'Recordatorio completado',
          detail: reminder.audit_task_instance_id ? 'La tarea de auditoría ha sido marcada como completada' : undefined,
        });
      },
      error: () => {
        this.message.add({
          severity: 'error',
          summary: reminder.audit_task_instance_id ? 'Error al completar tarea' : 'Error al completar recordatorio',
        });
      },
    });
  }

  public markReminderNotApplicable(reminder: Reminder) {
    if (!reminder.audit_task_instance_id) return;
    this.service.markReminderNotApplicable(reminder).subscribe({
      next: () => {
        this.refreshReminders();
        this.message.add({ severity: 'info', summary: 'Tarea marcada como No Aplica' });
      },
      error: () => {
        this.message.add({ severity: 'error', summary: 'Error al actualizar tarea' });
      },
    });
  }

  public deleteReminder(id: string) {
    this.service.deleteReminder(id).subscribe({
      next: () => {
        this.refreshReminders();
        this.message.add({ severity: 'success', summary: 'Recordatorio eliminado' });
      },
      error: () => {
        this.message.add({ severity: 'error', summary: 'Error al eliminar recordatorio' });
      },
    });
  }

  public async onSubmitCompensatoryFromBranchManager(data: any): Promise<void> {
    try {
      const { uploadCompensatory } = await import(
        '../employee-portal/actions/employee-portal-compensatory.actions'
      );

      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.message,
        currentEmployee: () => this.currentEmployee(),
        formState: data,
        resetForm: () => {},
        reloadRequests: () => this.compensatoryTimeoffsApi.reload(),
        setSubmitting: (value: boolean) => {},
      };

      await uploadCompensatory(deps);

      this.message.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `La solicitud de compensatorio para ${data.employee?.first_name} ${data.employee?.father_name} ha sido enviada correctamente`,
      });
    } catch (error) {
      console.error(
        'Error submitting compensatory from branch manager:',
        error
      );
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    }
  }
}
