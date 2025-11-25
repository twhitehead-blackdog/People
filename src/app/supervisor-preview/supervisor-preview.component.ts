import { DatePipe, NgClass } from '@angular/common';
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
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { EmployeeSchedule, TimeLog } from '../models';
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
    DatePicker,
    Button,
    ToastModule,
    TooltipModule,
    Tag,
    Avatar,
    NgClass,
  ],
  providers: [
    MessageService,
    ConfirmationService,
    DialogService,
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
              <p class="text-sm text-gray-400 m-0 mb-2">Fecha</p>
              <div class="flex items-center gap-2">
                <p-button
                  icon="pi pi-chevron-left"
                  [text]="true"
                  severity="secondary"
                  (onClick)="previousDay()"
                  [pTooltip]="'Día anterior'"
                  tooltipPosition="top"
                  [disabled]="isMaxDate()"
                />
                <p-datepicker
                  [(ngModel)]="selectedDate"
                  (ngModelChange)="onDateChange($event)"
                  [showIcon]="true"
                  iconDisplay="input"
                  appendTo="body"
                  [maxDate]="getMaxDate()"
                  styleClass="flex-1"
                  inputStyleClass="text-lg font-semibold text-white bg-transparent border-none p-0 cursor-pointer text-center"
                  [showOnFocus]="false"
                  [hideOnDateTimeSelect]="true"
                  dateFormat="dd/mm/yy"
                >
                  <ng-template pTemplate="date" let-date>
                    <span
                      class="date-cell"
                      [ngClass]="{
                        'date-with-data': hasDataForDate(date),
                        'date-without-data':
                          !hasDataForDate(date) &&
                          !isFutureDate(date) &&
                          !isToday(date)
                      }"
                    >
                      {{ date.day }}
                    </span>
                  </ng-template>
                </p-datepicker>
                <p-button
                  icon="pi pi-chevron-right"
                  [text]="true"
                  severity="secondary"
                  (onClick)="nextDay()"
                  [pTooltip]="'Día siguiente'"
                  tooltipPosition="top"
                  [disabled]="isMaxDate()"
                />
              </div>
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
                    <div
                      class="flex items-center gap-2 cursor-pointer hover:bg-neutral-700/50 rounded px-2 py-1 transition-colors"
                      (click)="
                        $event.stopPropagation();
                        openEmployeeScheduleModal(employee)
                      "
                      [pTooltip]="'Ver horario activo'"
                      tooltipPosition="top"
                    >
                      <p-avatar
                        shape="circle"
                        [label]="
                          employee.first_name.charAt(0) +
                          employee.father_name.charAt(0)
                        "
                        size="normal"
                      />
                      <span
                        class="text-white hover:text-amber-400 transition-colors"
                      >
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
                <span
                  >Marcaciones del
                  {{ getCurrentDate() | date : 'fullDate' : '' : 'es' }}</span
                >
              </div>
            </ng-template>
            @if (todayTimelogs().length === 0) {
            <div class="flex flex-col items-center justify-center py-8 px-4">
              <i class="pi pi-info-circle text-4xl text-amber-400 mb-4"></i>
              <p class="text-lg font-semibold text-white mb-2">
                No hay marcaciones para esta fecha
              </p>
              <p class="text-sm text-gray-400 text-center max-w-md">
                No se encontraron registros de marcaciones para el
                {{ getCurrentDate() | date : 'fullDate' : '' : 'es' }}. Esto
                puede deberse a que:
              </p>
              <ul
                class="text-sm text-gray-400 mt-2 list-disc list-inside text-center max-w-md"
              >
                <li>No hubo actividad en esta sucursal ese día</li>
                <li>Los empleados no marcaron entrada/salida</li>
                <li>La fecha seleccionada es un día no laboral</li>
              </ul>
            </div>
            } @else {
            <p-table
              [value]="todayTimelogs()"
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
            }
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

    .dashboard-welcome-card ::ng-deep .p-card {
      background: linear-gradient(to right, #1e3a8a, #1d4ed8) !important;
      color: white !important;
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      overflow: hidden !important;
    }

    .dashboard-stat-card ::ng-deep .p-card {
      background-color: #1f2937 !important;
      color: white !important;
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      overflow: hidden !important;
      transition: all 0.3s ease !important;
    }

    .dashboard-stat-card:hover ::ng-deep .p-card {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
      transform: translateY(-2px);
    }

    ::ng-deep .p-card {
      background: #1f2937 !important;
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      color: #e5e7eb !important;
      overflow: hidden !important;
    }

    ::ng-deep .p-card .p-card-title {
      color: #ffffff !important;
      border-bottom: 1px solid rgba(100, 100, 100, 0.2) !important;
      padding-bottom: 0.75rem !important;
      margin-bottom: 1rem !important;
    }

    ::ng-deep .p-table {
      background: transparent !important;
    }

    ::ng-deep .p-table th {
      background: #1e293b !important;
      color: #94a3b8 !important;
      border: none !important;
      border-bottom: 1px solid #334155 !important;
    }

    ::ng-deep .p-table td {
      background: #1e293b !important;
      color: #e5e7eb !important;
      border: none !important;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5) !important;
    }

    ::ng-deep .p-table .p-datatable-tbody > tr:hover {
      background: #334155 !important;
    }

    ::ng-deep .p-table .p-datatable-tbody > tr:last-child td {
      border-bottom: none !important;
    }

    /* Estilos para resaltar días con y sin datos en el calendario */
    ::ng-deep .p-datepicker .p-datepicker-calendar td {
      position: relative;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td .date-cell {
      position: relative;
      display: inline-block;
      width: 100%;
      height: 100%;
      padding: 0.5rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td .date-with-data {
      background-color: rgba(34, 197, 94, 0.2) !important;
      border: 1px solid rgba(34, 197, 94, 0.5) !important;
      color: #22c55e !important;
      font-weight: 600;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td .date-with-data::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background-color: #22c55e;
      border-radius: 50%;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td .date-without-data {
      background-color: rgba(239, 68, 68, 0.1) !important;
      border: 1px solid rgba(239, 68, 68, 0.3) !important;
      color: #ef4444 !important;
      opacity: 0.6;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td .date-without-data::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background-color: #ef4444;
      border-radius: 50%;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td:hover .date-with-data {
      background-color: rgba(34, 197, 94, 0.3) !important;
      border-color: rgba(34, 197, 94, 0.7) !important;
    }

    ::ng-deep .p-datepicker .p-datepicker-calendar td:hover .date-without-data {
      background-color: rgba(239, 68, 68, 0.2) !important;
      border-color: rgba(239, 68, 68, 0.5) !important;
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
  private dialogService = inject(DialogService);
  private dialogRef?: DynamicDialogRef;

  public selectedBranchId = signal<string>('');
  public selectedDate = signal<Date>(new Date());

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

  // Mapa de fechas que tienen datos (formato: 'yyyy-MM-dd')
  public datesWithData = computed(() => {
    const datesSet = new Set<string>();
    this.allTimelogs().forEach((log) => {
      const logDate = format(new Date(log.created_at), 'yyyy-MM-dd');
      datesSet.add(logDate);
    });
    return datesSet;
  });

  // Verificar si una fecha tiene datos
  public hasDataForDate(date: any): boolean {
    if (!date || !date.day || date.month === undefined || !date.year) {
      return false;
    }
    const dateStr = `${date.year}-${String(date.month + 1).padStart(
      2,
      '0'
    )}-${String(date.day).padStart(2, '0')}`;
    return this.datesWithData().has(dateStr);
  }

  // Verificar si una fecha es futura
  public isFutureDate(date: any): boolean {
    if (!date || !date.day || date.month === undefined || !date.year) {
      return false;
    }
    const dateObj = new Date(date.year, date.month, date.day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj > today;
  }

  // Verificar si una fecha es hoy
  public isToday(date: any): boolean {
    if (!date || !date.day || date.month === undefined || !date.year) {
      return false;
    }
    const dateObj = new Date(date.year, date.month, date.day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj.getTime() === today.getTime();
  }

  // Marcaciones de la fecha seleccionada
  public todayTimelogs = computed(() => {
    const selectedDateStr = format(this.selectedDate(), 'yyyy-MM-dd');
    return this.allTimelogs().filter((log) => {
      const logDate = format(new Date(log.created_at), 'yyyy-MM-dd');
      return logDate === selectedDateStr;
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
    return this.selectedDate();
  }

  public getMaxDate(): Date {
    return new Date();
  }

  public isMaxDate(): boolean {
    const today = new Date();
    const selected = this.selectedDate();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() >= today.getTime();
  }

  public previousDay(): void {
    const newDate = new Date(this.selectedDate());
    newDate.setDate(newDate.getDate() - 1);
    this.selectedDate.set(newDate);
    this.onDateChange(newDate);
  }

  public nextDay(): void {
    if (this.isMaxDate()) return;
    const newDate = new Date(this.selectedDate());
    newDate.setDate(newDate.getDate() + 1);
    this.selectedDate.set(newDate);
    this.onDateChange(newDate);
  }

  public onBranchChange(): void {
    // Recargar datos cuando cambia la sucursal
    this.branchTimelogsApi.reload();
  }

  public onDateChange(date: Date | null): void {
    if (date) {
      this.selectedDate.set(date);
      this.branchTimelogsApi.reload();

      // Esperar un momento para que los datos se actualicen y luego verificar
      setTimeout(() => {
        if (this.todayTimelogs().length === 0) {
          const dateStr = format(date, 'dd/MM/yyyy');
          this.messageService.add({
            severity: 'info',
            summary: 'Sin marcaciones',
            detail: `No se encontraron marcaciones para el ${dateStr}. Puede ser que no hubo actividad en esta sucursal ese día.`,
            life: 5000,
          });
        }
      }, 500);
    }
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

  // Método para obtener el horario activo del empleado para la fecha seleccionada
  public getActiveSchedule(employeeId: string) {
    const selectedDateStr = format(this.selectedDate(), 'yyyy-MM-dd');
    return this.http.get<EmployeeSchedule[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      {
        params: {
          select: '*,schedule:schedules(*),branch:branches(*)',
          employee_id: `eq.${employeeId}`,
          start_date: `lte.${selectedDateStr}`,
          end_date: `gte.${selectedDateStr}`,
          approved: 'eq.true',
          order: 'start_date.desc',
          limit: '1',
        },
      }
    );
  }

  // Método para abrir el modal con el horario
  public openEmployeeScheduleModal(employee: any) {
    this.getActiveSchedule(employee.id).subscribe({
      next: (schedules) => {
        const activeSchedule = schedules?.[0];
        if (!activeSchedule) {
          const dateStr = format(this.selectedDate(), 'dd/MM/yyyy');
          this.messageService.add({
            severity: 'info',
            summary: 'Sin horario',
            detail: `${employee.first_name} ${employee.father_name} no tiene un horario activo para el ${dateStr}.`,
          });
          return;
        }

        // Importar dinámicamente el componente modal
        import('./employee-schedule-modal.component').then((module) => {
          this.dialogRef = this.dialogService.open(
            module.EmployeeScheduleModalComponent,
            {
              header: `Horario de ${employee.first_name} ${employee.father_name}`,
              width: '600px',
              modal: true,
              data: {
                employee,
                schedule: activeSchedule,
              },
              styleClass: 'employee-schedule-modal',
            }
          );
        });
      },
      error: (error) => {
        console.error('Error loading schedule:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el horario del empleado.',
        });
      },
    });
  }
}
