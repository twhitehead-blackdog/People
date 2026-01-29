import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  model,
  signal,
} from '@angular/core';
import { addDays, differenceInMinutes, format, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { trim } from 'lodash';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { utils, writeFile } from 'xlsx';
import {
  colorVariants,
  DayLog,
  Employee,
  EmployeeOvertimeRecord,
  EmployeeScheduleData,
  getScheduleColorInlineStyle as getColorStyle,
  TimeoffData,
} from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { LoggerService } from '../services/logger.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import {
  OvertimeConfirmationDialogComponent,
  OvertimeDialogResult,
} from './timelogs/components/overtime-confirmation-dialog.component';
import { TimelogsFiltersComponent } from './timelogs/components/timelogs-filters.component';
import { TimelogsTableComponent } from './timelogs/components/timelogs-table.component';
import { OvertimeRecordsService } from './timelogs/services/overtime-records.service';
import { TimelogsApiService } from './timelogs/timelogs-api.service';
import {
  formatHours,
  formatLunchExceededTotal,
  getAlertIcon,
  getAlertSeverity,
  getAlertTooltip,
} from './timelogs/utils/alert.utils';
import { matchesEmployeeSearch } from './timelogs/utils/employee-search.utils';
import { calcTimeDiff } from './timelogs/utils/time.utils';

