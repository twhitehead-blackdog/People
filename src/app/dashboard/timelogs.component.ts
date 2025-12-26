import { DatePipe, NgClass, NgStyle } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { addDays, differenceInMinutes, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { trim } from 'lodash';
import { MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
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
    InputText,
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
      <!-- Búsqueda y Fecha (fuera del panel) -->
      <div class="flex flex-col md:flex-row gap-3 items-center mb-4">
        <div class="flex-1 w-full md:w-auto">
          <input
            pInputText
            type="text"
            [(ngModel)]="employeeSearch"
            placeholder="Buscar empleado por nombre..."
            class="w-full text-sm"
          />
        </div>
        <div class="w-full md:w-auto">
          <p-datepicker
            placeholder="Fecha o rango de fechas"
            selectionMode="range"
            appendTo="body"
            [(ngModel)]="dateRange"
            [showIcon]="true"
            dateFormat="dd/mm/yy"
            class="w-full"
          />
        </div>
      </div>

      <!-- Panel de Filtros Colapsable -->
      <div
        class="mb-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
      >
        <!-- Header del panel de filtros -->
        <button
          type="button"
          (click)="filtersExpanded.set(!filtersExpanded())"
          class="w-full flex items-center justify-between p-3 hover:bg-neutral-700/30 transition-colors"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-yellow-400 text-sm"></i>
            <span class="text-base font-semibold text-white">Filtros</span>
            @if (hasActiveFilters()) {
            <span
              class="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full"
            >
              {{ getActiveFiltersCount() }} activo(s)
            </span>
            }
          </div>
          <i
            class="pi transition-transform duration-300 text-sm"
            [class.pi-chevron-down]="!filtersExpanded()"
            [class.pi-chevron-up]="filtersExpanded()"
            [class.text-gray-400]="true"
          ></i>
        </button>

        <!-- Contenido desplegable -->
        @if (filtersExpanded()) {
        <div class="px-3 pb-3 border-t border-neutral-700/50 pt-3">
          <div class="flex flex-wrap items-end gap-3">
            <!-- Filtro por Empleado -->
            <div class="flex-1 min-w-[160px]">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-user mr-1 text-xs"></i>Empleado
              </label>
              <p-select
                [options]="activeEmployeesList()"
                optionLabel="short_name"
                optionValue="id"
                placeholder="TODOS"
                filter
                showClear
                appendTo="body"
                [(ngModel)]="employeeId"
                class="w-full"
                [style]="{ 'font-size': '0.875rem' }"
              />
            </div>

            <!-- Filtro por Sucursal -->
            <div class="flex-1 min-w-[160px]">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-building mr-1 text-xs"></i>Sucursal
              </label>
              <p-select
                placeholder="TODAS"
                [(ngModel)]="branchId"
                [options]="store.branches.entities()"
                optionLabel="name"
                optionValue="id"
                showClear
                appendTo="body"
                class="w-full"
                [style]="{ 'font-size': '0.875rem' }"
              />
            </div>

            <!-- Filtros de Alertas - Reorganizado en grid 2x2 -->
            <div class="flex-1 min-w-[240px]">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-exclamation-triangle mr-1 text-xs"></i>Alertas
              </label>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                <div class="flex items-center gap-1.5">
                  <p-toggleSwitch
                    inputId="delayed"
                    [(ngModel)]="onlyDelayed"
                    [style]="{ transform: 'scale(0.85)' }"
                  />
                  <label
                    for="delayed"
                    class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                    >Retrasos</label
                  >
                </div>
                <div class="flex items-center gap-1.5">
                  <p-toggleSwitch
                    inputId="errors"
                    [(ngModel)]="onlyErrors"
                    [style]="{ transform: 'scale(0.85)' }"
                  />
                  <label
                    for="errors"
                    class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                    >Errores</label
                  >
                </div>
                <div class="flex items-center gap-1.5">
                  <p-toggleSwitch
                    inputId="earlyExit"
                    [(ngModel)]="onlyEarlyExit"
                    [style]="{ transform: 'scale(0.85)' }"
                  />
                  <label
                    for="earlyExit"
                    class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                    >Salida temprana</label
                  >
                </div>
                <div class="flex items-center gap-1.5">
                  <p-toggleSwitch
                    inputId="lunchExceededToggle"
                    [(ngModel)]="onlyLunchExceeded"
                    [style]="{ transform: 'scale(0.85)' }"
                  />
                  <label
                    for="lunchExceededToggle"
                    class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                    >Almuerzo excedido</label
                  >
                </div>
              </div>
            </div>

            <!-- Filtro de Almuerzo Excedido (condicional) -->
            @if (onlyLunchExceeded()) {
            <div class="flex-1 min-w-[160px]">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-clock mr-1 text-xs"></i>Rango de Exceso
              </label>
              <p-select
                inputId="lunchExceeded"
                [(ngModel)]="lunchExceededRange"
                [options]="lunchExceededOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                showClear
                appendTo="body"
                class="w-full"
                [style]="{ 'font-size': '0.875rem' }"
              />
            </div>
            }
          </div>
        </div>
        }
      </div>

      <!-- Total Excedido fuera del panel de filtros -->
      @if(selectedEmployee() && selectedEmployeeLunchExceeded() !== null) {
      <div
        class="mb-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-info-circle text-yellow-400"></i>
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-300"
              >Total Excedido - {{ selectedEmployee()?.first_name }}
              {{ selectedEmployee()?.father_name }}</span
            >
          </div>
          <div class="flex items-center gap-2">
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
            <span class="text-sm text-gray-400">0 minutos</span>
            }
          </div>
        </div>
      </div>
      } @if (hasError()) {
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
              <th>Horas Extras</th>
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
                    @if(log.employee.employee_number) {
                    <span class="text-xs text-gray-400 font-mono">{{
                      log.employee.employee_number
                    }}</span>
                    }
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
              <td>
                <div class="flex gap-2 items-center">
                  <span
                    [ngClass]="{
                      'text-green-500 font-semibold':
                        log.overtimeHours && log.overtimeHours > 0,
                      'text-gray-400':
                        !log.overtimeHours || log.overtimeHours === 0
                    }"
                  >
                    {{
                      log.overtimeHours ? formatHours(log.overtimeHours) : '-'
                    }}
                  </span>
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
  public employeeSearch = model<string>('');
  public store = inject(DashboardStore);
  public onlyDelayed = signal(false);
  public organizationService = inject(OrganizationService);
  private injector = inject(Injector);

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
  public filtersExpanded = signal(false);

  // Computed para verificar si hay filtros activos
  public hasActiveFilters = computed(() => {
    return (
      this.onlyDelayed() ||
      this.onlyErrors() ||
      this.onlyEarlyExit() ||
      this.onlyLunchExceeded() ||
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

  // Computed mejorado para encontrar el empleado seleccionado
  // Busca por employeeId si existe, o por employeeSearch si solo hay un resultado único
  public selectedEmployee = computed(() => {
    // Si hay un employeeId seleccionado, usarlo
    if (this.employeeId()) {
      return this.employees
        .employeesList()
        .find((x) => x.id === this.employeeId());
    }

    // Si hay búsqueda de texto, buscar empleados que coincidan (misma lógica que filteredDaylogs)
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
    if (searchTerm) {
      const matchingEmployees = this.employees.employeesList().filter((emp) => {
        // Aplicar trim a cada campo para evitar problemas con espacios en la BD
        const firstName = (emp.first_name || '').trim().toLowerCase();
        const middleName = (emp.middle_name || '').trim().toLowerCase();
        const fatherName = (emp.father_name || '').trim().toLowerCase();
        const motherName = (emp.mother_name || '').trim().toLowerCase();

        // Crear diferentes combinaciones de nombres
        const shortName = `${firstName} ${fatherName}`.trim();
        const fullName =
          `${firstName} ${middleName} ${fatherName} ${motherName}`.trim();
        const allNames = [firstName, middleName, fatherName, motherName].filter(
          (n) => n.length > 0 // Filtrar también strings vacíos después del trim
        );

        // Si el searchTerm tiene múltiples palabras, buscar que todas estén presentes
        const searchWords = searchTerm.split(/\s+/).filter((w) => w.length > 0);

        if (searchWords.length === 1) {
          // Búsqueda de una sola palabra: buscar en cualquier campo
          const word = searchWords[0];
          return (
            fullName.includes(word) ||
            shortName.includes(word) ||
            allNames.some((name) => name.includes(word))
          );
        } else {
          // Búsqueda de múltiples palabras: todas deben estar presentes en algún campo
          return searchWords.every(
            (word) =>
              fullName.includes(word) ||
              shortName.includes(word) ||
              allNames.some((name) => name.includes(word))
          );
        }
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

    // Construir URL manualmente para asegurar que los filtros se apliquen correctamente
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`;
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const select = `*,approved,schedule:schedules(*)`;

    let url = `${baseUrl}?select=${encodeURIComponent(
      select
    )},employee:employees(id,company_id)`;
    url += `&start_date=gte.${startDate}`;
    url += `&end_date=lte.${endDate}`;

    // Filtrar a través de employees.company_id (funciona incluso si employee_schedules no tiene company_id)
    if (companyId) {
      url += `&employee.company_id=eq.${companyId}`;
    }

    return {
      url,
      method: 'GET',
    };
  });

  public timeoffs = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }
    
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      return undefined;
    }
    
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
      method: 'GET',
      params: {
        // Ahora podemos filtrar directamente por company_id ya que se agregó el campo a la tabla
        select:
          'id,type_id,employee_id,date_from,date_to,is_approved,company_id,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(company_id)',
        date_from: `lte.${format(end, 'yyyy-MM-dd')}`,
        date_to: `gte.${format(start, 'yyyy-MM-dd')}`,
        is_approved: 'eq.true',
        // Filtrar directamente por company_id (campo agregado a la tabla)
        company_id: `eq.${companyId}`,
      },
    };
  });

  public logs = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return undefined;
    }

    // Construir URL manualmente para tener control total sobre los filtros
    // PostgREST/Supabase requiere construir la URL manualmente cuando hay múltiples filtros en el mismo campo
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(start, "yyyy-MM-dd'T'06:00:00");
    const endDate = format(addDays(end, 1), "yyyy-MM-dd'T'06:00:00");

    // Construir select con relaciones (solo empleados activos)
    const select = `*,employee:employees!inner(id,first_name,father_name,is_active,branch:branches(id, name)),branch:branches(id, name, short_name)`;

    // Construir URL con todos los parámetros
    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;

    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;

    if (this.employeeId()) {
      url += `&employee_id=eq.${this.employeeId()}`;
    }

    // Filtrar directamente por company_id de timelogs (la tabla tiene este campo)
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }

    url += `&order=created_at.asc`;

    // Debug: Log para timelogs
    console.log('[TimelogsComponent] Cargando timelogs con URL:', url);
    console.log('[TimelogsComponent] Company ID:', companyId);
    console.log(
      '[TimelogsComponent] Rango de fechas:',
      format(start, 'yyyy-MM-dd'),
      'a',
      format(end, 'yyyy-MM-dd')
    );
    console.log(
      '[TimelogsComponent] Employee ID:',
      this.employeeId() || 'Todos'
    );

    return {
      url,
      method: 'GET',
    };
  });

  // Computed para detectar errores en las peticiones HTTP
  public hasError = computed(() => {
    const logsError = this.logs.error();
    const schedulesError = this.schedules.error();
    const timeoffsError = this.timeoffs.error();

    if (logsError || schedulesError || timeoffsError) {
      console.error('[TimelogsComponent] ❌ Error cargando datos:', {
        logs: logsError,
        schedules: schedulesError,
        timeoffs: timeoffsError,
      });

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

  constructor() {
    // Debug: Effect para verificar datos cargados
    effect(
      () => {
        const logsData = this.logs.value();
        const schedulesData = this.schedules.value();
        const timeoffsData = this.timeoffs.value();
        const logsError = this.logs.error();
        const schedulesError = this.schedules.error();
        const timeoffsError = this.timeoffs.error();

        const timelogsCount = logsData?.length ?? 0;
        const schedulesCount = schedulesData?.length ?? 0;
        const timeoffsCount = timeoffsData?.length ?? 0;

        console.log('[TimelogsComponent] 📊 Datos cargados:', {
          timelogs: timelogsCount,
          employee_schedules: schedulesCount,
          timeoffs: timeoffsCount,
        });

        if (logsError) {
          console.error(
            '[TimelogsComponent] ❌ Error cargando timelogs:',
            logsError
          );
        }
        if (schedulesError) {
          console.error(
            '[TimelogsComponent] ❌ Error cargando employee_schedules:',
            schedulesError
          );
        }
        if (timeoffsError) {
          console.error(
            '[TimelogsComponent] ❌ Error cargando timeoffs:',
            timeoffsError
          );
        }

        if (logsData && logsData.length === 0 && !logsError) {
          console.warn(
            '[TimelogsComponent] ⚠️ No se encontraron timelogs. Verificar:',
            {
              company_id: this.organizationService.getCurrentCompanyId(),
              dateRange: this.dateRange(),
              employeeId: this.employeeId() || 'Todos',
            }
          );
        }

        // Mostrar muestra de timelogs si hay datos
        if (logsData && logsData.length > 0) {
          console.log(
            '[TimelogsComponent] ✅ Timelogs encontrados:',
            timelogsCount
          );
          console.log(
            '[TimelogsComponent] 📋 Muestra (primeros 5):',
            logsData.slice(0, 5).map((log) => ({
              id: log.id,
              employee_id: log.employee_id,
              company_id: log.company_id,
              branch_id: log.branch_id,
              type: log.type,
              created_at: log.created_at,
              employee: log.employee
                ? `${log.employee.first_name} ${log.employee.father_name}`
                : 'N/A',
              branch: log.branch ? log.branch.name : 'N/A',
            }))
          );
          console.log(
            '[TimelogsComponent] 📊 Distribución por company_id:',
            logsData.reduce((acc: any, log: any) => {
              const cid = log.company_id || 'NULL';
              acc[cid] = (acc[cid] || 0) + 1;
              return acc;
            }, {})
          );

          // Verificar si hay timelogs con company_id diferente
          const currentCompanyId =
            this.organizationService.getCurrentCompanyId();
          const wrongCompanyId = logsData.filter(
            (log) => log.company_id !== currentCompanyId
          );
          if (wrongCompanyId.length > 0) {
            console.warn(
              '[TimelogsComponent] ⚠️ Timelogs con company_id incorrecto:',
              wrongCompanyId.length
            );
            console.warn('  - Company ID esperado:', currentCompanyId);
            console.warn(
              '  - Timelogs con company_id diferente:',
              wrongCompanyId.slice(0, 3).map((log) => ({
                id: log.id,
                company_id: log.company_id,
                employee_id: log.employee_id,
              }))
            );
          }
        } else if (!logsError) {
          console.warn('[TimelogsComponent] ⚠️ No se encontraron timelogs');
          console.warn(
            '  - Verificar que existan timelogs en la base de datos para:'
          );
          console.warn(
            '    * Company ID:',
            this.organizationService.getCurrentCompanyId()
          );
          console.warn('    * Rango de fechas:', this.dateRange());
          console.warn('    * Employee ID:', this.employeeId() || 'Todos');
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
      console.log('[TimelogsComponent] ⚠️ dayLogs: No hay rango de fechas');
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

    console.log('[TimelogsComponent] 📊 dayLogs - Datos de entrada:', {
      timelogs: logsData.length,
      employee_schedules: schedulesData.length,
      timeoffs: timeoffsData.length,
      days: daysList.length,
      dateRange: `${dateRangeStart} a ${dateRangeEnd}`,
    });

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
      overtimeHours?: number; // Horas extras (más de 9 horas totales)
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
          overtimeHours: undefined,
          entry: undefined,
          lunch_start: undefined,
          lunch_end: undefined,
          exit: undefined,
        });
      });
    });

    console.log('[TimelogsComponent] 📊 dayLogs - Antes de procesar:', {
      filteredLogs: filteredLogs.length,
      uniqueEmployees: uniqueEmployees.size,
      daysList: daysList.length,
      accInicial: acc.length,
    });

    // Ahora procesar los logs para actualizar los registros creados
    const result = filteredLogs
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
          overtimeHours?: number; // Horas extras (más de 9 horas totales)
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

              // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
              // 9 horas = 540 minutos
              const requiredTotalMinutes = 540; // 9 horas totales (540 minutos)
              const overtimeByTotalTime =
                totalMinutes > requiredTotalMinutes
                  ? totalMinutes - requiredTotalMinutes
                  : 0;

              // Calcular minutos excedidos del almuerzo (más de 60 minutos)
              // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
              const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

              // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
              const totalOvertimeMinutes = Math.max(
                0,
                overtimeByTotalTime - lunchExceededMinutes
              );
              acc[index].overtimeHours =
                totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;

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

            // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
            // 9 horas = 540 minutos
            const requiredTotalMinutes = 540; // 9 horas totales (540 minutos)
            const overtimeByTotalTime =
              totalMinutes > requiredTotalMinutes
                ? totalMinutes - requiredTotalMinutes
                : 0;

            // Calcular minutos excedidos del almuerzo (más de 60 minutos)
            // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
            const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

            // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
            const totalOvertimeMinutes = Math.max(
              0,
              overtimeByTotalTime - lunchExceededMinutes
            );
            acc[index].overtimeHours =
              totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;
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
          (a.employee.first_name || '') + ' ' + (a.employee.father_name || '');
        const nameB =
          (b.employee.first_name || '') + ' ' + (b.employee.father_name || '');
        return nameA.localeCompare(nameB);
      })
      // Filtrar días finales que estén dentro del rango (validación final)
      .filter((x) => {
        const dayStr = x.day;
        // Asegurar que la fecha esté en el rango correcto
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      });

    console.log('[TimelogsComponent] ✅ dayLogs - Procesamiento completado:', {
      totalRegistros: result.length,
      conEntrada: result.filter((x) => x.entry).length,
      conSalida: result.filter((x) => x.exit).length,
      conAlmuerzo: result.filter((x) => x.lunch_start && x.lunch_end).length,
      conErrores: result.filter((x) => x.scheduleError).length,
      conAlertas: result.filter((x) => x.alert).length,
      conMarcaciones: result.filter((x) => x.entry || x.lunch_start || x.exit)
        .length,
    });

    return result;
  });

  public filteredDaylogs = computed(() => {
    const dayLogsData = this.dayLogs();
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';

    // Filtrar manteniendo el mismo orden que dayLogs
    const filtered = dayLogsData.filter((x) => {
      // Filtrar por employeeId si está seleccionado
      if (this.employeeId()) {
        if (x.employee?.id !== this.employeeId()) {
          return false;
        }
      }

      // Filtrar por branchId si está seleccionado
      if (this.branchId()) {
        if (x.employee?.branch_id !== this.branchId()) {
          return false;
        }
      }

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
    console.log(
      '[TimelogsComponent] ✅ filteredDaylogs - Filtrado completado:',
      {
        totalAntes: dayLogsData.length,
        totalDespues: filtered.length,
        filtrosAplicados: {
          onlyDelayed: this.onlyDelayed(),
          onlyErrors: this.onlyErrors(),
          onlyEarlyExit: this.onlyEarlyExit(),
          onlyLunchExceeded: this.onlyLunchExceeded(),
        },
      }
    );

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
