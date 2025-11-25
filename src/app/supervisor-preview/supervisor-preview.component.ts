import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { format } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TimeLog } from '../models';
import { AuthStore } from '../stores/auth.store';
import { BanksStore } from '../stores/banks.store';
import { BranchesStore } from '../stores/branches.store';
import { CompaniesStore } from '../stores/companies.store';
import { DashboardStore } from '../stores/dashboard.store';
import { DepartmentsStore } from '../stores/departments.store';
import { EmployeesStore } from '../stores/employees.store';
import { PayrollsStore } from '../stores/payrolls.store';
import { PositionsStore } from '../stores/positions.store';
import { SchedulesStore } from '../stores/schedules.store';

@Component({
  selector: 'pt-supervisor-preview',
  standalone: true,
  imports: [
    Card,
    TableModule,
    DatePipe,
    FormsModule,
    Select,
    ToastModule,
    TooltipModule,
    Tag,
    Avatar,
  ],
  providers: [
    MessageService,
    ConfirmationService,
    AuthStore,
    DashboardStore,
    EmployeesStore,
    BranchesStore,
    CompaniesStore,
    PositionsStore,
    DepartmentsStore,
    SchedulesStore,
    BanksStore,
    PayrollsStore,
  ],
  template: `
    <div class="supervisor-preview-content p-6">
      <!-- Header con selector de sucursal -->
      <p-card class="mb-6">
        <div
          class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-bold text-white m-0 mb-2">
              Vista de Prueba - Supervisor
            </h1>
            <p class="text-gray-400 m-0">
              Selecciona una sucursal para ver lo que vería un supervisor de esa
              sucursal
            </p>
          </div>
          <div class="w-full md:w-64">
            <label class="text-sm text-gray-400 mb-2 block">Sucursal</label>
            <p-select
              [options]="branches()"
              optionLabel="name"
              optionValue="id"
              placeholder="Selecciona una sucursal"
              [(ngModel)]="selectedBranchId"
              (ngModelChange)="onBranchChange()"
              [showClear]="false"
              appendTo="body"
              class="w-full"
            />
          </div>
        </div>
      </p-card>

      @if (selectedBranch()) {
      <!-- Dashboard de la Sucursal -->
      <div class="flex flex-col gap-6">
        <!-- Welcome Card -->
        <p-card class="dashboard-welcome-card">
          <div
            class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg"
              >
                <i class="pi pi-building text-white text-2xl"></i>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white m-0">
                  Sucursal: {{ selectedBranch()?.name }}
                </h2>
                <p class="text-gray-400 m-0 mt-1">
                  Correo: {{ selectedBranch()?.work_email || 'No configurado' }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400 m-0">Hoy es</p>
              <p class="text-lg font-semibold text-white m-0">
                {{ getCurrentDate() | date : 'fullDate' }}
              </p>
            </div>
          </div>
        </p-card>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Empleados -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Empleados Activos</p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ branchEmployees().length }}
                </p>
                <p class="text-xs text-gray-500 m-0 mt-1">En esta sucursal</p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
              >
                <i class="pi pi-users text-blue-400 text-xl"></i>
              </div>
            </div>
          </p-card>

          <!-- Marcaciones Hoy -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Marcaciones Hoy</p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ todayTimelogs().length }}
                </p>
                <p class="text-xs text-gray-500 m-0 mt-1">De esta sucursal</p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <i class="pi pi-check-circle text-green-400 text-xl"></i>
              </div>
            </div>
          </p-card>

          <!-- Retrasos Hoy -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Retrasos Hoy</p>
                <p class="text-2xl font-bold text-red-400 m-0">
                  {{ todayDelays().length }}
                </p>
                <p class="text-xs text-gray-500 m-0 mt-1">Requieren atención</p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <i class="pi pi-clock text-red-400 text-xl"></i>
              </div>
            </div>
          </p-card>

          <!-- Marcaciones Esta Semana -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Esta Semana</p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ weekTimelogs().length }}
                </p>
                <p class="text-xs text-gray-500 m-0 mt-1">Marcaciones</p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar text-amber-400 text-xl"></i>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Tablas de Información -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Lista de Empleados -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-users text-blue-400"></i>
                <span>Empleados de la Sucursal</span>
              </div>
            </ng-template>
            <p-table
              [value]="branchEmployees()"
              [rows]="10"
              [paginator]="true"
              [showGridlines]="true"
              [scrollable]="true"
              scrollHeight="400px"
            >
              <ng-template #header>
                <tr>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>Estado</th>
                </tr>
              </ng-template>
              <ng-template #body let-employee>
                <tr>
                  <td>
                    <div class="flex items-center gap-2">
                      <p-avatar
                        shape="circle"
                        [label]="
                          employee.first_name.charAt(0) +
                          employee.father_name.charAt(0)
                        "
                        size="normal"
                      />
                      <span class="text-white">
                        {{ employee.first_name }} {{ employee.father_name }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="text-gray-300">
                      {{ employee.position?.name || 'Sin cargo' }}
                    </span>
                  </td>
                  <td>
                    <p-tag
                      [value]="employee.is_active ? 'Activo' : 'Inactivo'"
                      [severity]="employee.is_active ? 'success' : 'danger'"
                    />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>

          <!-- Marcaciones Recientes -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar-clock text-green-400"></i>
                <span>Marcaciones Recientes</span>
              </div>
            </ng-template>
            <p-table
              [value]="recentTimelogs()"
              [rows]="10"
              [paginator]="true"
              [showGridlines]="true"
              [scrollable]="true"
              scrollHeight="400px"
            >
              <ng-template #header>
                <tr>
                  <th>Empleado</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Hora</th>
                  <th>Sucursal</th>
                </tr>
              </ng-template>
              <ng-template #body let-log>
                <tr>
                  <td>
                    <span class="text-white">
                      {{ log.employee?.first_name }}
                      {{ log.employee?.father_name }}
                    </span>
                  </td>
                  <td>
                    <span class="text-gray-300">
                      {{ log.created_at | date : 'shortDate' }}
                    </span>
                  </td>
                  <td>
                    <p-tag
                      [value]="getTimelogTypeLabel(log.type)"
                      [severity]="getTimelogSeverity(log.type)"
                    />
                  </td>
                  <td>
                    <span class="text-white">
                      {{ log.created_at | date : 'shortTime' }}
                    </span>
                  </td>
                  <td>
                    <p-avatar
                      shape="circle"
                      [label]="log.branch?.short_name || 'N/A'"
                      [pTooltip]="log.branch?.name"
                      tooltipPosition="top"
                      size="normal"
                    />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Retrasos y Alertas -->
        @if (todayDelays().length > 0) {
        <p-card>
          <ng-template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-exclamation-triangle text-red-400"></i>
              <span>Retrasos de Hoy - Requieren Atención</span>
            </div>
          </ng-template>
          <p-table
            [value]="todayDelays()"
            [showGridlines]="true"
            [scrollable]="true"
            scrollHeight="300px"
          >
            <ng-template #header>
              <tr>
                <th>Empleado</th>
                <th>Hora Esperada</th>
                <th>Hora Real</th>
                <th>Retraso</th>
              </tr>
            </ng-template>
            <ng-template #body let-delay>
              <tr>
                <td>
                  <span class="text-white">
                    {{ delay.employee?.first_name }}
                    {{ delay.employee?.father_name }}
                  </span>
                </td>
                <td>
                  <span class="text-gray-300">{{ delay.expectedTime }}</span>
                </td>
                <td>
                  <span class="text-white">{{ delay.actualTime }}</span>
                </td>
                <td>
                  <p-tag
                    value="{{ delay.delayMinutes }} min"
                    severity="danger"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
        }
      </div>
      } @else {
      <p-card>
        <div class="text-center py-8">
          <i class="pi pi-building text-6xl text-gray-600 mb-4"></i>
          <p class="text-xl text-gray-400">
            Selecciona una sucursal para comenzar
          </p>
        </div>
      </p-card>
      }
    </div>
  `,
  styles: `
    .supervisor-preview-content {
      min-height: 100vh;
      background: #0a0a0a;
    }

    .dashboard-welcome-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .dashboard-stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      transition: all 0.3s ease;
    }

    .dashboard-stat-card:hover {
      border-color: #3b82f6;
      transform: translateY(-2px);
    }

    ::ng-deep .p-card {
      background: #1e293b !important;
      border: 1px solid #334155 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-card .p-card-title {
      color: #ffffff !important;
    }

    ::ng-deep .p-table {
      background: #1e293b !important;
    }

    ::ng-deep .p-table th {
      background: #0f172a !important;
      color: #e5e7eb !important;
      border-color: #334155 !important;
    }

    ::ng-deep .p-table td {
      background: #1e293b !important;
      color: #e5e7eb !important;
      border-color: #334155 !important;
    }

    ::ng-deep .p-table .p-datatable-tbody > tr:hover {
      background: #334155 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorPreviewComponent {
  public store = inject(DashboardStore);
  public employeesStore = inject(EmployeesStore);
  public http = inject(HttpClient);
  public router = inject(Router);
  public messageService = inject(MessageService);

  public selectedBranchId = signal<string>('');
  public selectedBranch = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return null;
    return (
      this.store.branches.entities().find((b) => b.id === branchId) || null
    );
  });

  public branches = computed(() => {
    return this.store.branches.entities().filter((b) => b.is_active);
  });

  // Empleados de la sucursal seleccionada
  public branchEmployees = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return [];
    return this.employeesStore
      .entities()
      .filter((emp) => emp.branch_id === branchId && emp.is_active);
  });

  // Marcaciones de la sucursal
  public branchTimelogsApi = httpResource<TimeLog[]>(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return undefined;

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
      method: 'GET',
      params: {
        branch_id: `eq.${branchId}`,
        select:
          '*,employee:employees(id,first_name,father_name),branch:branches(id,name,short_name)',
        order: 'created_at.desc',
        limit: '1000',
      },
    };
  });

  public allTimelogs = computed(() => {
    return this.branchTimelogsApi.value() ?? [];
  });

  // Marcaciones de hoy
  public todayTimelogs = computed(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.allTimelogs().filter((log) => {
      const logDate = format(new Date(log.created_at), 'yyyy-MM-dd');
      return logDate === today;
    });
  });

  // Marcaciones de esta semana
  public weekTimelogs = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.allTimelogs().filter((log) => {
      return new Date(log.created_at) >= weekAgo;
    });
  });

  // Marcaciones recientes (últimas 20)
  public recentTimelogs = computed(() => {
    return this.allTimelogs().slice(0, 20);
  });

  // Retrasos de hoy (simulado - necesitarías lógica más compleja)
  public todayDelays = computed(() => {
    // Esto es un ejemplo simplificado
    // En producción necesitarías calcular retrasos comparando con horarios
    return [];
  });

  public getCurrentDate(): Date {
    return new Date();
  }

  public onBranchChange(): void {
    // Recargar datos cuando cambia la sucursal
    this.branchTimelogsApi.reload();
  }

  public getTimelogTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      lunch_start: 'Inicio Almuerzo',
      lunch_end: 'Fin Almuerzo',
      exit: 'Salida',
    };
    return labels[type] || type;
  }

  public getTimelogSeverity(
    type: string
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary'
    | 'contrast'
    | undefined {
    const severities: Record<
      string,
      | 'success'
      | 'info'
      | 'warn'
      | 'danger'
      | 'secondary'
      | 'contrast'
      | undefined
    > = {
      entry: 'success',
      lunch_start: 'info',
      lunch_end: 'info',
      exit: 'warn',
    };
    return severities[type] || 'secondary';
  }
}
