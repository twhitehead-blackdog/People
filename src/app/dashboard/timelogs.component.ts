import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addDays, differenceInMinutes, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { trim } from 'lodash';
import { MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { utils, writeFile } from 'xlsx';
import {
  Branch,
  colorVariants,
  Employee,
  getScheduleColorInlineStyle as getColorStyle,
} from '../models';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-timelogs',
  imports: [
    Button,
    Card,
    Select,
    DatePicker,
    FormsModule,
    DatePipe,
    TableModule,
    Tag,
    TooltipModule,
    Avatar,
    ToastModule,
    NgClass,
    NgStyle,
    ToggleSwitch,
  ],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <p-card
      header="Marcaciones"
      subheader="Listado de marcaciones de empleados"
    >
      <div
        class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3"
      >
        <div class="flex items-center gap-2">
          <label for="delayed" class="text-sm whitespace-nowrap"
            >Solo retrasos</label
          >
          <p-toggleSwitch
            inputId="delayed"
            [(ngModel)]="onlyDelayed"
            onLabel="Solo retrasos"
            offLabel="Todos"
          />
        </div>
        <div class="flex items-center gap-2">
          <label for="errors" class="text-sm whitespace-nowrap"
            >Solo errores</label
          >
          <p-toggleSwitch
            inputId="errors"
            [(ngModel)]="onlyErrors"
            onLabel="Solo errores"
            offLabel="Todos"
          />
        </div>
        <div class="flex items-center gap-2">
          <label for="earlyExit" class="text-sm whitespace-nowrap"
            >Solo salida temprana</label
          >
          <p-toggleSwitch
            inputId="earlyExit"
            [(ngModel)]="onlyEarlyExit"
            onLabel="Solo salida temprana"
            offLabel="Todos"
          />
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex items-center gap-2">
            <label for="lunchExceededToggle" class="text-sm whitespace-nowrap"
              >Solo almuerzo excedido</label
            >
            <p-toggleSwitch
              inputId="lunchExceededToggle"
              [(ngModel)]="onlyLunchExceeded"
              onLabel="Solo almuerzo excedido"
              offLabel="Todos"
            />
          </div>
          @if(employeeId() && selectedEmployeeLunchExceeded() !== null) {
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">Total excedido:</span>
            @if(selectedEmployeeLunchExceeded()! > 0) {
            <p-tag
              severity="warn"
              [value]="
                formatLunchExceededTotal(selectedEmployeeLunchExceeded()!)
              "
              icon="pi pi-clock"
              styleClass="text-xs"
            />
            } @else {
            <span class="text-sm text-gray-500">0</span>
            }
          </div>
          } @if(onlyLunchExceeded()) {
          <p-select
            inputId="lunchExceeded"
            [(ngModel)]="lunchExceededRange"
            [options]="lunchExceededOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Todos"
            showClear
            appendTo="body"
            class="w-full sm:w-48"
          />
          }
        </div>
      </div>
      <div class="flex flex-col md:flex-row gap-3 items-center mb-3">
        <div class="input-container">
          <p-select
            [options]="activeEmployeesList()"
            optionLabel="short_name"
            optionValue="id"
            placeholder="--TODOS--"
            filter
            showClear
            appendTo="body"
            [(ngModel)]="employeeId"
          />
        </div>
        <div class="input-container">
          <p-select
            placeholder="--TODAS LAS SUCURSALES--"
            [(ngModel)]="branchId"
            [options]="store.branches.entities()"
            optionLabel="name"
            optionValue="id"
            showClear
            appendTo="body"
          />
        </div>
        <div class="input-container">
          <p-datepicker
            placeholder="Fecha o rango de fechas"
            selectionMode="range"
            appendTo="body"
            [(ngModel)]="dateRange"
            [showIcon]="true"
            dateFormat="dd/mm/yy"
          />
        </div>

        <div>
          <p-button
            icon="pi pi-file-excel"
            [loading]="loading()"
            (click)="generateReport()"
            severity="success"
            [disabled]="timelogsReport().length === 0"
          />
        </div>
      </div>
      @if (hasError()) {
      <!-- Error handling, toast will be shown -->
      }
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          [value]="filteredDaylogs()"
          [rows]="25"
          [rowsPerPageOptions]="[10, 25, 50, 100, 200]"
          paginator
          paginatorDropdownAppendTo="body"
          showGridlines
          stripedRows
          [loading]="this.logs.isLoading()"
          [scrollable]="true"
          [scrollHeight]="'calc(100vh - 400px)'"
          styleClass="min-w-full"
        >
          <ng-template #header>
            <tr>
              <th>Empleado</th>
              <th>Día</th>
              <th>Horario</th>
              <th>Entrada</th>
              <th>Inicio de almuerzo</th>
              <th>Fin de almuerzo</th>
              <th>Salida</th>
              <th>Horas Trabajadas</th>
            </tr>
          </ng-template>
          <ng-template #body let-log>
            <tr
              [ngClass]="{
                'bg-amber-50/10': log.alert,
                'bg-red-50/10': log.scheduleError
              }"
            >
              <td>
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    {{ log.employee.first_name }} {{ log.employee.father_name }}
                    @if(log.scheduleError) {
                    <p-tag
                      value="Error de Horario"
                      severity="danger"
                      icon="pi pi-exclamation-triangle"
                      [pTooltip]="
                        log.alert +
                        ': El empleado trabajó pero está marcado como feriado/día libre. No hay horario válido para estas marcaciones. El gerente debe corregir la configuración.'
                      "
                      tooltipPosition="top"
                      [style]="{
                        'min-width': maxEmployeeTagWidth(),
                        display: 'inline-block',
                        'text-align': 'center'
                      }"
                      styleClass="ml-2"
                    />
                    } @else if(log.alert) {
                    <p-tag
                      [value]="log.alert"
                      [severity]="getAlertSeverity(log.alert)"
                      [icon]="getAlertIcon(log.alert)"
                      [pTooltip]="getAlertTooltip(log.alert)"
                      tooltipPosition="top"
                      [style]="{
                        'min-width': maxEmployeeTagWidth(),
                        display: 'inline-block',
                        'text-align': 'center'
                      }"
                      styleClass="ml-2"
                    />
                    }
                  </div>
                </div>
              </td>
              <td>{{ log.day | date : 'mediumDate' }}</td>
              <td>
                <span
                  class="rounded text-sm px-2 py-1 font-semibold inline-flex items-center justify-center gap-1"
                  [ngClass]="
                    (log.schedule?.schedule?.color &&
                    colorVariants[log.schedule.schedule.color]
                      ? colorVariants[log.schedule.schedule.color]
                      : '') +
                    (log.schedule && log.schedule.approved === false
                      ? ' opacity-60'
                      : '')
                  "
                  [ngStyle]="
                    log.schedule?.schedule?.color &&
                    !colorVariants[log.schedule.schedule.color]
                      ? getScheduleColorInlineStyle(log.schedule.schedule.color)
                      : null
                  "
                  [style]="{
                    'min-width': maxScheduleBadgeWidth(),
                    'text-align': 'center'
                  }"
                  [pTooltip]="getScheduleTooltip(log.schedule)"
                  tooltipPosition="top"
                  >{{ log?.schedule?.schedule?.name || 'Sin horario' }}
                  @if(log.schedule && log.schedule.approved === false) {
                  <i
                    class="pi pi-exclamation-circle text-yellow-200 text-[10px] animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                  ></i>
                  } @else if(log.schedule && log.schedule.approved === true) {
                  <i
                    class="pi pi-check-circle text-green-400 text-[10px] flex-shrink-0"
                  ></i>
                  }
                </span>
              </td>
              <td>
                <div class="flex gap-2 items-center">
                  @if(log.entry) {
                  <p-avatar
                    class="cursor-pointer"
                    shape="circle"
                    [label]="log.entry?.branch.short_name"
                    [pTooltip]="log.entry?.branch.name"
                    tooltipPosition="top"
                  />}
                  <span
                    [ngClass]="{
                      'text-red-500 font-semibold': log.delay
                    }"
                    >{{ log.entry?.date | date : 'hh:mm a' }}</span
                  >
                  @if(log.delay) {
                  <p-tag
                    [value]="'Retraso de ' + log.delay + ' min'"
                    severity="danger"
                    icon="pi pi-clock"
                    [pTooltip]="'El empleado llegó tarde al trabajo'"
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxDelayTagWidth(),
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  />
                  }
                </div>
              </td>
              <td>
                <div class="flex gap-2 items-center">
                  @if(log.lunch_start) {
                  <p-avatar
                    shape="circle"
                    [label]="log.lunch_start?.branch.short_name"
                    [pTooltip]="log.lunch_start?.branch.name"
                    tooltipPosition="top"
                  />
                  }
                  {{ log.lunch_start?.date | date : 'hh:mm a' }}
                </div>
              </td>
              <td>
                <div class="flex gap-2 items-center">
                  @if(log.lunch_end) {
                  <p-avatar
                    shape="circle"
                    [label]="log.lunch_end?.branch.short_name"
                    [pTooltip]="log.lunch_end?.branch.name"
                    tooltipPosition="top"
                  />}
                  <span
                    [ngClass]="{
                      'text-red-500 font-semibold': log.lunchExceeded
                    }"
                    >{{ log.lunch_end?.date | date : 'hh:mm a' }}</span
                  >
                  @if(log.lunchExceeded && log.lunchMinutes) {
                  <p-tag
                    [value]="'Almuerzo +' + (log.lunchMinutes - 60) + ' min'"
                    severity="danger"
                    icon="pi pi-exclamation-triangle"
                    [pTooltip]="
                      'El tiempo de almuerzo excede los 60 minutos permitidos por ' +
                      (log.lunchMinutes - 60) +
                      ' minutos'
                    "
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxLunchTagWidth(),
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  />
                  }
                </div>
              </td>
              <td>
                <div class="flex gap-2 items-center">
                  @if(log.exit) {
                  <p-avatar
                    shape="circle"
                    [label]="log.exit?.branch.short_name"
                    [pTooltip]="log.exit?.branch.name"
                    tooltipPosition="top"
                  />}
                  <span
                    [ngClass]="{
                      'text-red-500 font-semibold': log.earlyExit
                    }"
                    >{{ log.exit?.date | date : 'hh:mm a' }}</span
                  >
                  @if(log.earlyExit) {
                  <p-tag
                    value="Salida temprana"
                    severity="danger"
                    icon="pi pi-exclamation-triangle"
                    [pTooltip]="
                      'El empleado salió antes del horario laboral establecido'
                    "
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxExitTagWidth(),
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  />
                  }
                </div>
              </td>
              <td>
                <div class="flex gap-2 items-center">
                  <span
                    [ngClass]="{
                      'text-red-500 font-semibold': log.insufficientHours,
                      'text-green-500 font-semibold':
                        !log.insufficientHours && log.totalHours
                    }"
                  >
                    {{ log.totalHours ? formatHours(log.totalHours) : '-' }}
                  </span>
                  @if(log.insufficientHours) {
                  <p-tag
                    value="Menos de 9h"
                    severity="danger"
                    icon="pi pi-clock"
                    [pTooltip]="
                      'El empleado no cumplió las 9 horas requeridas en la empresa (ej: 7am-4pm, 8am-5pm, 11am-8pm)'
                    "
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxHoursTagWidth(),
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="8">
                <div class="flex flex-col items-center justify-center gap-4">
                  <p>No se encontraron registros</p>
                  <p-button
                    label="Limpiar"
                    icon="pi pi-refresh"
                    (click)="employeeId.set('')"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
  </div>`,
  styles: `
    ::ng-deep .p-tag .p-tag-icon {
      margin-right: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsComponent {
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
    const scheduleNames = schedules.map((s: any) => s.name || 'Sin horario');
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
    const maxLength = 'Menos de 9h'.length;
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });
  public employees = inject(EmployeesStore);
  public dateRange = signal<Date[]>([startOfMonth(new Date()), new Date()]);
  public employeeId = model<string>();
  public branchId = model<string>();
  public store = inject(DashboardStore);
  public onlyDelayed = signal(false);
  public organizationService = inject(OrganizationService);

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Helper para agregar filtro de company_id a los parámetros
  private addCompanyFilter(params: any, tableName: string): any {
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
  public normalizedDateRange = computed(() => {
    const range = this.dateRange();
    if (!range || range.length === 0) {
      return { start: null, end: null };
    }
    const start = range[0];
    const end = range[1] || range[0]; // Si no hay segunda fecha, usar la primera
    return { start, end };
  });

  public onlyErrors = signal(false);
  public onlyEarlyExit = signal(false);
  public onlyLunchExceeded = signal(false);
  public lunchExceededRange = signal<string | null>(null);

  // Opciones para el filtro de almuerzo excedido
  public lunchExceededOptions = [
    { label: '1-5 minutos excedidos', value: '1-5' },
    { label: '5-10 minutos excedidos', value: '5-10' },
    { label: '10 o más minutos excedidos', value: '10+' },
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

  public loading = signal(false);
  private message = inject(MessageService);
  public colorVariants = colorVariants;

  private selectedEmployee = computed(() =>
    this.employees.employeesList().find((x) => x.id === this.employeeId())
  );

  // Computed para obtener el tiempo total excedido del empleado seleccionado
  public selectedEmployeeLunchExceeded = computed(() => {
    const employee = this.selectedEmployee();
    if (!employee) {
      return null;
    }
    return employee.total_lunch_exceeded_minutes ?? null;
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

  public schedules = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }
    const params = this.addCompanyFilter(
      {
        select: `*,approved,schedule:schedules(*)`,
        start_date: `gte.${format(start, 'yyyy-MM-dd 06:00:00')}`,
        end_date: `lte.${format(end, 'yyyy-MM-dd 06:00:00')}`,
      },
      'employee_schedules'
    );
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      method: 'GET',
      params,
    };
  });

  public timeoffs = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
      method: 'GET',
      params: {
        select:
          'id,type_id,employee_id,date_from,date_to,is_approved,type:timeoff_types(id,name)',
        date_from: `lte.${format(end, 'yyyy-MM-dd')}`,
        date_to: `gte.${format(start, 'yyyy-MM-dd')}`,
        is_approved: 'eq.true',
      },
    };
  });

  public logs = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }
    const params = this.addCompanyFilter(this.queryParams(), 'timelogs');
    params.created_at = `lte.${format(addDays(end, 1), 'yyyy-MM-dd 06:00:00')}`;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
      method: 'GET',
      params,
    };
  });

  // Computed para detectar errores en las peticiones HTTP
  public hasError = computed(() => {
    if (this.logs.error() || this.schedules.error() || this.timeoffs.error()) {
      this.message.add({
        severity: 'error',
        summary: 'Error al cargar datos',
        detail:
          'No se pudieron cargar las marcaciones. Por favor, intente nuevamente.',
      });
      return true;
    }
    return false;
  });

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
      select: `*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`,
      created_at: `gte.${format(start, 'yyyy-MM-dd 06:00:00')}`,
    };
    if (this.employeeId()) {
      params['employee_id'] = `eq.${this.employeeId()}`;
    }
    return params;
  });

  public dayLogs = computed(() => {
    // Obtener el rango de fechas para filtrar
    const startDate = this.dateRange()?.[0];
    const endDate = this.dateRange()?.[1];

    if (!startDate || !endDate) {
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
      .filter((x) =>
        this.branchId() ? x.employee?.branch?.id === this.branchId() : true
      )
      .map((x) => {
        const logDate = new Date(x.created_at);
        logDate.setHours(0, 0, 0, 0);
        return { ...x, day: format(logDate, 'yyyy-MM-dd') };
      })
      // Filtrar logs que estén dentro del rango seleccionado (solo fechas válidas)
      .filter((x) => {
        const logDay = x.day;
        return (
          logDay >= dateRangeStart &&
          logDay <= dateRangeEnd &&
          logDay !== format(new Date('1900-01-01'), 'yyyy-MM-dd')
        );
      });

    // Obtener empleados únicos que tienen logs en el rango o que están activos
    const uniqueEmployees = new Map<string, Partial<Employee>>();

    // Primero agregar empleados que tienen logs, pero usar datos completos de employeesList
    filteredLogs.forEach((log) => {
      if (log.employee?.id && !uniqueEmployees.has(log.employee.id)) {
        // Buscar el empleado completo en employeesList para obtener total_lunch_exceeded_minutes
        const fullEmployee = this.employees
          .employeesList()
          .find((emp) => emp.id === log.employee.id);
        uniqueEmployees.set(log.employee.id, fullEmployee || log.employee);
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

    // Si no hay empleados únicos, usar todos los empleados activos
    if (uniqueEmployees.size === 0) {
      this.employees.employeesList().forEach((emp) => {
        if (emp.is_active) {
          uniqueEmployees.set(emp.id, emp);
        }
      });
    }

    // Crear estructura inicial: TODOS los días del rango para TODOS los empleados
    const acc: {
      employee: Partial<Employee>;
      day: string;
      schedule?: any;
      delay?: number | string;
      alert?: string;
      scheduleError?: boolean;
      lunchExceeded?: boolean;
      lunchMinutes?: number;
      earlyExit?: boolean;
      insufficientHours?: boolean;
      totalHours?: number;
      entry?: { date: Date; branch: Branch };
      lunch_start?: { date: Date; branch: Branch };
      lunch_end?: { date: Date; branch: Branch };
      exit?: { date: Date; branch: Branch };
    }[] = [];

    // Para cada empleado, crear registros para TODOS los días del rango en orden
    uniqueEmployees.forEach((employee) => {
      daysList.forEach((day) => {
        // Asegurarse de que el día esté dentro del rango (validación adicional)
        if (day < dateRangeStart || day > dateRangeEnd) {
          return;
        }

        // Buscar schedule que corresponda a este día
        const schedule = schedulesData.find(
          (schedule) =>
            schedule.employee_id === employee.id &&
            schedule.start_date <= day &&
            schedule.end_date >= day
        );

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
          entry: undefined,
          lunch_start: undefined,
          lunch_end: undefined,
          exit: undefined,
        });
      });
    });

    // Ahora procesar los logs para actualizar los registros creados
    return (
      filteredLogs
        .reduce<
          {
            employee: Partial<Employee>;
            day: string;
            schedule?: any;
            delay?: number | string;
            alert?: string;
            scheduleError?: boolean;
            lunchExceeded?: boolean;
            lunchMinutes?: number;
            earlyExit?: boolean;
            insufficientHours?: boolean;
            totalHours?: number;
            entry?: { date: Date; branch: Branch };
            lunch_start?: { date: Date; branch: Branch };
            lunch_end?: { date: Date; branch: Branch };
            exit?: { date: Date; branch: Branch };
          }[]
        >((acc, x) => {
          // Solo procesar si el día está dentro del rango
          if (x.day < dateRangeStart || x.day > dateRangeEnd) {
            return acc;
          }

          const index = acc.findIndex(
            (y) => y.day === x.day && y.employee.id === x.employee.id
          );

          // Si no se encuentra el índice, significa que el día no está en this.days()
          // Esto no debería pasar si el query filtra correctamente, pero por seguridad lo validamos
          if (index === -1) {
            return acc;
          }

          acc[index] = {
            ...acc[index],
            [x.type]: { date: x.created_at, branch: x.branch, id: x.id },
          };

          // Detectar alertas cuando hay marcación
          const dayDate = new Date(acc[index].day);
          const dayStr = format(dayDate, 'yyyy-MM-dd');
          const timeoffForDay = timeoffsData.find((timeoff) => {
            if (timeoff.employee_id !== acc[index].employee.id) return false;
            const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
            const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
            return dayStr >= fromStr && dayStr <= toStr;
          });
          const hasTimeOff = !!timeoffForDay;
          // El type_id puede estar directamente o anidado en type (según el query)
          const timeoffTypeId =
            timeoffForDay?.type_id || timeoffForDay?.type?.id;
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

          // SIEMPRE marcar como error si el schedule es feriado/día libre y hay marcaciones
          if (isScheduleFeriado && hasMark) {
            acc[index].alert = acc[index].schedule?.schedule?.day_off
              ? 'Día Libre'
              : 'Feriado';
            acc[index].scheduleError = true; // Error crítico: marcó en día feriado/libre (no debería tener marcaciones)
          }

          if (hasMark) {
            // Prioridad: Feriado > Día Libre > Sin Horario
            if (hasTimeOff) {
              // Ya se marcó arriba, solo asegurar que esté marcado
              if (!acc[index].scheduleError) {
                acc[index].scheduleError = true;
              }
            } else if (acc[index].schedule) {
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
                  const entryTime = format(acc[index].entry.date, 'hh:mm:ss');
                  const scheduleTime = acc[index].schedule.schedule.entry_time;
                  const delay = this.calcTimeDiff(entryTime, scheduleTime);

                  if (delay > acc[index].schedule.schedule.minutes_tolerance) {
                    acc[index].delay = delay;
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
              acc[index].schedule &&
              acc[index].exit &&
              !acc[index].schedule.schedule.day_off
            ) {
              const exitTime = format(acc[index].exit.date, 'HH:mm:ss');
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

            // Validar horas trabajadas (9 horas totales en la empresa: 7am-4pm, 8am-5pm, 11am-8pm)
            // Se calcula desde la hora establecida del horario, no desde la entrada real
            if (
              acc[index].entry &&
              acc[index].exit &&
              acc[index].schedule &&
              !acc[index].schedule.schedule.day_off
            ) {
              const scheduleEntryTime = acc[index].schedule.schedule.entry_time;
              const scheduleExitTime = acc[index].schedule.schedule.exit_time;

              if (scheduleEntryTime && scheduleExitTime) {
                // Crear fechas usando la hora establecida del horario
                const entryDate = new Date(acc[index].entry.date);
                const exitDate = new Date(acc[index].exit.date);

                // Convertir scheduleEntryTime a string si es Date
                const entryTimeStr =
                  typeof scheduleEntryTime === 'string'
                    ? scheduleEntryTime
                    : format(new Date(scheduleEntryTime), 'HH:mm:ss');

                // Establecer la hora de entrada según el horario establecido
                const entryParts = entryTimeStr.split(':');
                entryDate.setHours(
                  +entryParts[0],
                  +entryParts[1],
                  +entryParts[2] || 0,
                  0
                );

                // Calcular desde la hora establecida hasta la salida real
                const totalMinutes = differenceInMinutes(exitDate, entryDate);

                // Restar tiempo de almuerzo si existe
                const lunchTime =
                  acc[index].lunch_start && acc[index].lunch_end
                    ? differenceInMinutes(
                        acc[index].lunch_end.date,
                        acc[index].lunch_start.date
                      )
                    : 0;

                const workMinutes = totalMinutes - lunchTime;
                const totalHours = totalMinutes / 60; // Horas totales en la empresa
                acc[index].totalHours = totalHours;

                // Debe cumplir 9 horas totales en la empresa (ej: 7am-4pm, 8am-5pm, 11am-8pm)
                // Permitimos un margen de tolerancia de 5 minutos
                const requiredTotalMinutes = 540; // 9 horas totales (540 minutos)

                if (totalMinutes < requiredTotalMinutes) {
                  acc[index].insufficientHours = true;
                }
              }
            } else if (acc[index].entry && acc[index].exit) {
              // Si no hay horario establecido, calcular desde la entrada real
              const totalMinutes = differenceInMinutes(
                acc[index].exit.date,
                acc[index].entry.date
              );
              // Validar y calcular tiempo de almuerzo
              let lunchTime = 0;
              if (acc[index].lunch_start && acc[index].lunch_end) {
                const lunchStart = acc[index].lunch_start.date;
                const lunchEnd = acc[index].lunch_end.date;

                // Validar que las fechas sean válidas
                if (
                  lunchStart &&
                  lunchEnd &&
                  !isNaN(new Date(lunchStart).getTime()) &&
                  !isNaN(new Date(lunchEnd).getTime())
                ) {
                  const diff = differenceInMinutes(lunchEnd, lunchStart);
                  // Solo usar si la diferencia es positiva y razonable (máximo 3 horas)
                  if (diff > 0 && diff <= 180) {
                    lunchTime = diff;
                  }
                }
              }

              const workMinutes = totalMinutes - lunchTime;
              // Validar que totalMinutes sea válido antes de dividir
              const totalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
              acc[index].totalHours = totalHours;
            }
          } else {
            // Si no hay marcación pero hay schedule, calcular retraso si aplica
            if (acc[index].schedule && !acc[index].schedule.schedule.day_off) {
              // No hay nada que hacer aquí, el delay se calcula cuando hay entrada
            }
          }

          return acc;
        }, acc) // Usar el array inicial que ya tiene todos los días
        .sort((a, b) => {
          // Ordenar primero por fecha (asegurar orden cronológico), luego por nombre de empleado
          const dateA = new Date(a.day + 'T00:00:00').getTime();
          const dateB = new Date(b.day + 'T00:00:00').getTime();
          if (dateA !== dateB) {
            return dateA - dateB;
          }
          const nameA =
            (a.employee.first_name || '') +
            ' ' +
            (a.employee.father_name || '');
          const nameB =
            (b.employee.first_name || '') +
            ' ' +
            (b.employee.father_name || '');
          return nameA.localeCompare(nameB);
        })
        // Filtrar días finales que estén dentro del rango (validación final)
        .filter((x) => {
          const dayStr = x.day;
          // Asegurar que la fecha esté en el rango correcto
          return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
        })
    );
  });

  public filteredDaylogs = computed(() => {
    // Filtrar manteniendo el mismo orden que dayLogs
    const filtered = this.dayLogs().filter((x) => {
      if (this.onlyDelayed()) {
        return x.delay !== undefined;
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
    return filtered;
  });

  calcTimeDiff = (time1: string, time2: string) => {
    if (!time1 || !time2) {
      return 0;
    }

    // Validar formato de hora (debe tener :)
    if (!time1.includes(':') || !time2.includes(':')) {
      return 0;
    }

    const valueStart = time1.split(':');
    const valueEnd = time2.split(':');

    // Validar que tenga al menos horas y minutos
    if (valueStart.length < 2 || valueEnd.length < 2) {
      return 0;
    }

    const hours1 = parseInt(valueStart[0], 10);
    const minutes1 = parseInt(valueStart[1], 10);
    const hours2 = parseInt(valueEnd[0], 10);
    const minutes2 = parseInt(valueEnd[1], 10);

    // Validar que sean números válidos y estén en rango
    if (
      isNaN(hours1) ||
      isNaN(minutes1) ||
      isNaN(hours2) ||
      isNaN(minutes2) ||
      hours1 < 0 ||
      hours1 > 23 ||
      minutes1 < 0 ||
      minutes1 > 59 ||
      hours2 < 0 ||
      hours2 > 23 ||
      minutes2 < 0 ||
      minutes2 > 59
    ) {
      return 0;
    }

    const timeStart = new Date();
    const timeEnd = new Date();

    timeStart.setHours(hours1, minutes1, 0, 0);
    timeEnd.setHours(hours2, minutes2, 0, 0);

    return differenceInMinutes(timeStart, timeEnd);
  };

  getAlertSeverity(alert: string): 'warn' | 'danger' | 'info' {
    switch (alert) {
      case 'Día Libre':
        return 'warn';
      case 'Feriado':
        return 'info';
      case 'Sin Horario':
        return 'danger';
      default:
        return 'warn';
    }
  }

  getAlertIcon(alert: string): string {
    switch (alert) {
      case 'Día Libre':
        return 'pi pi-calendar-times';
      case 'Feriado':
        return 'pi pi-calendar';
      case 'Sin Horario':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-info-circle';
    }
  }

  getAlertTooltip(alert: string): string {
    switch (alert) {
      case 'Día Libre':
        return 'El empleado marcó en un día que está configurado como día libre en su horario';
      case 'Feriado':
        return 'El empleado marcó en un día que tiene un permiso/feriado aprobado';
      case 'Sin Horario':
        return 'El empleado marcó pero no tiene un horario establecido para este día';
      default:
        return '';
    }
  }

  public formatLunchExceededTotal(minutes: number): string {
    if (minutes === 0) {
      return '0';
    }
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  public getScheduleTooltip(schedule: any): string | undefined {
    if (schedule && schedule.approved === false) {
      return 'Horario pendiente de aprobación';
    }
    return undefined;
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
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
      .filter((x) => {
        // x.day ya está en formato 'yyyy-MM-dd', comparar directamente como string
        const dayStr = x.day || '';
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      })
      .sort((a, b) => {
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
    const mappedData = sortedAndFilteredData.map((x) => {
      const lunchMinutes = x.lunchMinutes || 0;
      const exceededMinutes = lunchMinutes > 60 ? lunchMinutes - 60 : 0;
      const lunchExceeded = x.lunchExceeded
        ? `EXCEDIDO (+${exceededMinutes} min)`
        : lunchMinutes > 0
        ? `${lunchMinutes} min`
        : '';
      const totalHours = x.totalHours ? this.formatHours(x.totalHours) : '-';
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
          entrada = format(x.entry.date, 'hh:mm a');
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
          inicioAlmuerzo = format(x.lunch_start.date, 'hh:mm a');
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
          finAlmuerzo = format(x.lunch_end.date, 'hh:mm a');
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
          salida = format(x.exit.date, 'hh:mm a');
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
          formattedDate = format(dayDate, 'd MMM yyyy', { locale: es });
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
        ['Fecha de generación:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        [
          'Período:',
          (() => {
            const { start, end } = this.normalizedDateRange();
            if (!start || !end) return 'Sin fecha';
            if (start.getTime() === end.getTime()) {
              return format(start, 'dd/MM/yyyy');
            }
            return `${format(start, 'dd/MM/yyyy')} - ${format(
              end,
              'dd/MM/yyyy'
            )}`;
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
      const fileName = `${name}_${format(start, 'yyyyMMdd')}-${format(
        end,
        'yyyyMMdd'
      )}.xlsx`;

      writeFile(wb, fileName);

      this.message.add({
        severity: 'success',
        summary: 'Reporte generado',
        detail: `El archivo ${fileName} se ha descargado correctamente`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el reporte. Por favor, intente nuevamente.',
      });
    } finally {
      this.loading.set(false);
    }
  }
}
