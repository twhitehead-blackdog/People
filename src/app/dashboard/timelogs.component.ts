import { DatePipe, NgClass } from '@angular/common';
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
import { addDays, differenceInMinutes, format, isAfter, isBefore, startOfMonth } from 'date-fns';
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
import { Branch, colorVariants, Employee } from '../models';
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
    ToggleSwitch,
  ],
  template: `<p-card
    header="Marcaciones"
    subheader="Listado de marcaciones de empleados"
  >
    <div class="flex items-center gap-4 mb-3">
      <div class="flex items-center gap-2">
        <label for="delayed">Solo retrasos</label>
        <p-toggleSwitch
          inputId="delayed"
          [(ngModel)]="onlyDelayed"
          onLabel="Solo retrasos"
          offLabel="Todos"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="errors">Solo errores</label>
        <p-toggleSwitch
          inputId="errors"
          [(ngModel)]="onlyErrors"
          onLabel="Solo errores"
          offLabel="Todos"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="earlyExit">Solo salida temprana</label>
        <p-toggleSwitch
          inputId="earlyExit"
          [(ngModel)]="onlyEarlyExit"
          onLabel="Solo salida temprana"
          offLabel="Todos"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="lunchExceededToggle">Solo almuerzo excedido</label>
        <p-toggleSwitch
          inputId="lunchExceededToggle"
          [(ngModel)]="onlyLunchExceeded"
          onLabel="Solo almuerzo excedido"
          offLabel="Todos"
        />
        @if(onlyLunchExceeded()) {
        <p-select
          inputId="lunchExceeded"
          [(ngModel)]="lunchExceededRange"
          [options]="lunchExceededOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Todos"
          showClear
          appendTo="body"
          class="w-48"
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
          placeholder="Fecha"
          selectionMode="range"
          appendTo="body"
          [(ngModel)]="dateRange"
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
      scrollHeight="600px"
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
        <tr [ngClass]="{ 'bg-amber-50/10': log.alert, 'bg-red-50/10': log.scheduleError }">
          <td>
            <div class="flex items-center gap-2">
              {{ log.employee.first_name }} {{ log.employee.father_name }}
              @if(log.scheduleError) {
              <p-tag
                value="Error de Horario"
                severity="danger"
                icon="pi pi-exclamation-triangle"
                [pTooltip]="log.alert + ': El empleado trabajó pero está marcado como feriado/día libre. No hay horario válido para estas marcaciones. El gerente debe corregir la configuración.'"
                tooltipPosition="top"
              />
              } @else if(log.alert) {
              <p-tag
                [value]="log.alert"
                [severity]="getAlertSeverity(log.alert)"
                [icon]="getAlertIcon(log.alert)"
                [pTooltip]="getAlertTooltip(log.alert)"
                tooltipPosition="top"
              />
              }
            </div>
          </td>
          <td>{{ log.day | date : 'mediumDate' }}</td>
          <td>
            <span
              class="rounded text-sm px-2 py-1 font-semibold"
              [ngClass]="
                log.schedule?.schedule
                  ? colorVariants[log.schedule.schedule.color]
                  : ''
              "
              >{{ log?.schedule?.schedule?.name || 'Sin horario' }}</span
            >
          </td>
          <td>
            <div class="flex gap-3 items-center">
              <span
                [ngClass]="{
                  'text-red-500 font-semibold': log.delay
                }"
                >{{ log.entry?.date | date : 'hh:mm a' }}</span
              >
              @if(log.entry) {
              <p-avatar
                class="cursor-pointer"
                shape="circle"
                [label]="log.entry?.branch.short_name"
                [pTooltip]="log.entry?.branch.name"
                tooltipPosition="top"
              />}
              {{ log.delay ? 'Retraso de ' + log.delay + ' min' : '' }}
            </div>
          </td>
          <td>
            <div class="flex gap-1 items-center">
              {{ log.lunch_start?.date | date : 'hh:mm a' }}
              @if(log.lunch_start) {
              <p-avatar
                shape="circle"
                [label]="log.lunch_start?.branch.short_name"
                [pTooltip]="log.lunch_start?.branch.name"
                tooltipPosition="top"
              />
              }
            </div>
          </td>
          <td>
            <div class="flex gap-1 items-center">
              <span
                [ngClass]="{
                  'text-red-500 font-semibold': log.lunchExceeded
                }"
                >{{ log.lunch_end?.date | date : 'hh:mm a' }}</span
              >
              @if(log.lunch_end) {
              <p-avatar
                shape="circle"
                [label]="log.lunch_end?.branch.short_name"
                [pTooltip]="log.lunch_end?.branch.name"
                tooltipPosition="top"
              />}
              @if(log.lunchExceeded) {
              <p-tag
                [value]="'Almuerzo ' + log.lunchMinutes + ' min'"
                severity="danger"
                icon="pi pi-exclamation-triangle"
                [pTooltip]="'El tiempo de almuerzo excede los 60 minutos permitidos'"
                tooltipPosition="top"
              />
              }
            </div>
          </td>
          <td>
            <div class="flex gap-1 items-center">
              <span
                [ngClass]="{
                  'text-red-500 font-semibold': log.earlyExit
                }"
                >{{ log.exit?.date | date : 'hh:mm a' }}</span
              >
              @if(log.exit) {
              <p-avatar
                shape="circle"
                [label]="log.exit?.branch.short_name"
                [pTooltip]="log.exit?.branch.name"
                tooltipPosition="top"
              />}
              @if(log.earlyExit) {
              <p-tag
                value="Salida temprana"
                severity="danger"
                icon="pi pi-exclamation-triangle"
                [pTooltip]="'El empleado salió antes del horario laboral establecido'"
                tooltipPosition="top"
              />
              }
            </div>
          </td>
          <td>
            <div class="flex flex-col gap-1">
              <span [ngClass]="{
                'text-red-500 font-semibold': log.insufficientHours,
                'text-green-500 font-semibold': !log.insufficientHours && log.totalHours
              }">
                {{ log.totalHours ? formatHours(log.totalHours) : '-' }}
              </span>
              @if(log.insufficientHours) {
              <p-tag
                value="Menos de 9h"
                severity="danger"
                icon="pi pi-clock"
                [pTooltip]="'El empleado no cumplió las 9 horas requeridas en la empresa (ej: 7am-4pm, 8am-5pm, 11am-8pm)'"
                tooltipPosition="top"
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
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsComponent {
  public employees = inject(EmployeesStore);
  public dateRange = signal<Date[]>([startOfMonth(new Date()), new Date()]);
  public employeeId = model<string>();
  public branchId = model<string>();
  public store = inject(DashboardStore);
  public onlyDelayed = signal(false);
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
    'f2d92995-96a0-414f-b64a-9823db776745'
  ];

  // IDs de schedules que son permisos/feriados y NO deberían tener marcaciones
  private readonly restrictedScheduleIds = [
    '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
    '4983c002-7c5d-4440-a4f2-52f61acdd67a', // Incapacidad
    'c01dff8f-ce0d-498f-a473-46418576e589', // Dia Libre
    'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf', // Licencia maternidad
    'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
    'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
    '37707c00-8f6f-4065-9975-b3ef37fe98d7'  // Licencia de maternidad
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
    'paternidad'
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

  days = computed(() => {
    const days = [];
    for (
      let date = this.dateRange()?.[0];
      date <= this.dateRange()?.[1];
      date = addDays(date, 1)
    ) {
      days.push(format(date, 'yyyy-MM-dd'));
    }
    return days;
  });

  public schedules = httpResource<any[]>(() => {
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      method: 'GET',
      params: {
        select: '*,schedule:schedules(*)',
        start_date: `gte.${format(this.dateRange()[0], 'yyyy-MM-dd 06:00:00')}`,
        end_date: `lte.${format(this.dateRange()[1], 'yyyy-MM-dd 06:00:00')}`,
      },
    };
  });

  public timeoffs = httpResource<any[]>(() => {
    if (!this.dateRange()[0] || !this.dateRange()[1]) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
      method: 'GET',
      params: {
        select: 'id,type_id,employee_id,date_from,date_to,is_approved,type:timeoff_types(id,name)',
        date_from: `lte.${format(this.dateRange()[1], 'yyyy-MM-dd')}`,
        date_to: `gte.${format(this.dateRange()[0], 'yyyy-MM-dd')}`,
        is_approved: 'eq.true',
      },
    };
  });

  public logs = httpResource<any[]>(() => {
    if (!this.dateRange()[0] || !this.dateRange()[1]) {
      return undefined;
    }
    return {
      url: `${
        process.env['ENV_SUPABASE_URL']
      }/rest/v1/timelogs?created_at=lte.${format(
        addDays(this.dateRange()[1], 1),
        'yyyy-MM-dd 06:00:00'
      )}`,
      method: 'GET',
      params: this.queryParams(),
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
    const params: {
      select: string;
      created_at: string;
      employee_id?: string;
    } = {
      select:
        '*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)',
      created_at: `gte.${format(this.dateRange()[0], 'yyyy-MM-dd 06:00:00')}`,
    };
    if (this.employeeId()) {
      params['employee_id'] = `eq.${this.employeeId()}`;
    }
    return params;
  });

  public dayLogs = computed(() =>
    (this.logs.value() ?? [])
      .filter((x) =>
        this.branchId() ? x.employee.branch.id === this.branchId() : true
      )
      .map((x) => ({ ...x, day: format(x.created_at, 'yyyy-MM-dd') }))
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
        if (!acc.filter((day) => day.employee.id === x.employee.id).length) {
          this.days().forEach((day) => {
            const schedule = this.schedules
              .value()
              ?.find(
                (schedule) =>
                  schedule.employee_id === x.employee.id &&
                  schedule.start_date <= day &&
                  schedule.end_date >= day
              );

            acc.push({
              employee: x.employee,
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
        }

        const index = acc.findIndex(
          (y) => y.day === x.day && y.employee.id === x.employee.id
        );

        acc[index] = {
          ...acc[index],
          [x.type]: { date: x.created_at, branch: x.branch, id: x.id },
        };
        
        // Detectar alertas cuando hay marcación
        const dayDate = new Date(acc[index].day);
        const dayStr = format(dayDate, 'yyyy-MM-dd');
        const timeoffForDay = this.timeoffs
          .value()
          ?.find(
            (timeoff) => {
              if (timeoff.employee_id !== acc[index].employee.id) return false;
              const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
              const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
              return dayStr >= fromStr && dayStr <= toStr;
            }
          );
        const hasTimeOff = !!timeoffForDay;
        // El type_id puede estar directamente o anidado en type (según el query)
        const timeoffTypeId = timeoffForDay?.type_id || timeoffForDay?.type?.id;
        const hasRestrictedTimeOff = hasTimeOff && timeoffForDay && timeoffTypeId && this.restrictedTimeOffTypeIds.includes(timeoffTypeId);

        // Verificar si hay marcación para mostrar alertas
        const hasMark = acc[index].entry || acc[index].lunch_start || acc[index].exit;

        // Verificar si el schedule es feriado o día libre
        const scheduleId = acc[index].schedule?.schedule?.id;
        const scheduleName = acc[index].schedule?.schedule?.name?.toLowerCase() || '';
        const isRestrictedScheduleId = scheduleId && this.restrictedScheduleIds.includes(scheduleId);
        const isRestrictedScheduleName = this.restrictedScheduleNames.some(name => scheduleName.includes(name));
        const isScheduleFeriado = isRestrictedScheduleId || isRestrictedScheduleName || acc[index].schedule?.schedule?.day_off;

        // SIEMPRE marcar como error si hay timeoff y marcaciones (no hay horario válido)
        if (hasTimeOff && hasMark) {
          acc[index].alert = 'Feriado';
          acc[index].scheduleError = true; // Error crítico: marcó en día de feriado/permiso (no hay horario válido)
        }

        // SIEMPRE marcar como error si el schedule es feriado/día libre y hay marcaciones
        if (isScheduleFeriado && hasMark) {
          acc[index].alert = acc[index].schedule?.schedule?.day_off ? 'Día Libre' : 'Feriado';
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
              acc[index].alert = acc[index].schedule.schedule.day_off ? 'Día Libre' : 'Feriado';
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
          if (acc[index].schedule && acc[index].exit && !acc[index].schedule.schedule.day_off) {
            const exitTime = format(acc[index].exit.date, 'HH:mm:ss');
            const scheduleExitTime = acc[index].schedule.schedule.exit_time;
            if (scheduleExitTime) {
              // Convertir scheduleExitTime a string si es Date
              const scheduleTimeStr = typeof scheduleExitTime === 'string' 
                ? scheduleExitTime 
                : format(new Date(scheduleExitTime), 'HH:mm:ss');
              
              const exitParts = exitTime.split(':');
              const scheduleParts = scheduleTimeStr.split(':');
              
              const exitMinutes = (+exitParts[0] * 60) + (+exitParts[1]);
              const scheduleMinutes = (+scheduleParts[0] * 60) + (+scheduleParts[1]);
              
              if (exitMinutes < scheduleMinutes) {
                acc[index].earlyExit = true;
              }
            }
          }

          // Validar horas trabajadas (9 horas totales en la empresa: 7am-4pm, 8am-5pm, 11am-8pm)
          // Se calcula desde la hora establecida del horario, no desde la entrada real
          if (acc[index].entry && acc[index].exit && acc[index].schedule && !acc[index].schedule.schedule.day_off) {
            const scheduleEntryTime = acc[index].schedule.schedule.entry_time;
            const scheduleExitTime = acc[index].schedule.schedule.exit_time;
            
            if (scheduleEntryTime && scheduleExitTime) {
              // Crear fechas usando la hora establecida del horario
              const entryDate = new Date(acc[index].entry.date);
              const exitDate = new Date(acc[index].exit.date);
              
              // Convertir scheduleEntryTime a string si es Date
              const entryTimeStr = typeof scheduleEntryTime === 'string' 
                ? scheduleEntryTime 
                : format(new Date(scheduleEntryTime), 'HH:mm:ss');
              
              // Establecer la hora de entrada según el horario establecido
              const entryParts = entryTimeStr.split(':');
              entryDate.setHours(+entryParts[0], +entryParts[1], +entryParts[2] || 0, 0);
              
              // Calcular desde la hora establecida hasta la salida real
              const totalMinutes = differenceInMinutes(exitDate, entryDate);
              
              // Restar tiempo de almuerzo si existe
              const lunchTime = acc[index].lunch_start && acc[index].lunch_end
                ? differenceInMinutes(acc[index].lunch_end.date, acc[index].lunch_start.date)
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
              if (lunchStart && lunchEnd && 
                  !isNaN(new Date(lunchStart).getTime()) && 
                  !isNaN(new Date(lunchEnd).getTime())) {
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
      }, [])
      .sort((a, b) =>
        (a.employee.first_name || '').localeCompare(b.employee.first_name || '')
      )
  );

  public filteredDaylogs = computed(() =>
    this.dayLogs().filter((x) => {
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
          hasMarks && (
            x.alert === 'Sin Horario' ||
            x.alert === 'Día Libre' ||
            x.alert === 'Feriado'
          )
        );
      }
      return true;
    })
  );

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
      isNaN(hours1) || isNaN(minutes1) || isNaN(hours2) || isNaN(minutes2) ||
      hours1 < 0 || hours1 > 23 || minutes1 < 0 || minutes1 > 59 ||
      hours2 < 0 || hours2 > 23 || minutes2 < 0 || minutes2 > 59
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

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  public timelogsReport = computed(() =>
    this.dayLogs().map((x) => {
      const lunchMinutes = x.lunchMinutes || 0;
      const lunchExceeded = x.lunchExceeded ? `EXCEDIDO (${lunchMinutes} min)` : lunchMinutes > 0 ? `${lunchMinutes} min` : '';
      const totalHours = x.totalHours ? this.formatHours(x.totalHours) : '-';
      const errors = [];
      if (x.scheduleError) errors.push('Error de Horario');
      if (x.lunchExceeded) errors.push('Almuerzo Excedido');
      if (x.earlyExit) errors.push('Salida Temprana');
      if (x.insufficientHours) errors.push('Horas Insuficientes');
      if (x.alert && !x.scheduleError) errors.push(x.alert);
      
      return {
        'Empleado': x.employee.first_name + ' ' + x.employee.father_name,
        'Fecha': format(new Date(x.day), 'dd/MM/yyyy'),
        'Día Semana': format(new Date(x.day), 'EEEE', { locale: es }),
        'Horario': x.schedule?.schedule?.name || 'Sin horario',
        'Sucursal Entrada': x.entry?.branch?.name || '',
        'Entrada': x.entry?.date ? format(x.entry?.date, 'HH:mm') : 'SIN MARCA',
        'Retraso': typeof x.delay === 'number' ? `${x.delay} min` : x.delay || '',
        'Inicio Almuerzo': x.lunch_start?.date ? format(x.lunch_start?.date, 'HH:mm') : 'SIN MARCA',
        'Fin Almuerzo': x.lunch_end?.date ? format(x.lunch_end?.date, 'HH:mm') : 'SIN MARCA',
        'Tiempo Almuerzo': lunchExceeded,
        'Sucursal Salida': x.exit?.branch?.name || '',
        'Salida': x.exit?.date ? format(x.exit?.date, 'HH:mm') : 'SIN MARCA',
        'Horas Trabajadas': totalHours,
        'Errores/Alertas': errors.join(', ') || 'Ninguno',
        'Salida Temprana': x.earlyExit ? 'Sí' : 'No',
        'Horas Insuficientes': x.insufficientHours ? 'Sí' : 'No',
      };
    })
  );

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
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 25 }, // Empleado
        { wch: 12 }, // Fecha
        { wch: 12 }, // Día Semana
        { wch: 20 }, // Horario
        { wch: 20 }, // Sucursal Entrada
        { wch: 10 }, // Entrada
        { wch: 10 }, // Retraso
        { wch: 15 }, // Inicio Almuerzo
        { wch: 15 }, // Fin Almuerzo
        { wch: 15 }, // Tiempo Almuerzo
        { wch: 20 }, // Sucursal Salida
        { wch: 10 }, // Salida
        { wch: 15 }, // Horas Trabajadas
        { wch: 30 }, // Errores/Alertas
        { wch: 15 }, // Salida Temprana
        { wch: 18 }, // Horas Insuficientes
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
        ['Período:', `${format(this.dateRange()[0], 'dd/MM/yyyy')} - ${format(this.dateRange()[1], 'dd/MM/yyyy')}`],
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
      const name = this.selectedEmployee()
        ? trim(this.selectedEmployee()?.short_name.toUpperCase()).replace(' ', '_')
        : 'GLOBAL';
      const fileName = `${name}_${format(this.dateRange()[0], 'yyyyMMdd')}-${format(this.dateRange()[1], 'yyyyMMdd')}.xlsx`;
      
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
