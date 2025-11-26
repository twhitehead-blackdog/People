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
          placeholder="Fecha o Rango"
          selectionMode="range"
          appendTo="body"
          [(ngModel)]="dateRange"
          [maxDate]="getMaxDate()"
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
              <i class="pi pi-wrench text-4xl text-amber-400 mb-2"></i>
              <p class="text-gray-400 text-lg font-semibold">En construcción</p>
              <p class="text-sm text-gray-500">Esta funcionalidad estará disponible pronto</p>
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
  public dateRange = signal<Date[] | Date | null>([startOfMonth(new Date()), new Date()]);
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

  // Computed para obtener la fecha de inicio (puede ser un solo día o el inicio del rango)
  private getStartDate(): Date | null {
    const range = this.dateRange();
    if (!range) return null;
    if (Array.isArray(range)) {
      return range[0] || null;
    }
    return range;
  }

  // Computed para obtener la fecha de fin (puede ser un solo día o el fin del rango)
  private getEndDate(): Date | null {
    const range = this.dateRange();
    if (!range) return null;
    if (Array.isArray(range)) {
      return range[1] || range[0] || null; // Si solo hay una fecha en el array, usar esa
    }
    return range; // Si es un solo Date, usar ese mismo
  }

  days = computed(() => {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate) {
      return [];
    }
    
    // Si no hay endDate o es la misma que startDate, retornar solo un día
    if (!endDate || startDate.getTime() === endDate.getTime()) {
      const normalizedDate = new Date(startDate);
      normalizedDate.setHours(0, 0, 0, 0);
      return [format(normalizedDate, 'yyyy-MM-dd')];
    }
    
    // Si hay rango, generar todos los días del rango
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
    
    return days.sort();
  });

  public schedules = httpResource<any[]>(() => {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    if (!startDate) return undefined;
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = endDate && endDate.getTime() !== startDate.getTime() 
      ? format(endDate, 'yyyy-MM-dd')
      : startStr;
    
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      method: 'GET',
      params: {
        select: '*,schedule:schedules(*)',
        start_date: `lte.${endStr}T23:59:59`,
        end_date: `gte.${startStr}T00:00:00`,
      },
    };
  });

  public timeoffs = httpResource<any[]>(() => {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    if (!startDate) return undefined;
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = endDate && endDate.getTime() !== startDate.getTime() 
      ? format(endDate, 'yyyy-MM-dd')
      : startStr;
    
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
      method: 'GET',
      params: {
        select: 'id,type_id,employee_id,date_from,date_to,is_approved,type:timeoff_types(id,name)',
        date_from: `lte.${endStr}`,
        date_to: `gte.${startStr}`,
        is_approved: 'eq.true',
      },
    };
  });

  public logs = httpResource<any[]>(() => {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    if (!startDate) return undefined;
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    // Si es un solo día, usar el día siguiente como límite superior
    // Si es un rango, usar el día siguiente al último día del rango
    const effectiveEndDate = endDate && endDate.getTime() !== startDate.getTime() 
      ? endDate 
      : startDate;
    const nextDayStr = format(addDays(effectiveEndDate, 1), 'yyyy-MM-dd');
    
    const params: Record<string, string> = {
      select:
        '*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)',
      and: `(created_at.gte.${startStr}T00:00:00,created_at.lt.${nextDayStr}T00:00:00)`,
    };
    if (this.employeeId()) {
      params['employee_id'] = `eq.${this.employeeId()}`;
    }
    
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
      method: 'GET',
      params: params,
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


  public dayLogs = computed(() => {
    // Obtener las fechas (puede ser un solo día o un rango)
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate) {
      return [];
    }
    
    // Normalizar fechas al inicio del día para comparaciones precisas
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');
    
    // Si no hay endDate o es la misma que startDate, usar solo startDate
    const normalizedEnd = endDate && endDate.getTime() !== startDate.getTime()
      ? new Date(endDate)
      : normalizedStart;
    normalizedEnd.setHours(0, 0, 0, 0);
    const dateRangeEnd = format(normalizedEnd, 'yyyy-MM-dd');
    
    // Obtener valores una sola vez para evitar múltiples accesos
    const logsData = this.logs.value() ?? [];
    const schedulesData = this.schedules.value() ?? [];
    const timeoffsData = this.timeoffs.value() ?? [];
    const daysList = this.days();
    
    // Validar que daysList esté completo
    if (daysList.length === 0 || !daysList.includes(dateRangeStart)) {
      // Si hay inconsistencias, regenerar daysList con el rango de fechas
      const allDays = [];
      let currentDate = new Date(normalizedStart);
      while (currentDate <= normalizedEnd) {
        allDays.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate = addDays(currentDate, 1);
      }
      daysList.length = 0;
      daysList.push(...allDays);
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
        return logDay >= dateRangeStart && logDay <= dateRangeEnd && logDay !== format(new Date('1900-01-01'), 'yyyy-MM-dd');
      });
    
    // Obtener empleados únicos que tienen logs en el rango o que están activos
    const uniqueEmployees = new Map<string, Partial<Employee>>();
    
    // Primero agregar empleados que tienen logs
    filteredLogs.forEach((log) => {
      if (log.employee?.id && !uniqueEmployees.has(log.employee.id)) {
        uniqueEmployees.set(log.employee.id, log.employee);
      }
    });
    
    // También agregar empleados activos seleccionados si hay filtro por empleado
    if (this.employeeId()) {
      const selectedEmployee = this.employees.employeesList().find(emp => emp.id === this.employeeId());
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
    return filteredLogs.reduce<
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
        
        return acc;
      }, acc)
      // Ahora procesar TODOS los registros (con y sin marcaciones) para detectar vacaciones y otros estados
      .map((item) => {
        // Detectar alertas y estados para cada día
        const dayDate = new Date(item.day);
        const dayStr = format(dayDate, 'yyyy-MM-dd');
        const timeoffForDay = timeoffsData.find(
            (timeoff) => {
              if (timeoff.employee_id !== item.employee.id) return false;
              if (!timeoff.is_approved) return false;
              const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
              const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
              return dayStr >= fromStr && dayStr <= toStr;
            }
          );
        const hasTimeOff = !!timeoffForDay;
        // El type_id puede estar directamente o anidado en type (según el query)
        const timeoffTypeId = timeoffForDay?.type_id || timeoffForDay?.type?.id;
        const isVacation = hasTimeOff && timeoffTypeId === 'e7e63bb4-ca86-4091-85fa-c4da16545b49';
        const hasRestrictedTimeOff = hasTimeOff && timeoffForDay && timeoffTypeId && this.restrictedTimeOffTypeIds.includes(timeoffTypeId);

        // Verificar si hay marcación para mostrar alertas
        const hasMark = item.entry || item.lunch_start || item.exit;

        // Verificar si el schedule es feriado o día libre
        const scheduleId = item.schedule?.schedule?.id;
        const scheduleName = item.schedule?.schedule?.name?.toLowerCase() || '';
        const isRestrictedScheduleId = scheduleId && this.restrictedScheduleIds.includes(scheduleId);
        const isRestrictedScheduleName = this.restrictedScheduleNames.some(name => scheduleName.includes(name));
        const isScheduleFeriado = isRestrictedScheduleId || isRestrictedScheduleName || item.schedule?.schedule?.day_off;

        // SIEMPRE marcar como error si hay timeoff y marcaciones (no hay horario válido)
        if (hasTimeOff && hasMark) {
          item.alert = 'Feriado';
          item.scheduleError = true; // Error crítico: marcó en día de feriado/permiso (no hay horario válido)
        }

        // SIEMPRE marcar como error si el schedule es feriado/día libre y hay marcaciones
        if (isScheduleFeriado && hasMark) {
          item.alert = item.schedule?.schedule?.day_off ? 'Día Libre' : 'Feriado';
          item.scheduleError = true; // Error crítico: marcó en día feriado/libre (no debería tener marcaciones)
        }

        if (hasMark) {
          // Prioridad: Feriado > Día Libre > Sin Horario
          if (hasTimeOff) {
            // Ya se marcó arriba, solo asegurar que esté marcado
            if (!item.scheduleError) {
              item.scheduleError = true;
            }
          } else if (item.schedule) {
            if (item.schedule.schedule.day_off || isScheduleFeriado) {
              // Si es día libre o feriado pero el empleado marcó, es un error de configuración
              item.delay = 'DIA LIBRE';
              item.alert = item.schedule.schedule.day_off ? 'Día Libre' : 'Feriado';
              item.scheduleError = true; // Error: marcó en día libre/feriado
            } else {
              // Calcular retraso si hay entrada
              if (item.entry) {
                const entryTime = format(item.entry.date, 'hh:mm:ss');
                const scheduleTime = item.schedule.schedule.entry_time;
                const delay = this.calcTimeDiff(entryTime, scheduleTime);

                if (delay > item.schedule.schedule.minutes_tolerance) {
                  item.delay = delay;
                }
              }
            }
          } else {
            // Sin horario establecido
            item.alert = 'Sin Horario';
          }

          // Validar tiempo de almuerzo (no debe exceder 60 minutos)
          if (item.lunch_start && item.lunch_end) {
            const lunchMinutes = differenceInMinutes(
              item.lunch_end.date,
              item.lunch_start.date
            );
            item.lunchMinutes = lunchMinutes;
            if (lunchMinutes > 60) {
              item.lunchExceeded = true;
            }
          }

          // Validar salida temprana
          if (item.schedule && item.exit && !item.schedule.schedule.day_off) {
            const exitTime = format(item.exit.date, 'HH:mm:ss');
            const scheduleExitTime = item.schedule.schedule.exit_time;
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
                item.earlyExit = true;
              }
            }
          }

          // Validar horas trabajadas (9 horas totales en la empresa: 7am-4pm, 8am-5pm, 11am-8pm)
          // Se calcula desde la hora establecida del horario, no desde la entrada real
          if (item.entry && item.exit && item.schedule && !item.schedule.schedule.day_off) {
            const scheduleEntryTime = item.schedule.schedule.entry_time;
            const scheduleExitTime = item.schedule.schedule.exit_time;
            
            if (scheduleEntryTime && scheduleExitTime) {
              // Crear fechas usando la hora establecida del horario
              const entryDate = new Date(item.entry.date);
              const exitDate = new Date(item.exit.date);
              
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
              const lunchTime = item.lunch_start && item.lunch_end
                ? differenceInMinutes(item.lunch_end.date, item.lunch_start.date)
                : 0;
              
              const workMinutes = totalMinutes - lunchTime;
              const totalHours = totalMinutes / 60; // Horas totales en la empresa
              item.totalHours = totalHours;
              
              // Debe cumplir 9 horas totales en la empresa (ej: 7am-4pm, 8am-5pm, 11am-8pm)
              // Permitimos un margen de tolerancia de 5 minutos
              const requiredTotalMinutes = 540; // 9 horas totales (540 minutos)
              
              if (totalMinutes < requiredTotalMinutes) {
                item.insufficientHours = true;
              }
            }
          } else if (item.entry && item.exit) {
            // Si no hay horario establecido, calcular desde la entrada real
            const totalMinutes = differenceInMinutes(
              item.exit.date,
              item.entry.date
            );
            // Validar y calcular tiempo de almuerzo
            let lunchTime = 0;
            if (item.lunch_start && item.lunch_end) {
              const lunchStart = item.lunch_start.date;
              const lunchEnd = item.lunch_end.date;
              
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
            item.totalHours = totalHours;
          }
        } else {
          // Si no hay marcación, verificar si está de vacaciones u otros estados
          if (isVacation) {
            item.alert = 'Vacaciones';
            item.scheduleError = false;
          } else if (hasRestrictedTimeOff) {
            item.alert = timeoffForDay?.type?.name || 'Permiso';
            item.scheduleError = false;
          } else if (!item.schedule) {
            // Si no hay schedule y no hay timeoff, verificar si es fin de semana
            const dayOfWeek = new Date(item.day).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              // Es sábado (6) o domingo (0)
              item.alert = dayOfWeek === 0 ? 'Domingo' : 'Sábado';
            } else {
              // Sin horario establecido
              item.alert = 'Sin Horario';
            }
          }
        }

        return item;
      }, acc) // Usar el array inicial que ya tiene todos los días
      .sort((a, b) => {
        // Ordenar primero por fecha (asegurar orden cronológico), luego por nombre de empleado
        const dateA = new Date(a.day + 'T00:00:00').getTime();
        const dateB = new Date(b.day + 'T00:00:00').getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        const nameA = (a.employee.first_name || '') + ' ' + (a.employee.father_name || '');
        const nameB = (b.employee.first_name || '') + ' ' + (b.employee.father_name || '');
        return nameA.localeCompare(nameB);
      })
      // Filtrar días finales que estén dentro del rango (validación final)
      .filter((x) => {
        const dayStr = x.day;
        // Asegurar que la fecha esté en el rango correcto
        return dayStr >= dateRangeStart && dayStr <= dateRangeEnd;
      });
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
          hasMarks && (
            x.alert === 'Sin Horario' ||
            x.alert === 'Día Libre' ||
            x.alert === 'Feriado'
          )
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

  getMaxDate(): Date {
    return new Date();
  }

  public timelogsReport = computed(() => {
    // Usar exactamente los mismos datos que se muestran en la tabla, en el mismo orden
    const filteredData = this.filteredDaylogs();
    
    // Obtener y normalizar las fechas (puede ser un solo día o un rango)
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate || filteredData.length === 0) {
      return [];
    }
    
    // Normalizar fechas al inicio del día
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const dateRangeStart = format(normalizedStart, 'yyyy-MM-dd');
    
    const normalizedEnd = endDate && endDate.getTime() !== startDate.getTime()
      ? new Date(endDate)
      : normalizedStart;
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
        const nameA = (a.employee?.first_name || '') + ' ' + (a.employee?.father_name || '');
        const nameB = (b.employee?.first_name || '') + ' ' + (b.employee?.father_name || '');
        return nameA.localeCompare(nameB);
      });
    
    // Mapear datos ya ordenados
    const mappedData = sortedAndFilteredData.map((x) => {
      const lunchMinutes = x.lunchMinutes || 0;
      const lunchExceeded = x.lunchExceeded ? `EXCEDIDO (${lunchMinutes} min)` : lunchMinutes > 0 ? `${lunchMinutes} min` : '';
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
            const delayText = typeof x.delay === 'number' ? `${x.delay} min` : String(x.delay);
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
            finAlmuerzo += ` Almuerzo ${x.lunchMinutes} min`;
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
      const employeeName = [
        x.employee?.first_name || '',
        x.employee?.father_name || ''
      ].filter(Boolean).join(' ') || 'Sin nombre';
      
      return {
        'Empleado': employeeName,
        'Día': formattedDate,
        'Horario': x.schedule?.schedule?.name || 'Sin horario',
        'Entrada': entrada,
        'Inicio de almuerzo': inicioAlmuerzo,
        'Fin de almuerzo': finAlmuerzo,
        'Salida': salida,
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
        ['Período:', this.getStartDate() && this.getEndDate() && this.getEndDate()!.getTime() !== this.getStartDate()!.getTime()
          ? `${format(this.getStartDate()!, 'dd/MM/yyyy')} - ${format(this.getEndDate()!, 'dd/MM/yyyy')}`
          : `${format(this.getStartDate()!, 'dd/MM/yyyy')}`],
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
      const startDate = this.getStartDate()!;
      const endDate = this.getEndDate();
      const fileName = endDate && endDate.getTime() !== startDate.getTime()
        ? `${name}_${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.xlsx`
        : `${name}_${format(startDate, 'yyyyMMdd')}.xlsx`;
      
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