@Component({
  selector: 'pt-timelogs',
  imports: [
    CommonModule,
    Button,
    Card,
    Tag,
    ToastModule,
    TimelogsFiltersComponent,
    TimelogsTableComponent,
    OvertimeConfirmationDialogComponent,
  ],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <p-card>
      <ng-template #title>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-lg sm:text-xl">Marcaciones</h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
              Listado de marcaciones de empleados
            </p>
          </div>
          <div>
            <p-button
              icon="pi pi-file-excel"
              [loading]="loading()"
              (click)="generateReport()"
              severity="success"
              [disabled]="timelogsReport().length === 0"
              label="Exportar Excel"
              rounded
              class="min-h-[44px]"
            />
          </div>
        </div>
      </ng-template>
      <pt-timelogs-filters
        [dateRange]="dateRange"
        [employeeSearchInput]="employeeSearchInput"
        [employeeId]="employeeId"
        [branchId]="branchId"
        [onlyDelayed]="onlyDelayed"
        [onlyErrors]="onlyErrors"
        [onlyEarlyExit]="onlyEarlyExit"
        [onlyLunchExceeded]="onlyLunchExceeded"
        [onlyWithMarcaciones]="onlyWithMarcaciones"
        [lunchExceededRange]="lunchExceededRange"
        [delayRange]="delayRange"
        [delayToleranceMinutes]="delayToleranceMinutes"
        [filtersExpanded]="filtersExpanded"
        [activeEmployeesList]="activeEmployeesList"
        [branchOptions]="branchOptionsList"
        [lunchExceededOptions]="lunchExceededOptions"
        [delayRangeOptions]="delayRangeOptions"
        [hasActiveFilters]="hasActiveFilters"
        [activeFiltersCount]="getActiveFiltersCount"
        (searchRequested)="onEmployeeSearchEnter()"
      ></pt-timelogs-filters>

      <!-- Total Excedido de Almuerzo -->
      @if(selectedEmployee()) {
      <div
        class="mb-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-info-circle text-yellow-400"></i>
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-300"
              >Total Excedido de Almuerzo -
              {{ selectedEmployee()?.first_name }}
              {{ selectedEmployee()?.father_name }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            @if(totalLunchExceededMinutes() > 0) {
            <p-tag
              severity="warn"
              [value]="formatLunchExceededTotal(totalLunchExceededMinutes())"
              icon="pi pi-clock"
              styleClass="text-xs"
            />
            } @else {
            <span class="text-sm text-gray-400">0 minutos</span>
            }
          </div>
        </div>
      </div>
      }

      <!-- Total de Retrasos -->
      @if(selectedEmployee()) {
      <div
        class="mb-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-info-circle text-red-400"></i>
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-300"
              >Total de Retrasos - {{ selectedEmployee()?.first_name }}
              {{ selectedEmployee()?.father_name }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            @if(totalDelayMinutes() > 0) {
            <p-tag
              severity="danger"
              [value]="formatLunchExceededTotal(totalDelayMinutes())"
              icon="pi pi-clock"
              styleClass="text-xs"
            />
            } @else {
            <span class="text-sm text-gray-400">0 minutos</span>
            }
          </div>
        </div>
      </div>
      } @if (hasError()) {
      <!-- Error handling, toast will be shown -->
      }
      <pt-timelogs-table
        [logs]="filteredDaylogs"
        [isLoading]="logs.isLoading()"
        [delayToleranceMinutes]="delayToleranceMinutes"
        [employeeId]="employeeId"
        [maxEmployeeTagWidth]="maxEmployeeTagWidth()"
        [maxScheduleBadgeWidth]="maxScheduleBadgeWidth()"
        [maxDelayTagWidth]="maxDelayTagWidth()"
        [maxLunchTagWidth]="maxLunchTagWidth()"
        [maxExitTagWidth]="maxExitTagWidth()"
        [maxHoursTagWidth]="maxHoursTagWidth()"
        [isAdmin]="store.isAdmin()"
        (overtimeAction)="onOvertimeAction($event)"
      ></pt-timelogs-table>
    </p-card>

    <!-- Overtime Confirmation Dialog -->
    <pt-overtime-confirmation-dialog
      [visible]="overtimeDialogVisible()"
      [log]="selectedOvertimeLog()"
      [existingRecord]="selectedOvertimeRecord()"
      [isLoading]="overtimeLoading()"
      (visibleChange)="overtimeDialogVisible.set($event)"
      (result)="onOvertimeDialogResult($event)"
    />
  </div>`,
  styles: `
    ::ng-deep .p-tag .p-tag-icon {
      margin-right: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsComponent {
  // Zona horaria de Panamá para todas las conversiones de fechas
  private readonly TIMEZONE = 'America/Panama';

  // Calcular el ancho máximo para los tags de alertas en columna Empleado
  public maxEmployeeTagWidth = computed(() => {
    const possibleTags = [
      'Error de Horario',
      'Día Libre',
      'Feriado',
      'Sin Horario',
    ];
    const maxLength = Math.max(...possibleTags.map((tag) => tag.length));
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });

  // Calcular el ancho máximo para los badges de horario
  public maxScheduleBadgeWidth = computed(() => {
    const schedules = this.schedules.value() || [];
    const scheduleNames = schedules.map(
      (s) => s.schedule?.name || 'Sin horario'
    );
    const maxLength = Math.max(
      ...scheduleNames.map((name: string) => name.length),
      'Sin horario'.length
    );
    // Badge tiene padding px-2 py-1, así que necesitamos más espacio
    const calculatedWidth = Math.max(120, maxLength * 8 + 32);
    return `${calculatedWidth}px`;
  });

  // Calcular el ancho máximo para los tags de retraso en columna Entrada
  public maxDelayTagWidth = computed(() => {
    // "Retraso de 999 min" es el caso máximo (número de 3 dígitos)
    const maxLength = 'Retraso de 999 min'.length;
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });

  // Calcular el ancho máximo para los tags de almuerzo en columna Fin de almuerzo
  public maxLunchTagWidth = computed(() => {
    const maxLength = 'Almuerzo 999 min'.length;
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });

  // Calcular el ancho máximo para los tags de salida en columna Salida
  public maxExitTagWidth = computed(() => {
    const maxLength = 'Salida temprana'.length;
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });

  // Calcular el ancho máximo para los tags de horas en columna Horas Trabajadas
  public maxHoursTagWidth = computed(() => {
    const maxLength = 'Menos de 8h'.length;
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });
  public employees = inject(EmployeesStore);
  public dateRange = signal<Date[]>([startOfMonth(new Date()), new Date()]);
  public employeeId = model<string>();
  public branchId = model<string>();
  public employeeSearch = model<string>(''); // Valor de búsqueda real (se actualiza con Enter)
  public employeeSearchInput = signal<string>(''); // Valor temporal del input
  public store = inject(DashboardStore);
  public onlyDelayed = signal(false);
  public organizationService = inject(OrganizationService);
  private logger = inject(LoggerService);
  private apiUrl = inject(ApiUrlService);
  private injector = inject(Injector);
  public timelogsApiService = inject(TimelogsApiService);

  // Helper robusto para parsear fechas de logs
  private parseLogDate(log: any): Date {
    // 1. Priorizar punched_at sobre created_at
    const rawDate = log.punched_at || log.created_at;

    // 2. Crear fecha
    const date = new Date(rawDate);

    // 3. Validar fecha
    if (isNaN(date.getTime())) {
      this.logger.warn('[TimelogsComponent] Fecha inválida encontrada:', log);
      return new Date(); // Fallback a hoy para evitar crash, pero loggeado
    }

    // 4. Validación de año (sanidad)
    if (date.getFullYear() < 2020) {
      this.logger.warn('[TimelogsComponent] Fecha sospechosa (año < 2020):', {
        id: log.id,
        date: rawDate,
        parsed: date,
      });
    }

    return date;
  }

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Helper para agregar filtro de company_id a los parámetros
  private addCompanyFilter(
    params: Record<string, string>,
    tableName: string
  ): Record<string, string> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      return params;
    }

    // Tablas que tienen company_id y deben filtrarse
    const tablesWithCompanyId = [
      'employees',
      'branches',
      'departments',
      'positions',
      'schedules',
      'employee_schedules',
      'attendance_sheets',
      'timelogs',
    ];

    if (tablesWithCompanyId.includes(tableName)) {
      return {
        ...params,
        company_id: `eq.${companyId}`,
      };
    }

    return params;
  }

  // Helper computed para normalizar el rango de fechas
  // Si solo hay una fecha, usar esa misma fecha como inicio y fin
  // Valida que el rango no exceda 1 año (365 días)
  public normalizedDateRange = computed(() => {
    const range = this.dateRange();
    if (!range || range.length === 0) {
      return { start: null, end: null };
    }
    const start = range[0];
    const end = range[1] || range[0]; // Si no hay segunda fecha, usar la primera

    // Validar que el rango no exceda 1 año (365 días)
    if (start && end) {
      const daysDifference = differenceInMinutes(end, start) / (60 * 24);
      if (daysDifference > 365) {
        this.logger.warn(
          '[TimelogsComponent] Rango de fechas excede 1 año:',
          daysDifference,
          'días'
        );
        this.message.add({
          severity: 'warn',
          summary: 'Rango de fechas muy amplio',
          detail:
            'El rango de fechas seleccionado excede 1 año (365 días). Por favor, seleccione un rango más corto para mejorar el rendimiento.',
        });
        // Limitar el rango a 365 días desde la fecha de inicio
        const limitedEnd = addDays(start, 365);
        return { start, end: limitedEnd };
      }
    }

    return { start, end };
  });

  public onlyErrors = signal(false);
  public onlyEarlyExit = signal(false);
  public onlyLunchExceeded = signal(false);
  public lunchExceededRange = signal<string | null>(null);
  public onlyWithMarcaciones = signal(false); // Desactivar por defecto para mostrar todos los días
  public delayToleranceMinutes = signal(5); // Tolerancia por defecto de 5 minutos
  public delayRange = signal<string | null>(null);
  public filtersExpanded = signal(false);

  // Computed para verificar si hay filtros activos
  public hasActiveFilters = computed(() => {
    return (
      this.onlyDelayed() ||
      this.onlyErrors() ||
      this.onlyEarlyExit() ||
      this.onlyLunchExceeded() ||
      this.onlyWithMarcaciones() ||
      !!this.employeeId() ||
      !!this.branchId() ||
      !!this.employeeSearch() ||
      (this.dateRange() && this.dateRange().length > 0)
    );
  });

  public getActiveFiltersCount = computed(() => {
    let count = 0;
    if (this.onlyDelayed()) count++;
    if (this.onlyErrors()) count++;
    if (this.onlyEarlyExit()) count++;
    if (this.onlyLunchExceeded()) count++;
    if (this.onlyWithMarcaciones()) count++;
    if (this.employeeId()) count++;
    if (this.branchId()) count++;
    if (this.employeeSearch()) count++;
    if (this.dateRange() && this.dateRange().length > 0) count++;
    return count;
  });

  // Opciones para el filtro de almuerzo excedido
  public lunchExceededOptions = [
    { label: '1-5 minutos excedidos', value: '1-5' },
    { label: '5-10 minutos excedidos', value: '5-10' },
    { label: '10 o más minutos excedidos', value: '10+' },
  ];

  // Opciones para el filtro de rango de retrasos
  public delayRangeOptions = [
    { label: '1-5 min', value: '1-5' },
    { label: '5-10 min', value: '5-10' },
    { label: '10+ min', value: '10+' },
  ];

  // IDs de tipos de permisos/feriados que NO deberían tener marcaciones
  private readonly restrictedTimeOffTypeIds = [
    'c01dff8f-ce0d-498f-a473-46418576e589',
    '4983c002-7c5d-4440-a4f2-52f61acdd67a',
    '3d07f626-d58f-4203-bac5-f6e35557e0ad',
    'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf',
    'e7e63bb4-ca86-4091-85fa-c4da16545b49',
    'f2d92995-96a0-414f-b64a-9823db776745',
  ];

  // IDs de schedules que son permisos/feriados y NO deberían tener marcaciones
  private readonly restrictedScheduleIds = [
    '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
    '4983c002-7c5d-4440-a4f2-52f61acdd67a', // Incapacidad
    'c01dff8f-ce0d-498f-a473-46418576e589', // Dia Libre
    'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf', // Licencia maternidad
    'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
    'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
    '37707c00-8f6f-4065-9975-b3ef37fe98d7', // Licencia de maternidad
  ];

  // Nombres de schedules que indican permisos/feriados (sin importar mayúsculas)
  private readonly restrictedScheduleNames = [
    'feriado',
    'dia libre',
    'día libre',
    'vacaciones',
    'licencia',
    'incapacidad',
    'compensatorio',
    'maternidad',
    'paternidad',
  ];

  // Computed para obtener solo empleados activos
  public activeEmployeesList = computed(() =>
    this.employees.employeesList().filter((emp) => emp.is_active)
  );
  public branchOptionsList = computed(() => this.store.branches.entities());

  public loading = signal(false);
  private message = inject(MessageService);
  public colorVariants = colorVariants;
  public formatHours = formatHours;
  public formatLunchExceededTotal = formatLunchExceededTotal;
  public getAlertSeverity = getAlertSeverity;
  public getAlertIcon = getAlertIcon;
  public getAlertTooltip = getAlertTooltip;

  // Método para actualizar la búsqueda cuando se presiona Enter
  public onEmployeeSearchEnter = (): void => {
    this.employeeSearch.set(this.employeeSearchInput());
  };

  // Computed mejorado para encontrar el empleado seleccionado
  // Busca por employeeId si existe, o por employeeSearch si solo hay un resultado único
  public selectedEmployee = computed(() => {
    // Si hay un employeeId seleccionado, usarlo
    if (this.employeeId()) {
      return this.employees
        .employeesList()
        .find((x) => x.id === this.employeeId());
    }

    // Si hay búsqueda de texto, buscar empleados que coincidan
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
    if (searchTerm) {
      const matchingEmployees = this.employees.employeesList().filter((emp) => {
        return matchesEmployeeSearch(emp, searchTerm);
      });

      // Solo retornar si hay exactamente un empleado que coincida
      if (matchingEmployees.length === 1) {
        return matchingEmployees[0];
      }
    }

    return null;
  });

  // Computed para obtener el tiempo total excedido del empleado seleccionado
  public selectedEmployeeLunchExceeded = computed(() => {
    const employee = this.selectedEmployee();
    if (!employee) {
      return null;
    }
    return employee.total_lunch_exceeded_minutes ?? null;
  });

  // Computed para calcular el total de minutos excedidos de almuerzo en el rango seleccionado
  public totalLunchExceededMinutes = computed(() => {
    const logs = this.filteredDaylogs();
    const { start: startDate, end: endDate } = this.normalizedDateRange();

    if (!startDate || !endDate) {
      return 0;
    }

    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    const dateRangeEnd = format(normalizedEnd, 'yyyy-MM-dd');

    return logs
      .filter((log: DayLog) => {
        const dayStr = log.day || '';
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      })
      .reduce((total: number, log: DayLog) => {
        if (log.lunchExceeded && log.lunchMinutes && log.lunchMinutes > 60) {
          return total + (log.lunchMinutes - 60);
        }
        return total;
      }, 0);
  });

  // Computed para calcular el total de minutos de retraso en el rango seleccionado
  public totalDelayMinutes = computed(() => {
    const logs = this.filteredDaylogs();
    const { start: startDate, end: endDate } = this.normalizedDateRange();

    if (!startDate || !endDate) {
      return 0;
    }

    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    const dateRangeEnd = format(normalizedEnd, 'yyyy-MM-dd');

    return logs
      .filter((log: DayLog) => {
        const dayStr = log.day || '';
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      })
      .reduce((total: number, log: DayLog) => {
        if (log.delay && typeof log.delay === 'number') {
          return total + log.delay;
        }
        return total;
      }, 0);
  });

  days = computed(() => {
    const { start: startDate, end: endDate } = this.normalizedDateRange();

    if (!startDate || !endDate) {
      return [];
    }

    // Normalizar las fechas para asegurar que empezamos desde el inicio del día
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);

    const days = [];
    let currentDate = new Date(normalizedStart);

    while (currentDate <= normalizedEnd) {
      days.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }

    // Asegurar que las fechas están ordenadas
    return days.sort();
  });

  public schedules = httpResource<EmployeeScheduleData[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }

    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const select = `*,approved,schedule:schedules(*),employee:employees(id,company_id)`;

    const params: Record<string, string> = {
      select: select,
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
    };

    // Filtrar a través de employees.company_id (funciona incluso si employee_schedules no tiene company_id)
    if (companyId) {
      params['employee.company_id'] = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/employee_schedules', params);

    return {
      url,
      method: 'GET',
    };
  });

  public timeoffs = httpResource<TimeoffData[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      return undefined;
    }

    const url = this.apiUrl.build('rest/v1/timeoffs', {
      select:
        'id,type_id,employee_id,date_from,date_to,is_approved,company_id,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(company_id)',
      date_from: `lte.${format(end, 'yyyy-MM-dd')}`,
      date_to: `gte.${format(start, 'yyyy-MM-dd')}`,
      is_approved: 'eq.true',
      company_id: `eq.${companyId}`,
    });

    return {
      url,
      method: 'GET' as const,
    };
  });

  // Consulta para timelogs antes o hasta el 22 de diciembre
  public logsBefore22 = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }

    const { beforeRange } = this.timelogsApiService.splitDateRange({
      start,
      end,
    });

    if (!beforeRange) {
      return undefined;
    }

    return this.timelogsApiService.buildLogsRequest(
      beforeRange.start,
      beforeRange.end,
      this.employeeId()
    );
  });

  // Consulta para timelogs después del 22 de diciembre
  public logsAfter22 = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }

    const { afterRange } = this.timelogsApiService.splitDateRange({
      start,
      end,
    });

    if (!afterRange) {
      return undefined;
    }

    return this.timelogsApiService.buildLogsRequest(
      afterRange.start,
      afterRange.end,
      this.employeeId()
    );
  });

  // Computed que combina ambos resultados manteniendo la API de httpResource
  private _logsComputed = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return {
        value: () => [],
        isLoading: () => false,
        error: () => undefined,
      };
    }

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const cutoffStr = '2025-12-22';

    const before22Data = this.logsBefore22.value() ?? [];
    const after22Data = this.logsAfter22.value() ?? [];

    // Si el rango completo está antes o hasta el 22, usar solo logsBefore22
    if (endStr <= cutoffStr) {
      return {
        value: () => before22Data,
        isLoading: () => this.logsBefore22.isLoading(),
        error: () => this.logsBefore22.error(),
      };
    }

    // Si el rango completo está después del 22, usar solo logsAfter22
    if (startStr > cutoffStr) {
      return {
        value: () => after22Data,
        isLoading: () => this.logsAfter22.isLoading(),
        error: () => this.logsAfter22.error(),
      };
    }

    // Si el rango cruza el 22, combinar ambos
    const combined = [...before22Data, ...after22Data];

    return {
      value: () => combined,
      isLoading: () =>
        this.logsBefore22.isLoading() || this.logsAfter22.isLoading(),
      error: () => this.logsBefore22.error() || this.logsAfter22.error(),
    };
  });

  // Proxy para mantener la API de httpResource
  public logs = {
    value: (): any[] => {
      return this._logsComputed().value();
    },
    isLoading: (): boolean => {
      return this._logsComputed().isLoading();
    },
    error: (): any => {
      return this._logsComputed().error();
    },
  } as any;

  // Helper para obtener mensaje de error específico según el tipo
  private getErrorMessage(error: any): { summary: string; detail: string } {
    if (!error) {
      return {
        summary: 'Error desconocido',
        detail: 'Ocurrió un error inesperado',
      };
    }

    // Error de red (sin conexión, timeout, etc.)
    if (
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('timeout')
    ) {
      return {
        summary: 'Error de conexión',
        detail:
          'No se pudo conectar con el servidor. Verifique su conexión a internet e intente nuevamente.',
      };
    }

    // Error de autenticación (401)
    if (error.status === 401 || error.status === 403) {
      return {
        summary: 'Error de autenticación',
        detail:
          'Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.',
      };
    }

    // Error del servidor (500, 502, 503, etc.)
    if (error.status >= 500) {
      return {
        summary: 'Error del servidor',
        detail:
          'El servidor está experimentando problemas. Por favor, intente más tarde o contacte al administrador.',
      };
    }

    // Error de cliente (400, 404, etc.)
    if (error.status >= 400 && error.status < 500) {
      return {
        summary: 'Error en la solicitud',
        detail:
          'La solicitud no pudo ser procesada. Verifique los filtros seleccionados e intente nuevamente.',
      };
    }

    // Error genérico
    return {
      summary: 'Error al cargar datos',
      detail:
        'No se pudieron cargar las marcaciones. Por favor, intente nuevamente.',
    };
  }

  // Computed para detectar errores en las peticiones HTTP
  public hasError = computed(() => {
    const logsError = this._logsComputed().error();
    const schedulesError = this.schedules.error();
    const timeoffsError = this.timeoffs.error();

    if (logsError || schedulesError || timeoffsError) {
      // Determinar qué recurso falló
      const primaryError = logsError || schedulesError || timeoffsError;
      const errorMessage = this.getErrorMessage(primaryError);

      this.logger.error('[TimelogsComponent] ❌ Error cargando datos:', {
        logs: logsError,
        schedules: schedulesError,
        timeoffs: timeoffsError,
        primaryError,
      });

      // Solo mostrar el mensaje una vez (evitar duplicados)
      if (!this._errorShown) {
        this.message.add({
          severity: 'error',
          summary: errorMessage.summary,
          detail: errorMessage.detail,
        });
        this._errorShown = true;
        // Resetear el flag después de un tiempo para permitir mostrar errores futuros
        setTimeout(() => {
          this._errorShown = false;
        }, 5000);
      }

      return true;
    }
    this._errorShown = false;
    return false;
  });

  private _errorShown = false;

  constructor() {
    // Effect para manejar errores
    effect(
      () => {
        const logsError = this.logs.error();
        const schedulesError = this.schedules.error();
        const timeoffsError = this.timeoffs.error();

        if (logsError) {
          this.logger.error(
            '[TimelogsComponent] ❌ Error cargando timelogs:',
            logsError
          );
        }
        if (schedulesError) {
          this.logger.error(
            '[TimelogsComponent] ❌ Error cargando employee_schedules:',
            schedulesError
          );
        }
        if (timeoffsError) {
          this.logger.error(
            '[TimelogsComponent] ❌ Error cargando timeoffs:',
            timeoffsError
          );
        }

        const logsData = this.logs.value();
        if (logsData && logsData.length === 0 && !logsError) {
          this.logger.warn(
            '[TimelogsComponent] ⚠️ No se encontraron timelogs',
            {
              company_id: this.organizationService.getCurrentCompanyId(),
              dateRange: this.dateRange(),
              employeeId: this.employeeId() || 'Todos',
            }
          );
        } else if (!logsError) {
          this.logger.warn('[TimelogsComponent] ⚠️ No se encontraron timelogs');
          this.logger.warn(
            '  - Verificar que existan timelogs en la base de datos para:'
          );
          this.logger.warn(
            '    * Company ID:',
            this.organizationService.getCurrentCompanyId()
          );
          this.logger.warn('    * Rango de fechas:', this.dateRange());
          this.logger.warn('    * Employee ID:', this.employeeId() || 'Todos');
        }
      },
      { injector: this.injector }
    );
  }

  public queryParams = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return {};
    }
    const params: {
      select: string;
      created_at: string;
      employee_id?: string;
    } = {
      // Usar !timelogs_employee_id_fkey para especificar la relación correcta (hay dos FKs a employees)
      select: `*,employee:employees!timelogs_employee_id_fkey(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`,
      created_at: `gte.${format(start, 'yyyy-MM-dd 00:00:00')}`,
    };
    if (this.employeeId()) {
      params['employee_id'] = `eq.${this.employeeId()}`;
    }
    return params;
  });

  public dayLogs = computed(() => {
    // Obtener el rango de fechas para filtrar (usa normalizedDateRange para manejar fecha única)
    const { start: startDate, end: endDate } = this.normalizedDateRange();

    if (!startDate || !endDate) {
      this.logger.debug(
        '[TimelogsComponent] ⚠️ dayLogs: No hay rango de fechas'
      );
      return [];
    }

    // Normalizar fechas al inicio del día para comparaciones precisas
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    const dateRangeEnd = format(normalizedEnd, 'yyyy-MM-dd');

    // Obtener valores una sola vez para evitar múltiples accesos
    const logsData = this.logs.value() ?? [];
    const schedulesData = this.schedules.value() ?? [];
    const timeoffsData = this.timeoffs.value() ?? [];
    const daysList = this.days();

    // Validar que daysList esté completo y ordenado
    if (
      daysList.length === 0 ||
      daysList[0] !== dateRangeStart ||
      daysList[daysList.length - 1] !== dateRangeEnd
    ) {
      // Si hay inconsistencias, regenerar daysList
      const regeneratedDays: string[] = [];
      let currentDate = new Date(normalizedStart);
      while (currentDate <= normalizedEnd) {
        regeneratedDays.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate = addDays(currentDate, 1);
      }
      daysList.length = 0;
      daysList.push(...regeneratedDays);
    }

    // Primero obtener todos los logs filtrados
    const filteredLogs = logsData
      .filter((x: any) =>
        this.branchId() ? x.branch_id === this.branchId() : true
      )
      .map((x: any) => {
        // Usar helper para obtener la fecha correcta (prioriza punched_at)
        const logDate = this.parseLogDate(x);

        // Usar formatInTimeZone para obtener el bucket del día correcto en Panamá
        const dayStr = formatInTimeZone(logDate, this.TIMEZONE, 'yyyy-MM-dd');

        return { ...x, day: dayStr };
      })
      // Filtrar logs que estén dentro del rango seleccionado (solo fechas válidas)
      .filter((x: any) => {
        const logDay = x.day;
        const dentroRango =
          logDay >= dateRangeStart &&
          logDay <= dateRangeEnd &&
          logDay !== format(new Date('1900-01-01'), 'yyyy-MM-dd');

        return dentroRango;
      });

    // Obtener empleados únicos que tienen logs en el rango o que están activos
    const uniqueEmployees = new Map<string, Partial<Employee>>();

    // Si hay búsqueda por nombre, incluir empleados que coincidan incluso si no tienen timelogs
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
    if (searchTerm) {
      this.employees.employeesList().forEach((emp) => {
        if (!emp.is_active) return;

        if (
          matchesEmployeeSearch(emp, searchTerm) &&
          !uniqueEmployees.has(emp.id)
        ) {
          uniqueEmployees.set(emp.id, emp);
        }
      });
    }

    // Primero agregar empleados que tienen logs, pero usar datos completos de employeesList
    filteredLogs.forEach((log: any) => {
      if (log.employee?.id && !uniqueEmployees.has(log.employee.id)) {
        // Buscar el empleado completo en employeesList
        const fullEmployee = this.employees
          .employeesList()
          .find((emp) => emp.id === log.employee.id);

        // Ya sabemos que tienen logs en esta sucursal (porque vienen de filteredLogs)
        if (fullEmployee || log.employee) {
          uniqueEmployees.set(log.employee.id, fullEmployee || log.employee);
        }
      }
    });

    // También agregar empleados activos seleccionados si hay filtro por empleado
    if (this.employeeId()) {
      const selectedEmployee = this.employees
        .employeesList()
        .find((emp) => emp.id === this.employeeId());
      if (selectedEmployee && !uniqueEmployees.has(selectedEmployee.id)) {
        uniqueEmployees.set(selectedEmployee.id, selectedEmployee);
      }
    }

    // Si no hay búsqueda y onlyWithMarcaciones es false, mostrar empleados de la sucursal seleccionada
    // para poder ver quiénes NO han marcado (Missing)
    if (!searchTerm && !this.onlyWithMarcaciones()) {
      this.employees.employeesList().forEach((emp) => {
        if (emp.is_active) {
          // Si hay filtro de sucursal, solo añadir los que pertenecen a ella
          if (this.branchId()) {
            if (emp.branch_id === this.branchId()) {
              if (!uniqueEmployees.has(emp.id)) {
                uniqueEmployees.set(emp.id, emp);
              }
            }
          } else {
            // Si no hay filtro de sucursal y uniqueEmployees está vacío (no hay marcaciones),
            // mostrar a todos los activos (comportamiento original)
            if (uniqueEmployees.size === 0 && !uniqueEmployees.has(emp.id)) {
              uniqueEmployees.set(emp.id, emp);
            }
          }
        }
      });
    }

    // Crear estructura inicial: TODOS los días del rango para TODOS los empleados
    const acc: DayLog[] = [];

    // Para cada empleado, crear registros para TODOS los días del rango en orden
    uniqueEmployees.forEach((employee) => {
      daysList.forEach((day) => {
        // Asegurarse de que el día esté dentro del rango (validación adicional)
        if (day < dateRangeStart || day > dateRangeEnd) {
          return;
        }

        // Buscar schedule que corresponda a este día, considerando el día de la semana
        const dayDate = new Date(day + 'T00:00:00');
        const dayOfWeek = dayDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

        // Buscar schedules que coincidan con el rango de fechas
        const matchingSchedules = schedulesData.filter(
          (schedule) =>
            schedule.employee_id === employee.id &&
            schedule.start_date <= day &&
            schedule.end_date >= day
        );

        // Si hay múltiples schedules, intentar encontrar el más específico
        // Priorizar schedules que no sean "Dia Libre" o "Feriado" para días laborales
        let schedule = matchingSchedules[0]; // Por defecto, el primero

        if (matchingSchedules.length > 1) {
          // Para días laborales (Lunes-Viernes = 1-5), priorizar schedules que NO sean día libre
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const workSchedule = matchingSchedules.find(
              (s) =>
                s.schedule &&
                !s.schedule.day_off &&
                !this.restrictedScheduleIds.includes(s.schedule.id || '') &&
                !this.restrictedScheduleNames.some((name) =>
                  s.schedule?.name?.toLowerCase().includes(name)
                )
            );
            if (workSchedule) {
              schedule = workSchedule;
            }
          }
          // Para sábado (6), buscar "Dia Libre"
          else if (dayOfWeek === 6) {
            const dayOffSchedule = matchingSchedules.find(
              (s) =>
                s.schedule?.day_off ||
                this.restrictedScheduleNames.some(
                  (name) =>
                    s.schedule?.name?.toLowerCase().includes('dia libre') ||
                    s.schedule?.name?.toLowerCase().includes('día libre')
                )
            );
            if (dayOffSchedule) {
              schedule = dayOffSchedule;
            }
          }
          // Para domingo (0), buscar "Feriado"
          else if (dayOfWeek === 0) {
            const holidaySchedule = matchingSchedules.find(
              (s) =>
                this.restrictedScheduleIds.includes(s.schedule?.id || '') ||
                this.restrictedScheduleNames.some((name) =>
                  s.schedule?.name?.toLowerCase().includes('feriado')
                )
            );
            if (holidaySchedule) {
              schedule = holidaySchedule;
            }
          }
        } else if (matchingSchedules.length === 1) {
          schedule = matchingSchedules[0];
        }

        acc.push({
          employee,
          day,
          schedule,
          delay: undefined,
          alert: undefined,
          scheduleError: false,
          lunchExceeded: false,
          lunchMinutes: undefined,
          earlyExit: false,
          insufficientHours: false,
          totalHours: undefined,
          overtimeHours: undefined,
          entry: undefined,
          lunch_start: undefined,
          lunch_end: undefined,
          exit: undefined,
        });
      });
    });

    // Ahora procesar los logs para actualizar los registros creados
    const result = (filteredLogs as any[])
      .reduce<DayLog[]>((acc: DayLog[], x: any) => {
        // Solo procesar si el día está dentro del rango
        if (x.day < dateRangeStart || x.day > dateRangeEnd) {
          return acc;
        }

        // Validar que el log tenga employee (puede ser null en datos legacy)
        if (!x.employee?.id) {
          return acc;
        }

        const index = acc.findIndex(
          (y: DayLog) => y.day === x.day && y.employee?.id === x.employee.id
        );

        // Si no se encuentra el índice, significa que el día no está en this.days()
        // Esto no debería pasar si el query filtra correctamente, pero por seguridad lo validamos
        if (index === -1) {
          return acc;
        }

        // Usar helper robusto para determinar la fecha efectiva
        // Esto corrige problemas de backfilling y parseo
        const effectiveDate = this.parseLogDate(x);

        acc[index] = {
          ...acc[index],
          [x.type]: {
            date: effectiveDate, // Usar la fecha parseada y validada
            branch: x.branch,
            id: x.id,
          },
        };

        // Detectar alertas cuando hay marcación
        const dayDate = new Date(acc[index].day); // Esto usa el string YYYY-MM-DD del bucket

        const dayStr = formatInTimeZone(dayDate, this.TIMEZONE, 'yyyy-MM-dd');
        const timeoffForDay = timeoffsData.find((timeoff) => {
          if (timeoff.employee_id !== acc[index].employee.id) return false;
          const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
          const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
          return dayStr >= fromStr && dayStr <= toStr;
        });
        const hasTimeOff = !!timeoffForDay;
        // El type_id puede estar directamente o anidado en type (según el query)
        const timeoffTypeId = timeoffForDay?.type_id || timeoffForDay?.type?.id;
        const hasRestrictedTimeOff =
          hasTimeOff &&
          timeoffForDay &&
          timeoffTypeId &&
          this.restrictedTimeOffTypeIds.includes(timeoffTypeId);

        // Verificar si hay marcación para mostrar alertas
        const hasMark =
          acc[index].entry || acc[index].lunch_start || acc[index].exit;

        // Verificar si el schedule es feriado o día libre
        const scheduleId = acc[index].schedule?.schedule?.id;
        const scheduleName =
          acc[index].schedule?.schedule?.name?.toLowerCase() || '';
        const isRestrictedScheduleId =
          scheduleId && this.restrictedScheduleIds.includes(scheduleId);
        const isRestrictedScheduleName = this.restrictedScheduleNames.some(
          (name) => scheduleName.includes(name)
        );
        const isScheduleFeriado =
          isRestrictedScheduleId ||
          isRestrictedScheduleName ||
          acc[index].schedule?.schedule?.day_off;

        // SIEMPRE marcar como error si hay timeoff y marcaciones (no hay horario válido)
        if (hasTimeOff && hasMark) {
          acc[index].alert = 'Feriado';
          acc[index].scheduleError = true; // Error crítico: marcó en día de feriado/permiso (no hay horario válido)
        }

        // Marcar como "Feriado" incluso si no hay marcaciones (para que se muestre en la tabla)
        if (hasTimeOff && !hasMark) {
          acc[index].alert = 'Feriado';
          // No es un error si no hay marcaciones, solo información
          acc[index].scheduleError = false;
        }

        // SIEMPRE marcar como error si el schedule es feriado/día libre y hay marcaciones
        if (isScheduleFeriado && hasMark) {
          acc[index].alert = acc[index].schedule?.schedule?.day_off
            ? 'Día Libre'
            : 'Feriado';
          acc[index].scheduleError = true; // Error crítico: marcó en día feriado/libre (no debería tener marcaciones)
        }

        // Marcar como "Día Libre" o "Feriado" incluso si no hay marcaciones (para que se muestre en la tabla)
        if (isScheduleFeriado && !hasMark) {
          acc[index].alert = acc[index].schedule?.schedule?.day_off
            ? 'Día Libre'
            : 'Feriado';
          // No es un error si no hay marcaciones, solo información
          acc[index].scheduleError = false;
        }

        if (hasMark) {
          // Prioridad: Feriado > Día Libre > Sin Horario
          if (hasTimeOff) {
            // Ya se marcó arriba, solo asegurar que esté marcado
            if (!acc[index].scheduleError) {
              acc[index].scheduleError = true;
            }
          } else if (acc[index].schedule?.schedule) {
            if (acc[index].schedule.schedule.day_off || isScheduleFeriado) {
              // Si es día libre o feriado pero el empleado marcó, es un error de configuración
              acc[index].delay = 'DIA LIBRE';
              acc[index].alert = acc[index].schedule.schedule.day_off
                ? 'Día Libre'
                : 'Feriado';
              acc[index].scheduleError = true; // Error: marcó en día libre/feriado
            } else {
              // Calcular retraso si hay entrada
              if (acc[index].entry) {
                const entryTime = formatInTimeZone(
                  acc[index].entry.date,
                  this.TIMEZONE,
                  'HH:mm:ss'
                );
                const scheduleTime = acc[index].schedule.schedule.entry_time;
                if (scheduleTime) {
                  const scheduleTimeStr =
                    typeof scheduleTime === 'string'
                      ? scheduleTime
                      : format(new Date(scheduleTime), 'HH:mm:ss');
                  const delayTotal = calcTimeDiff(entryTime, scheduleTimeStr);

                  // Aplicar tolerancia: solo contar el exceso sobre la tolerancia
                  const tolerance = this.delayToleranceMinutes();
                  if (delayTotal > tolerance) {
                    // Solo guardar el exceso sobre la tolerancia
                    acc[index].delay = delayTotal - tolerance;
                  } else {
                    // Si está dentro de la tolerancia, no es retraso
                    acc[index].delay = undefined;
                  }
                }
              }
            }
          } else {
            // Sin horario establecido
            acc[index].alert = 'Sin Horario';
          }

          // Validar tiempo de almuerzo (no debe exceder 60 minutos)
          if (acc[index].lunch_start && acc[index].lunch_end) {
            const lunchMinutes = differenceInMinutes(
              acc[index].lunch_end.date,
              acc[index].lunch_start.date
            );
            acc[index].lunchMinutes = lunchMinutes;
            if (lunchMinutes > 60) {
              acc[index].lunchExceeded = true;
            }
          }

          // Validar salida temprana
          if (
            acc[index].schedule?.schedule &&
            acc[index].exit &&
            !acc[index].schedule.schedule.day_off
          ) {
            const exitTime = formatInTimeZone(
              acc[index].exit.date,
              this.TIMEZONE,
              'HH:mm:ss'
            );
            const scheduleExitTime = acc[index].schedule.schedule.exit_time;
            if (scheduleExitTime) {
              // Convertir scheduleExitTime a string si es Date
              const scheduleTimeStr =
                typeof scheduleExitTime === 'string'
                  ? scheduleExitTime
                  : format(new Date(scheduleExitTime), 'HH:mm:ss');

              const exitParts = exitTime.split(':');
              const scheduleParts = scheduleTimeStr.split(':');

              const exitMinutes = +exitParts[0] * 60 + +exitParts[1];
              const scheduleMinutes =
                +scheduleParts[0] * 60 + +scheduleParts[1];

              if (exitMinutes < scheduleMinutes) {
                acc[index].earlyExit = true;
              }
            }
          }

          // Validar horas trabajadas (8 horas de trabajo, sin contar almuerzo)
          // Se calcula desde la ENTRADA REAL, no desde la hora del horario
          if (
            acc[index].entry &&
            acc[index].exit &&
            acc[index].schedule?.schedule &&
            !acc[index].schedule.schedule.day_off
          ) {
            const scheduleEntryTime = acc[index].schedule.schedule.entry_time;
            const scheduleExitTime = acc[index].schedule.schedule.exit_time;

            if (scheduleEntryTime && scheduleExitTime) {
              // Usar ENTRADA REAL, no la hora del horario
              const entryDate = new Date(acc[index].entry.date);
              const exitDate = new Date(acc[index].exit.date);

              // Validar que las fechas sean válidas
              if (
                isNaN(entryDate.getTime()) ||
                isNaN(exitDate.getTime()) ||
                exitDate <= entryDate
              ) {
                this.logger.warn(
                  '[TimelogsComponent] Fechas inválidas o salida anterior a entrada',
                  {
                    day: acc[index].day,
                    entry: acc[index].entry.date,
                    exit: acc[index].exit.date,
                    entryDateUTC: entryDate.toISOString(),
                    exitDateUTC: exitDate.toISOString(),
                    employee: `${acc[index].employee?.first_name} ${acc[index].employee?.father_name}`,
                    employee_id: acc[index].employee?.id,
                    diferencia_segundos:
                      exitDate <= entryDate
                        ? (exitDate.getTime() - entryDate.getTime()) / 1000
                        : null,
                  }
                );
                acc[index].totalHours = 0;
                acc[index].overtimeHours = 0;
                return acc;
              }

              // Calcular desde la entrada REAL hasta la salida REAL
              const totalMinutes = differenceInMinutes(exitDate, entryDate);

              // Calcular tiempo de almuerzo (solo restar 1 hora = 60 minutos máximo)
              let lunchTimeToSubtract = 0;
              if (acc[index].lunch_start && acc[index].lunch_end) {
                const lunchStartDate = new Date(acc[index].lunch_start.date);
                const lunchEndDate = new Date(acc[index].lunch_end.date);

                // Validar que las fechas de almuerzo sean válidas y que lunch_end > lunch_start
                if (
                  !isNaN(lunchStartDate.getTime()) &&
                  !isNaN(lunchEndDate.getTime()) &&
                  lunchEndDate > lunchStartDate
                ) {
                  const actualLunchMinutes = differenceInMinutes(
                    lunchEndDate,
                    lunchStartDate
                  );
                  // Solo restar 60 minutos (1 hora permitida), el exceso no cuenta como trabajo
                  // El exceso se acumula automáticamente en total_lunch_exceeded_minutes
                  if (actualLunchMinutes > 0) {
                    lunchTimeToSubtract = Math.min(actualLunchMinutes, 60);
                  }
                } else {
                  this.logger.warn(
                    '[TimelogsComponent] Fechas de almuerzo inválidas o lunch_end <= lunch_start',
                    {
                      lunch_start: acc[index].lunch_start.date,
                      lunch_end: acc[index].lunch_end.date,
                      employee: acc[index].employee?.first_name,
                    }
                  );
                }
              }

              const workMinutes = totalMinutes - lunchTimeToSubtract;
              const totalHours = workMinutes / 60; // Horas trabajadas (sin almuerzo)
              acc[index].totalHours = totalHours;

              // Calcular horas extras: más de 8 horas de trabajo (sin contar almuerzo)
              // 8 horas = 480 minutos
              const requiredWorkMinutes = 480; // 8 horas de trabajo (480 minutos)
              const overtimeByWorkTime =
                workMinutes > requiredWorkMinutes
                  ? workMinutes - requiredWorkMinutes
                  : 0;

              // Las horas extras se calculan solo sobre el trabajo
              const totalOvertimeMinutes = Math.max(0, overtimeByWorkTime);
              acc[index].overtimeHours =
                totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;

              // Validar que haya trabajado al menos 8 horas (sin contar almuerzo)
              if (workMinutes < requiredWorkMinutes) {
                acc[index].insufficientHours = true;
              }
            }
          } else if (acc[index].entry && acc[index].exit) {
            // Si no hay horario establecido, calcular desde la entrada real
            const entryDate = new Date(acc[index].entry.date);
            const exitDate = new Date(acc[index].exit.date);

            // Validar que las fechas sean válidas y que exitDate > entryDate
            if (
              isNaN(entryDate.getTime()) ||
              isNaN(exitDate.getTime()) ||
              exitDate <= entryDate
            ) {
              this.logger.warn(
                '[TimelogsComponent] Fechas inválidas o salida anterior a entrada (sin horario)',
                {
                  day: acc[index].day,
                  entry: acc[index].entry.date,
                  exit: acc[index].exit.date,
                  entryDateUTC: entryDate.toISOString(),
                  exitDateUTC: exitDate.toISOString(),
                  employee: `${acc[index].employee?.first_name} ${acc[index].employee?.father_name}`,
                  employee_id: acc[index].employee?.id,
                  diferencia_segundos:
                    exitDate <= entryDate
                      ? (exitDate.getTime() - entryDate.getTime()) / 1000
                      : null,
                }
              );
              acc[index].totalHours = 0;
              acc[index].overtimeHours = 0;
              return acc;
            }

            const totalMinutes = differenceInMinutes(exitDate, entryDate);

            // Calcular tiempo de almuerzo (solo restar 1 hora = 60 minutos máximo)
            let lunchTimeToSubtract = 0;
            if (acc[index].lunch_start && acc[index].lunch_end) {
              const lunchStart = acc[index].lunch_start.date;
              const lunchEnd = acc[index].lunch_end.date;

              // Validar que las fechas sean válidas
              if (lunchStart && lunchEnd) {
                const lunchStartDate = new Date(lunchStart);
                const lunchEndDate = new Date(lunchEnd);

                // Validar que las fechas sean válidas y que lunch_end > lunch_start
                if (
                  !isNaN(lunchStartDate.getTime()) &&
                  !isNaN(lunchEndDate.getTime()) &&
                  lunchEndDate > lunchStartDate
                ) {
                  const actualLunchMinutes = differenceInMinutes(
                    lunchEndDate,
                    lunchStartDate
                  );
                  // Solo usar si la diferencia es positiva y razonable (máximo 3 horas)
                  if (actualLunchMinutes > 0 && actualLunchMinutes <= 180) {
                    // Solo restar 60 minutos (1 hora permitida), el exceso no cuenta como trabajo
                    // El exceso se acumula automáticamente en total_lunch_exceeded_minutes
                    lunchTimeToSubtract = Math.min(actualLunchMinutes, 60);
                  }
                } else {
                  this.logger.warn(
                    '[TimelogsComponent] Fechas de almuerzo inválidas o lunch_end <= lunch_start (sin horario)',
                    {
                      lunch_start: lunchStart,
                      lunch_end: lunchEnd,
                      employee: acc[index].employee?.first_name,
                    }
                  );
                }
              }
            }

            const workMinutes = totalMinutes - lunchTimeToSubtract;
            // Validar que workMinutes sea válido antes de dividir
            const totalHours = workMinutes > 0 ? workMinutes / 60 : 0;
            acc[index].totalHours = totalHours;

            // Calcular horas extras: más de 8 horas de trabajo (sin contar almuerzo)
            // 8 horas = 480 minutos
            const requiredWorkMinutes = 480; // 8 horas de trabajo (480 minutos)
            const overtimeByWorkTime =
              workMinutes > requiredWorkMinutes
                ? workMinutes - requiredWorkMinutes
                : 0;

            // Las horas extras se calculan solo sobre el trabajo
            const totalOvertimeMinutes = Math.max(0, overtimeByWorkTime);
            acc[index].overtimeHours =
              totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;
          }
        } else {
          // Si no hay marcación pero hay schedule, calcular retraso si aplica
          if (
            acc[index].schedule?.schedule &&
            !acc[index].schedule.schedule.day_off
          ) {
            // No hay nada que hacer aquí, el delay se calcula cuando hay entrada
          }
        }

        return acc;
      }, acc) // Usar el array inicial que ya tiene todos los días
      .sort((a: DayLog, b: DayLog) => {
        // Ordenar primero por fecha (asegurar orden cronológico), luego por nombre de empleado
        const dateA = new Date(a.day + 'T00:00:00').getTime();
        const dateB = new Date(b.day + 'T00:00:00').getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        const nameA =
          (a.employee.first_name || '') + ' ' + (a.employee.father_name || '');
        const nameB =
          (b.employee.first_name || '') + ' ' + (b.employee.father_name || '');
        return nameA.localeCompare(nameB);
      })
      // Filtrar días finales que estén dentro del rango (validación final)
      .filter((x: DayLog) => {
        const dayStr = x.day;
        // Asegurar que la fecha esté en el rango correcto
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      });

    return result;
  });

  public filteredDaylogs = computed(() => {
    const dayLogsData = this.dayLogs();
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';

    // Filtrar manteniendo el mismo orden que dayLogs
    const filtered = dayLogsData.filter((x: DayLog) => {
      // Filtrar por employeeId si está seleccionado
      if (this.employeeId()) {
        if (x.employee?.id !== this.employeeId()) {
          return false;
        }
      }

      // El filtrado por branchId ya se manejó en dayLogs al poblar uniqueEmployees
      // y filtrar filteredLogs. No es necesario filtrar aquí por la sucursal actual del empleado,
      // ya que queremos permitir ver marcaciones de empleados de otras sucursales si marcaron aquí.

      // Filtrar por búsqueda de nombre (mejorado para buscar en todos los campos)
      if (searchTerm) {
        // Aplicar trim a cada campo para evitar problemas con espacios en la BD
        const firstName = (x.employee?.first_name || '').trim().toLowerCase();
        const middleName = (x.employee?.middle_name || '').trim().toLowerCase();
        const fatherName = (x.employee?.father_name || '').trim().toLowerCase();
        const motherName = (x.employee?.mother_name || '').trim().toLowerCase();

        // Crear diferentes combinaciones de nombres
        const shortName = `${firstName} ${fatherName}`.trim();
        const fullName =
          `${firstName} ${middleName} ${fatherName} ${motherName}`.trim();
        const allNames = [firstName, middleName, fatherName, motherName].filter(
          (n) => n.length > 0 // Filtrar también strings vacíos después del trim
        );

        // Si el searchTerm tiene múltiples palabras, buscar que todas estén presentes
        const searchWords = searchTerm.split(/\s+/).filter((w) => w.length > 0);

        let matchesSearch = false;

        if (searchWords.length === 1) {
          // Búsqueda de una sola palabra: buscar en cualquier campo
          const word = searchWords[0];
          matchesSearch =
            fullName.includes(word) ||
            shortName.includes(word) ||
            allNames.some((name) => name.includes(word));
        } else {
          // Búsqueda de múltiples palabras: todas deben estar presentes en algún campo
          matchesSearch = searchWords.every(
            (word) =>
              fullName.includes(word) ||
              shortName.includes(word) ||
              allNames.some((name) => name.includes(word))
          );
        }

        if (!matchesSearch) {
          return false;
        }
      }

      // Filtro: Solo marcaciones (ocultar días sin ninguna marcación)
      if (this.onlyWithMarcaciones()) {
        const hasMarcaciones =
          x.entry || x.lunch_start || x.lunch_end || x.exit;
        if (!hasMarcaciones) {
          return false;
        }
      }

      if (this.onlyDelayed()) {
        // Solo considerar delays numéricos (excluir 'DIA LIBRE' y otros strings)
        if (typeof x.delay !== 'number' || x.delay === undefined) {
          return false;
        }

        const range = this.delayRange();
        // Si no hay rango seleccionado (está en "Todos"), mostrar todos los retrasos
        if (!range) {
          return true; // Mostrar todos los retrasos
        }

        // x.delay ya contiene solo el exceso sobre la tolerancia
        const delayMinutes = x.delay;

        if (range === '1-5') {
          return delayMinutes >= 1 && delayMinutes <= 5;
        } else if (range === '5-10') {
          return delayMinutes >= 5 && delayMinutes <= 10; // Incluir el 5 para consistencia
        } else if (range === '10+') {
          return delayMinutes > 10;
        }
        return false;
      }
      if (this.onlyEarlyExit()) {
        return x.earlyExit === true;
      }
      if (this.onlyLunchExceeded()) {
        if (!x.lunchExceeded || !x.lunchMinutes) {
          return false;
        }

        const range = this.lunchExceededRange();
        // Si no hay rango seleccionado (está en "Todos"), mostrar todos los excedidos
        if (!range) {
          return true; // Mostrar todos los almuerzos excedidos
        }

        const exceededMinutes = x.lunchMinutes - 60; // Minutos excedidos sobre los 60 permitidos

        if (range === '1-5') {
          return exceededMinutes >= 1 && exceededMinutes <= 5;
        } else if (range === '5-10') {
          return exceededMinutes >= 5 && exceededMinutes <= 10; // Incluir el 5 para consistencia
        } else if (range === '10+') {
          return exceededMinutes > 10;
        }
        return false;
      }
      if (this.onlyErrors()) {
        // Solo errores cuando no hay horario establecido, es día libre/feriado PERO hay marcaciones
        const hasMarks = x.entry || x.lunch_start || x.exit;
        // Si tiene scheduleError, siempre es un error
        if (x.scheduleError === true) {
          return true;
        }
        return (
          hasMarks &&
          (x.alert === 'Sin Horario' ||
            x.alert === 'Día Libre' ||
            x.alert === 'Feriado')
        );
      }
      return true;
    });

    // Retornar los datos filtrados en el mismo orden (ya están ordenados por dayLogs)
    // Log eliminado - no es crítico para debugging

    return filtered;
  });

  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  public getScheduleTooltip(
    schedule: EmployeeScheduleData | undefined
  ): string | undefined {
    if (schedule && schedule.approved === false) {
      return 'Horario pendiente de aprobación';
    }
    return undefined;
  }

  public timelogsReport = computed(() => {
    // Usar exactamente los mismos datos que se muestran en la tabla, en el mismo orden
    const filteredData = this.filteredDaylogs();

    // Obtener y normalizar el rango de fechas
    const { start: startDate, end: endDate } = this.normalizedDateRange();

    if (!startDate || !endDate || filteredData.length === 0) {
      return [];
    }

    // Normalizar fechas al inicio del día
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(0, 0, 0, 0);
    const dateRangeEnd = format(normalizedEnd, 'yyyy-MM-dd');

    // Filtrar y ordenar datos antes de mapear (usando x.day que está en formato 'yyyy-MM-dd')
    const sortedAndFilteredData = filteredData
      .filter((x: DayLog) => {
        // x.day ya está en formato 'yyyy-MM-dd', comparar directamente como string
        const dayStr = x.day || '';
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      })
      .sort((a: DayLog, b: DayLog) => {
        // Ordenar por fecha (x.day está en formato 'yyyy-MM-dd', perfecto para ordenar como string)
        const dayA = a.day || '';
        const dayB = b.day || '';
        if (dayA !== dayB) {
          return dayA.localeCompare(dayB);
        }
        // Si las fechas son iguales, ordenar por nombre del empleado
        const nameA =
          (a.employee?.first_name || '') +
          ' ' +
          (a.employee?.father_name || '');
        const nameB =
          (b.employee?.first_name || '') +
          ' ' +
          (b.employee?.father_name || '');
        return nameA.localeCompare(nameB);
      });

    // Mapear datos ya ordenados
    const mappedData = sortedAndFilteredData.map((x: DayLog) => {
      const lunchMinutes = x.lunchMinutes || 0;
      const exceededMinutes = lunchMinutes > 60 ? lunchMinutes - 60 : 0;
      const lunchExceeded = x.lunchExceeded
        ? `EXCEDIDO (+${exceededMinutes} min)`
        : lunchMinutes > 0
        ? `${lunchMinutes} min`
        : '';
      const totalHours = x.totalHours ? this.formatHours(x.totalHours) : '-';
      const overtimeHours =
        x.overtimeHours && x.overtimeHours > 0
          ? this.formatHours(x.overtimeHours)
          : '-';
      const errors = [];
      if (x.scheduleError) errors.push('Error de Horario');
      if (x.lunchExceeded) errors.push('Almuerzo Excedido');
      if (x.earlyExit) errors.push('Salida Temprana');
      if (x.insufficientHours) errors.push('Horas Insuficientes');
      if (x.alert && !x.scheduleError) errors.push(x.alert);

      // Formatear entrada igual que en la tabla (evitar concatenaciones incorrectas)
      let entrada = '';
      if (x.entry?.date) {
        try {
          entrada = formatInTimeZone(x.entry.date, this.TIMEZONE, 'hh:mm a');
          if (x.entry.branch?.short_name) {
            entrada += ` (${x.entry.branch.short_name})`;
          }
          if (x.delay) {
            const delayText =
              typeof x.delay === 'number' ? `${x.delay} min` : String(x.delay);
            entrada += ` Retraso de ${delayText}`;
          }
        } catch (error) {
          entrada = 'SIN MARCA';
        }
      } else {
        entrada = 'SIN MARCA';
      }

      // Formatear inicio de almuerzo igual que en la tabla (evitar concatenaciones incorrectas)
      let inicioAlmuerzo = '';
      if (x.lunch_start?.date) {
        try {
          inicioAlmuerzo = formatInTimeZone(
            x.lunch_start.date,
            this.TIMEZONE,
            'hh:mm a'
          );
          if (x.lunch_start.branch?.short_name) {
            inicioAlmuerzo += ` (${x.lunch_start.branch.short_name})`;
          }
        } catch (error) {
          inicioAlmuerzo = 'SIN MARCA';
        }
      } else {
        inicioAlmuerzo = 'SIN MARCA';
      }

      // Formatear fin de almuerzo igual que en la tabla (evitar concatenaciones incorrectas)
      let finAlmuerzo = '';
      if (x.lunch_end?.date) {
        try {
          finAlmuerzo = formatInTimeZone(
            x.lunch_end.date,
            this.TIMEZONE,
            'hh:mm a'
          );
          if (x.lunch_end.branch?.short_name) {
            finAlmuerzo += ` (${x.lunch_end.branch.short_name})`;
          }
          if (x.lunchExceeded && x.lunchMinutes) {
            const exceededMinutes = x.lunchMinutes - 60;
            finAlmuerzo += ` Almuerzo +${exceededMinutes} min`;
          }
        } catch (error) {
          finAlmuerzo = 'SIN MARCA';
        }
      } else {
        finAlmuerzo = 'SIN MARCA';
      }

      // Formatear salida igual que en la tabla (evitar concatenaciones incorrectas)
      let salida = '';
      if (x.exit?.date) {
        try {
          salida = formatInTimeZone(x.exit.date, this.TIMEZONE, 'hh:mm a');
          if (x.exit.branch?.short_name) {
            salida += ` (${x.exit.branch.short_name})`;
          }
          if (x.earlyExit) {
            salida += ' Salida temprana';
          }
        } catch (error) {
          salida = 'SIN MARCA';
        }
      } else {
        salida = 'SIN MARCA';
      }

      // Formatear fecha igual que en la tabla (mediumDate: "10 nov 2025")
      let formattedDate = '';
      try {
        const dayDate = new Date(x.day + 'T00:00:00'); // Asegurar parseo correcto
        if (!isNaN(dayDate.getTime())) {
          formattedDate = formatInTimeZone(
            dayDate,
            this.TIMEZONE,
            'd MMM yyyy'
          );
        } else {
          formattedDate = x.day || '';
        }
      } catch (error) {
        formattedDate = x.day || '';
      }

      // Construir nombre del empleado de forma segura
      const employeeName =
        [x.employee?.first_name || '', x.employee?.father_name || '']
          .filter(Boolean)
          .join(' ') || 'Sin nombre';

      return {
        Empleado: employeeName,
        Día: formattedDate,
        Horario: x.schedule?.schedule?.name || 'Sin horario',
        Entrada: entrada,
        'Inicio de almuerzo': inicioAlmuerzo,
        'Fin de almuerzo': finAlmuerzo,
        Salida: salida,
        'Horas Trabajadas': totalHours,
        'Horas Extras': overtimeHours,
        'Errores/Alertas': errors.length > 0 ? errors.join(', ') : 'Ninguno',
      };
    });

    // Los datos ya están ordenados, solo retornar
    return mappedData;
  });

  generateReport() {
    try {
      this.loading.set(true);
      const data = this.timelogsReport();

      // Obtener los encabezados
      const headers = Object.keys(data[0] || {});

      // Crear la hoja de cálculo con encabezados
      const ws = utils.json_to_sheet(data, { header: headers });

      // Agregar filtros automáticos
      const lastCol = String.fromCharCode(64 + headers.length);
      ws['!autofilter'] = { ref: `A1:${lastCol}${data.length + 1}` };

      // Ajustar ancho de columnas según el orden de las columnas
      const colWidths = [
        { wch: 25 }, // Empleado
        { wch: 12 }, // Día
        { wch: 20 }, // Horario
        { wch: 25 }, // Entrada (incluye sucursal y retraso)
        { wch: 20 }, // Inicio de almuerzo (incluye sucursal)
        { wch: 20 }, // Fin de almuerzo (incluye sucursal)
        { wch: 20 }, // Salida (incluye sucursal)
        { wch: 15 }, // Horas Trabajadas
        { wch: 15 }, // Horas Extras
        { wch: 40 }, // Errores/Alertas
      ];
      ws['!cols'] = colWidths;

      // Congelar primera fila (encabezados) - Nota: xlsx básico no soporta esto directamente
      // Se puede hacer manualmente en Excel después de abrir el archivo

      // Crear el libro de trabajo
      const wb = utils.book_new();

      // Agregar información del reporte
      const reportInfo = [
        ['REPORTE DE MARCACIONES'],
        [
          'Fecha de generación:',
          formatInTimeZone(new Date(), this.TIMEZONE, 'dd/MM/yyyy HH:mm'),
        ],
        [
          'Período:',
          (() => {
            const { start, end } = this.normalizedDateRange();
            if (!start || !end) return 'Sin fecha';
            if (start.getTime() === end.getTime()) {
              return formatInTimeZone(start, this.TIMEZONE, 'dd/MM/yyyy');
            }
            return `${formatInTimeZone(
              start,
              this.TIMEZONE,
              'dd/MM/yyyy'
            )} - ${formatInTimeZone(end, this.TIMEZONE, 'dd/MM/yyyy')}`;
          })(),
        ],
        ['Total de registros:', data.length],
        [''],
      ];

      // Crear hoja de información
      const infoWs = utils.aoa_to_sheet(reportInfo);
      infoWs['!cols'] = [{ wch: 30 }, { wch: 30 }];

      // Agregar hojas al libro
      utils.book_append_sheet(wb, infoWs, 'Información');
      utils.book_append_sheet(wb, ws, 'Marcaciones');

      // Generar nombre del archivo
      const { start, end } = this.normalizedDateRange();
      if (!start || !end) {
        this.message.add({
          severity: 'warn',
          summary: 'Fecha requerida',
          detail: 'Por favor selecciona un rango de fechas',
        });
        return;
      }
      const name = this.selectedEmployee()
        ? trim(this.selectedEmployee()?.short_name.toUpperCase()).replace(
            ' ',
            '_'
          )
        : 'GLOBAL';
      const fileName = `${name}_${formatInTimeZone(
        start,
        this.TIMEZONE,
        'yyyyMMdd'
      )}-${formatInTimeZone(end, this.TIMEZONE, 'yyyyMMdd')}.xlsx`;

      writeFile(wb, fileName);

      this.message.add({
        severity: 'success',
        summary: 'Reporte generado',
        detail: `El archivo ${fileName} se ha descargado correctamente`,
      });
    } catch (error) {
      this.logger.error('Error generating report:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el reporte. Por favor, intente nuevamente.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  // ============================================
  // OVERTIME CONFIRMATION FLOW
  // ============================================

  private overtimeService = inject(OvertimeRecordsService);

  // State for overtime dialog
  public overtimeDialogVisible = signal(false);
  public selectedOvertimeLog = signal<DayLog | null>(null);
  public selectedOvertimeRecord = signal<EmployeeOvertimeRecord | null>(null);
  public overtimeLoading = signal(false);

  /**
   * Handles overtime action button click from table
   */
  public async onOvertimeAction(log: DayLog): Promise<void> {
    this.selectedOvertimeLog.set(log);

    // Check if there's already an overtime record for this employee/date
    if (log.overtimeRecord) {
      this.selectedOvertimeRecord.set(log.overtimeRecord);
    } else {
      // No existing record - will create on confirm
      this.selectedOvertimeRecord.set(null);
    }

    this.overtimeDialogVisible.set(true);
  }

  /**
   * Handles dialog result (confirm, reject, cancel)
   */
  public async onOvertimeDialogResult(
    result: OvertimeDialogResult
  ): Promise<void> {
    if (result.action === 'cancel') {
      this.closeOvertimeDialog();
      return;
    }

    const log = this.selectedOvertimeLog();
    if (!log?.employee?.id || !log.day) {
      this.logger.error(
        '[TimelogsComponent] Invalid log data for overtime action'
      );
      return;
    }

    const currentEmployeeId = this.store.auth.currentEmployeeId();
    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario actual',
      });
      return;
    }

    this.overtimeLoading.set(true);

    try {
      const existingRecord = this.selectedOvertimeRecord();

      if (result.action === 'confirm') {
        if (existingRecord?.id) {
          // Update existing record
          await this.overtimeService.confirm({
            recordId: existingRecord.id,
            confirmedBy: currentEmployeeId,
            hours: result.hours,
            reason: result.reason,
          });
        } else {
          // Create and confirm new record
          const newRecord = await this.overtimeService.save({
            employee_id: log.employee.id,
            timelog_date: log.day,
            hours: result.hours ?? log.overtimeHours ?? 0,
            status: 'confirmed',
            reason: result.reason,
          });

          // Then confirm it
          await this.overtimeService.confirm({
            recordId: newRecord.id,
            confirmedBy: currentEmployeeId,
            hours: result.hours,
            reason: result.reason,
          });
        }

        this.message.add({
          severity: 'success',
          summary: 'Horas extras confirmadas',
          detail: `Se confirmaron ${
            result.hours ?? log.overtimeHours
          } horas extras para ${log.employee.first_name} ${
            log.employee.father_name
          }`,
        });
      } else if (result.action === 'reject') {
        if (existingRecord?.id) {
          await this.overtimeService.reject({
            recordId: existingRecord.id,
            confirmedBy: currentEmployeeId,
            reason: result.reason ?? 'Rechazado sin motivo',
          });
        } else {
          // Create as rejected
          await this.overtimeService.save({
            employee_id: log.employee.id,
            timelog_date: log.day,
            hours: result.hours ?? log.overtimeHours ?? 0,
            status: 'rejected',
            reason: result.reason,
          });
        }

        this.message.add({
          severity: 'info',
          summary: 'Horas extras rechazadas',
          detail: `Se rechazaron las horas extras para ${log.employee.first_name} ${log.employee.father_name}`,
        });
      }

      this.closeOvertimeDialog();

      // Refresh data to show updated status
      // The httpResource will auto-refresh on signal changes
      // Force a small date range change to trigger refresh
      this.refreshOvertimeRecords();
    } catch (error) {
      this.logger.error(
        '[TimelogsComponent] Error processing overtime action:',
        error
      );
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo procesar la acción. Por favor, intente nuevamente.',
      });
    } finally {
      this.overtimeLoading.set(false);
    }
  }

  private closeOvertimeDialog(): void {
    this.overtimeDialogVisible.set(false);
    this.selectedOvertimeLog.set(null);
    this.selectedOvertimeRecord.set(null);
  }

  private refreshOvertimeRecords(): void {
    // Trigger a refresh by briefly modifying the date range signal
    // This will cause httpResource to refetch
    const current = this.dateRange();
    this.dateRange.set([...current]);
  }
}
