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
import { useRealtimeTrigger } from '../utils/realtime-trigger.utils';
import { addDays, differenceInMinutes, format, isEqual, startOfDay, startOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import {
  colorVariants,
  DayLog,
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
import { buildDayLogs } from './timelogs/utils/daylog-processing.utils';
import { filterDayLogs } from './timelogs/utils/daylog-filter.utils';
import { mapDayLogsToReportRows } from './timelogs/utils/timelogs-report.utils';
import { matchesEmployeeSearch } from './timelogs/utils/employee-search.utils';
import { RESTRICTED_SCHEDULE_NAMES } from './timelogs/utils/timelogs-constants';

@Component({
  selector: 'pt-timelogs',
  imports: [
    CommonModule,
    Button,
    Card,
    Tag,
    ToastModule,
    Dialog,
    Tooltip,
    TimelogsFiltersComponent,
    TimelogsTableComponent,
    OvertimeConfirmationDialogComponent,
  ],
  template: `<div class="px-3 sm:px-5 md:px-8 pt-3 sm:pt-5 pb-4" [ngClass]="{ 'naz-theme': isNaz() }">
    <p-card>
      <ng-template #title>
        <div
          class="flex items-center justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-xl">Marcaciones</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">
              Listado de marcaciones de empleados
            </p>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-info-circle"
              severity="info"
              [text]="true"
              rounded
              (click)="infoDialogVisible.set(true)"
              pTooltip="Cómo funciona el sistema"
              tooltipPosition="bottom"
            />
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

      <!-- Resumen del empleado seleccionado -->
      @if(selectedEmployee()) {
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <i class="pi pi-user text-blue-400"></i>
          <span class="text-sm font-medium text-gray-300">
            Resumen - {{ selectedEmployee()?.first_name }}
            {{ selectedEmployee()?.father_name }}
          </span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <!-- Cert. Médicos -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3 cursor-pointer hover:border-pink-500/50 transition-colors" (click)="openSummaryDetail('Cert. Médicos', employeeSummaryCounts().details.certMedicos)">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(236, 72, 153, 0.12)">
              <i class="pi pi-heart text-pink-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Cert. Médicos</span>
              <span class="text-lg font-bold text-white">{{ employeeSummaryCounts().certMedicos }}</span>
            </div>
          </div>
          <!-- A. Injustificada -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3 cursor-pointer hover:border-red-500/50 transition-colors" (click)="openSummaryDetail('A. Injustificada', employeeSummaryCounts().details.injustificada)">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(239, 68, 68, 0.12)">
              <i class="pi pi-times-circle text-red-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">A. Injustificada</span>
              <span class="text-lg font-bold text-white">{{ employeeSummaryCounts().injustificada }}</span>
            </div>
          </div>
          <!-- Justificada -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3 cursor-pointer hover:border-green-500/50 transition-colors" (click)="openSummaryDetail('Justificada', employeeSummaryCounts().details.justificada)">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(34, 197, 94, 0.12)">
              <i class="pi pi-check-circle text-green-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Justificada</span>
              <span class="text-lg font-bold text-white">{{ employeeSummaryCounts().justificada }}</span>
            </div>
          </div>
          <!-- Permisos -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3 cursor-pointer hover:border-blue-500/50 transition-colors" (click)="openSummaryDetail('Permisos', employeeSummaryCounts().details.permiso)">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(59, 130, 246, 0.12)">
              <i class="pi pi-calendar-plus text-blue-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Permisos</span>
              <span class="text-lg font-bold text-white">{{ employeeSummaryCounts().permiso }}</span>
            </div>
          </div>
          <!-- Compensatorios -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3 cursor-pointer hover:border-amber-500/50 transition-colors" (click)="openSummaryDetail('Compensatorios', employeeSummaryCounts().details.compensatorio)">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(245, 158, 11, 0.12)">
              <i class="pi pi-sync text-amber-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Compensatorios</span>
              <span class="text-lg font-bold text-white">
                @if (employeeSummaryCounts().compensatorioDias > 0) { {{ employeeSummaryCounts().compensatorioDias }}d }
                @if (employeeSummaryCounts().compensatorioDias > 0 && employeeSummaryCounts().compensatorioHoras > 0) { / }
                @if (employeeSummaryCounts().compensatorioHoras > 0) { {{ employeeSummaryCounts().compensatorioHoras }}h }
                @if (employeeSummaryCounts().compensatorioDias === 0 && employeeSummaryCounts().compensatorioHoras === 0) { 0 }
              </span>
            </div>
          </div>
          <!-- Almuerzo Excedido -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(234, 179, 8, 0.12)">
              <i class="pi pi-clock text-yellow-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Almuerzo Excedido</span>
              <span class="text-lg font-bold text-white">{{ formatLunchExceededTotal(totalLunchExceededMinutes()) }}</span>
            </div>
          </div>
          <!-- Retrasos -->
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: rgba(249, 115, 22, 0.12)">
              <i class="pi pi-exclamation-triangle text-orange-400 text-sm"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[0.65rem] text-gray-400 leading-tight">Retrasos</span>
              <span class="text-lg font-bold text-white">{{ formatLunchExceededTotal(totalDelayMinutes()) }}</span>
            </div>
          </div>
        </div>
      </div>
      } @if (hasError()) {
      <!-- Error handling, toast will be shown -->
      }
      <pt-timelogs-table
        [logs]="filteredDaylogs"
        [isLoading]="logs.isLoading() && !silentReloading()"
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

    <!-- Modal de detalle del resumen -->
    <p-dialog
      [header]="summaryDialogTitle()"
      [(visible)]="summaryDialogVisible"
      [modal]="true"
      [style]="{ width: '450px' }"
      [dismissableMask]="true"
    >
      @if (summaryDialogItems().length === 0) {
        <p class="text-gray-400 text-sm">No hay registros para este periodo.</p>
      } @else {
        <div class="flex flex-col gap-2">
          @for (item of summaryDialogItems(); track item.day) {
            <div class="flex justify-between items-center p-2 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
              <span class="text-sm text-white font-medium">{{ item.day }}</span>
              <span class="text-xs px-2 py-1 rounded-full" [ngClass]="{
                'bg-pink-500/20 text-pink-300': item.source === 'Gestión de Incapacidades',
                'bg-blue-500/20 text-blue-300': item.source === 'Horario asignado'
              }">{{ item.source }}</span>
            </div>
          }
        </div>
      }
    </p-dialog>

    <!-- Modal de información del sistema -->
    <p-dialog
      header="Cómo funciona el sistema de marcaciones"
      [(visible)]="infoDialogVisible"
      [modal]="true"
      [style]="{ width: '550px' }"
      [dismissableMask]="true"
    >
      <div class="flex flex-col gap-4 text-sm">
        <div>
          <h4 class="text-white font-semibold mt-0 mb-2"><i class="pi pi-clock mr-2 text-blue-400"></i>Cálculo de horas</h4>
          <ul class="list-disc pl-5 text-gray-300 flex flex-col gap-1 m-0">
            <li><strong>Horas trabajadas</strong> = Salida - Entrada - Almuerzo</li>
            <li><strong>Almuerzo</strong>: se resta el tiempo real marcado (máx. 60 min)</li>
            <li>Si no hay marcación de almuerzo, se restan <strong>60 min por defecto</strong></li>
            <li>Marcaciones de almuerzo menores a 15 min se consideran erróneas y se usan 60 min por defecto</li>
          </ul>
        </div>
        <div>
          <h4 class="text-white font-semibold mt-0 mb-2"><i class="pi pi-star mr-2 text-amber-400"></i>Horas extras</h4>
          <ul class="list-disc pl-5 text-gray-300 flex flex-col gap-1 m-0">
            <li>Solo se generan si las horas trabajadas superan las <strong>horas del horario asignado</strong></li>
            <li><strong>Extras</strong> = Horas trabajadas - horas del horario</li>
            <li>El exceso de almuerzo (> 60 min) no genera extras</li>
          </ul>
        </div>
        <div>
          <h4 class="text-white font-semibold mt-0 mb-2"><i class="pi pi-exclamation-triangle mr-2 text-orange-400"></i>Alertas</h4>
          <ul class="list-disc pl-5 text-gray-300 flex flex-col gap-1 m-0">
            <li><strong>Retraso</strong>: entrada posterior al horario asignado (tolerancia: 5 min)</li>
            <li><strong>Salida temprana</strong>: salida antes de la hora de salida del horario</li>
            <li><strong>Almuerzo excedido</strong>: almuerzo mayor a 60 minutos</li>
            <li><strong>Horas insuficientes</strong>: menos de las horas requeridas por el horario asignado</li>
          </ul>
        </div>
        <div>
          <h4 class="text-white font-semibold mt-0 mb-2"><i class="pi pi-user mr-2 text-pink-400"></i>Resumen del empleado</h4>
          <ul class="list-disc pl-5 text-gray-300 flex flex-col gap-1 m-0">
            <li>Haz click en cada tarjeta del resumen para ver el <strong>detalle y la fuente</strong> de cada registro</li>
            <li>Los datos provienen de <strong>Gestión de Solicitudes</strong> y/o <strong>Horarios asignados</strong></li>
          </ul>
        </div>
      </div>
    </p-dialog>
  </div>`,
  styles: `
    ::ng-deep .p-tag .p-tag-icon {
      margin-right: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsComponent {
  // ─── Injections ────────────────────────────────────────────
  public employees = inject(EmployeesStore);
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);
  public timelogsApiService = inject(TimelogsApiService);
  private logger = inject(LoggerService);
  private apiUrl = inject(ApiUrlService);
  private injector = inject(Injector);
  private message = inject(MessageService);
  private overtimeService = inject(OvertimeRecordsService);

  // ─── Constants ─────────────────────────────────────────────
  private readonly TIMEZONE = 'America/Panama';
  private readonly QUERY_LIMIT = 50000;

  // ─── State signals ─────────────────────────────────────────
  protected silentReloading = signal(false);
  public dateRange = signal<Date[]>([startOfMonth(new Date()), new Date()]);
  public employeeId = model<string>();
  public branchId = model<string>();
  public employeeSearch = model<string>('');
  public employeeSearchInput = signal<string>('');
  public infoDialogVisible = signal(false);
  public summaryDialogVisible = signal(false);
  public summaryDialogTitle = signal('');
  public summaryDialogItems = signal<{ day: string; source: string }[]>([]);
  public onlyDelayed = signal(false);
  public onlyErrors = signal(false);
  public onlyEarlyExit = signal(false);
  public onlyLunchExceeded = signal(false);
  public lunchExceededRange = signal<string | null>(null);
  public onlyWithMarcaciones = signal(false);
  public delayToleranceMinutes = signal(5);
  public delayRange = signal<string | null>(null);
  public filtersExpanded = signal(false);
  public loading = signal(false);

  // Overtime dialog state
  public overtimeDialogVisible = signal(false);
  public selectedOvertimeLog = signal<DayLog | null>(null);
  public selectedOvertimeRecord = signal<EmployeeOvertimeRecord | null>(null);
  public overtimeLoading = signal(false);

  // ─── Realtime triggers ─────────────────────────────────────
  private timelogChanges = useRealtimeTrigger('timelogs');
  private scheduleChanges = useRealtimeTrigger('employee_schedules');

  // ─── Template-bound utilities ──────────────────────────────
  public colorVariants = colorVariants;
  public formatHours = formatHours;
  public formatLunchExceededTotal = formatLunchExceededTotal;
  public getAlertSeverity = getAlertSeverity;
  public getAlertIcon = getAlertIcon;
  public getAlertTooltip = getAlertTooltip;

  // ─── Filter options ────────────────────────────────────────
  public lunchExceededOptions = [
    { label: '1-5 minutos excedidos', value: '1-5' },
    { label: '5-10 minutos excedidos', value: '5-10' },
    { label: '10 o más minutos excedidos', value: '10+' },
  ];

  public delayRangeOptions = [
    { label: '1-5 min', value: '1-5' },
    { label: '5-10 min', value: '5-10' },
    { label: '10+ min', value: '10+' },
  ];

  // ─── Tag width computeds (UI layout) ──────────────────────
  public maxEmployeeTagWidth = computed(() => {
    const possibleTags = ['Error de Horario', 'Día Libre', 'Feriado', 'Sin Horario'];
    const maxLength = Math.max(...possibleTags.map((tag) => tag.length));
    return `${Math.max(100, maxLength * 8 + 24)}px`;
  });

  public maxScheduleBadgeWidth = computed(() => {
    const schedules = this.schedules.value() || [];
    const scheduleNames = schedules.map((s) => s.schedule?.name || 'Sin horario');
    const maxLength = Math.max(...scheduleNames.map((name: string) => name.length), 'Sin horario'.length);
    return `${Math.max(120, maxLength * 8 + 32)}px`;
  });

  public maxDelayTagWidth = computed(() => `${Math.max(100, 'Retraso de 999 min'.length * 8 + 24)}px`);
  public maxLunchTagWidth = computed(() => `${Math.max(100, 'Almuerzo 999 min'.length * 8 + 24)}px`);
  public maxExitTagWidth = computed(() => `${Math.max(100, 'Salida temprana'.length * 8 + 24)}px`);
  public maxHoursTagWidth = computed(() => `${Math.max(100, 'Horas insuficientes'.length * 8 + 24)}px`);

  // ─── Computed: Employee lists ──────────────────────────────
  public isNaz = computed(() => this.organizationService.isNaz());
  public activeEmployeesList = computed(() =>
    this.employees.employeesList().filter((emp) => emp.is_active)
  );
  public branchOptionsList = computed(() => this.store.branches.entities());

  // ─── Computed: Normalized date range ───────────────────────
  public normalizedDateRange = computed(() => {
    const range = this.dateRange();
    if (!range || range.length === 0) return { start: null, end: null };

    const start = range[0];
    const end = range[1] || range[0];

    if (start && end) {
      const daysDifference = differenceInMinutes(end, start) / (60 * 24);
      if (daysDifference > 365) {
        this.logger.warn('[TimelogsComponent] Rango de fechas excede 1 año:', daysDifference, 'días');
        this.message.add({
          severity: 'warn',
          summary: 'Rango de fechas muy amplio',
          detail: 'El rango de fechas seleccionado excede 1 año (365 días). Por favor, seleccione un rango más corto para mejorar el rendimiento.',
        });
        return { start, end: addDays(start, 365) };
      }
    }

    return { start, end };
  });

  // ─── Computed: Days list ───────────────────────────────────
  days = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return [];

    let normalizedStart = startOfDay(new Date(start));
    let normalizedEnd = startOfDay(new Date(end));
    const days: string[] = [];
    let currentDate = new Date(normalizedStart);

    while (currentDate <= normalizedEnd) {
      days.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }

    return days.sort();
  });

  // ─── Computed: Filter state ────────────────────────────────
  public hasActiveFilters = computed(
    () =>
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

  // ─── Computed: Selected employee ───────────────────────────
  public selectedEmployee = computed(() => {
    if (this.employeeId()) {
      return this.employees.employeesList().find((x) => x.id === this.employeeId());
    }
    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
    if (searchTerm) {
      const matching = this.employees.employeesList().filter((emp) =>
        matchesEmployeeSearch(emp, searchTerm)
      );
      if (matching.length === 1) return matching[0];
    }
    return null;
  });

  // ─── httpResource: Schedules ───────────────────────────────
  public schedules = httpResource<EmployeeScheduleData[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;

    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    const params: Record<string, string> = {
      select: `*,schedule:schedules(id,name,color,entry_time,lunch_start_time,lunch_end_time,exit_time,day_off,minutes_tolerance,min_lunch_minutes,max_lunch_minutes)`,
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
    };

    // Include schedules with matching company_id OR null (legacy records without backfill)
    if (companyId) params['or'] = `(company_id.eq.${companyId},company_id.is.null)`;
    const empId = this.employeeId();
    if (empId) params['employee_id'] = `eq.${empId}`;

    return {
      url: this.apiUrl.build('rest/v1/employee_schedules', params),
      method: 'GET',
      headers: { Range: '0-9999' },
    };
  });

  // ─── httpResource: Timeoffs ────────────────────────────────
  public timeoffs = httpResource<TimeoffData[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/timeoffs', {
        select:
          'id,type_id,employee_id,date_from,date_to,is_approved,compensatory_type,compensatory_amount,company_id,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(company_id)',
        date_from: `lte.${format(end, 'yyyy-MM-dd')}`,
        date_to: `gte.${format(start, 'yyyy-MM-dd')}`,
        is_approved: 'eq.true',
        company_id: `eq.${companyId}`,
      }),
      method: 'GET' as const,
    };
  });

  // ─── httpResource: Employee Disabilities (cert. médicos) ───
  public disabilities = httpResource<{ id: string; employee_id: string; start_date: string; end_date: string }[]>(() => {
    const { start, end } = this.normalizedDateRange();
    const emp = this.selectedEmployee();
    if (!start || !end || !emp?.id) return undefined;

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities', {
        select: 'id,employee_id,start_date,end_date',
        employee_id: `eq.${emp.id}`,
        company_id: `eq.${companyId}`,
        start_date: `lte.${format(end, 'yyyy-MM-dd')}`,
        end_date: `gte.${format(start, 'yyyy-MM-dd')}`,
        status: 'eq.approved',
      }),
      method: 'GET' as const,
    };
  });

  // ─── httpResource: Timelogs (split before/after cutoff) ────
  public logsBefore22 = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;
    const { beforeRange } = this.timelogsApiService.splitDateRange({ start, end });
    if (!beforeRange) return undefined;
    return this.timelogsApiService.buildLogsRequest(beforeRange.start, beforeRange.end, this.employeeId());
  });

  public logsAfter22 = httpResource<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;
    const { afterRange } = this.timelogsApiService.splitDateRange({ start, end });
    if (!afterRange) return undefined;
    return this.timelogsApiService.buildLogsRequest(afterRange.start, afterRange.end, this.employeeId());
  });

  private _logsComputed = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      return { value: () => [], isLoading: () => false, error: () => undefined };
    }

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const cutoffStr = '2025-12-22';

    const before22Data = this.logsBefore22.value() ?? [];
    const after22Data = this.logsAfter22.value() ?? [];

    if (endStr <= cutoffStr) {
      return { value: () => before22Data, isLoading: () => this.logsBefore22.isLoading(), error: () => this.logsBefore22.error() };
    }
    if (startStr > cutoffStr) {
      return { value: () => after22Data, isLoading: () => this.logsAfter22.isLoading(), error: () => this.logsAfter22.error() };
    }

    const combined = [...before22Data, ...after22Data];
    return {
      value: () => combined,
      isLoading: () => this.logsBefore22.isLoading() || this.logsAfter22.isLoading(),
      error: () => this.logsBefore22.error() || this.logsAfter22.error(),
    };
  });

  public logs = {
    value: (): any[] => this._logsComputed().value(),
    isLoading: (): boolean => this._logsComputed().isLoading(),
    error: (): any => this._logsComputed().error(),
  } as any;

  // ─── Computed: Results truncated warning ───────────────────
  public resultsTruncated = computed(() => {
    const before = this.logsBefore22.value();
    const after = this.logsAfter22.value();
    return (
      (before && before.length >= this.QUERY_LIMIT) ||
      (after && after.length >= this.QUERY_LIMIT)
    );
  });

  // ─── Computed: Error handling ──────────────────────────────
  private _errorShown = false;

  public hasError = computed(() => {
    const logsError = this._logsComputed().error();
    const schedulesError = this.schedules.error();
    const timeoffsError = this.timeoffs.error();

    if (logsError || schedulesError || timeoffsError) {
      const primaryError = logsError || schedulesError || timeoffsError;
      const errorMessage = this.getErrorMessage(primaryError);

      this.logger.error('[TimelogsComponent] Error cargando datos:', {
        logs: logsError, schedules: schedulesError, timeoffs: timeoffsError,
      });

      if (!this._errorShown) {
        this.message.add({ severity: 'error', summary: errorMessage.summary, detail: errorMessage.detail });
        this._errorShown = true;
        setTimeout(() => { this._errorShown = false; }, 5000);
      }

      return true;
    }
    this._errorShown = false;
    return false;
  });

  // ─── Computed: DayLogs (delegates to utils) ────────────────
  public dayLogs = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return [];

    const normalizedStart = startOfDay(new Date(start));
    const normalizedEnd = startOfDay(new Date(end));

    return buildDayLogs({
      logsData: this.logs.value() ?? [],
      schedulesData: this.schedules.value() ?? [],
      timeoffsData: this.timeoffs.value() ?? [],
      daysList: this.days(),
      dateRangeStart: format(normalizedStart, 'yyyy-MM-dd'),
      dateRangeEnd: format(normalizedEnd, 'yyyy-MM-dd'),
      employeesList: this.employees.employeesList(),
      employeeSearch: this.employeeSearch()?.toLowerCase().trim() || '',
      employeeId: this.employeeId(),
      branchId: this.branchId(),
      onlyWithMarcaciones: this.onlyWithMarcaciones(),
      timezone: this.TIMEZONE,
      logger: this.logger,
    });
  });

  // ─── Computed: Filtered daylogs (delegates to utils) ───────
  public filteredDaylogs = computed(() =>
    filterDayLogs({
      dayLogs: this.dayLogs(),
      employeeId: this.employeeId(),
      employeeSearch: this.employeeSearch()?.toLowerCase().trim() || '',
      onlyWithMarcaciones: this.onlyWithMarcaciones(),
      onlyDelayed: this.onlyDelayed(),
      delayRange: this.delayRange(),
      onlyEarlyExit: this.onlyEarlyExit(),
      onlyLunchExceeded: this.onlyLunchExceeded(),
      lunchExceededRange: this.lunchExceededRange(),
      onlyErrors: this.onlyErrors(),
    })
  );

  // ─── Computed: Totals for selected employee ────────────────
  public totalLunchExceededMinutes = computed(() => {
    const logs = this.filteredDaylogs();
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return 0;

    const dateRangeStart = format(startOfDay(new Date(start)), 'yyyy-MM-dd');
    const dateRangeEnd = format(startOfDay(new Date(end)), 'yyyy-MM-dd');

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

  public totalDelayMinutes = computed(() => {
    const logs = this.filteredDaylogs();
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return 0;

    const dateRangeStart = format(startOfDay(new Date(start)), 'yyyy-MM-dd');
    const dateRangeEnd = format(startOfDay(new Date(end)), 'yyyy-MM-dd');

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

  // ─── Computed: Employee summary counts (cuadritos) ─────────
  // Counts based on assigned schedules + approved disabilities
  public employeeSummaryCounts = computed(() => {
    const emp = this.selectedEmployee();
    const empty = {
      certMedicos: 0, injustificada: 0, justificada: 0, permiso: 0,
      compensatorioDias: 0, compensatorioHoras: 0,
      details: { certMedicos: [] as { day: string; source: string }[], injustificada: [] as { day: string; source: string }[], justificada: [] as { day: string; source: string }[], permiso: [] as { day: string; source: string }[], compensatorio: [] as { day: string; source: string }[] },
    };
    if (!emp) return empty;

    const empLogs = this.dayLogs().filter(l => l.employee?.id === emp.id);
    const empDisabilities = (this.disabilities.value() ?? []).filter(d => d.employee_id === emp.id);

    const details = {
      certMedicos: [] as { day: string; source: string }[],
      injustificada: [] as { day: string; source: string }[],
      justificada: [] as { day: string; source: string }[],
      permiso: [] as { day: string; source: string }[],
      compensatorio: [] as { day: string; source: string }[],
    };

    // Disabilities como fuente
    for (const d of empDisabilities) {
      details.certMedicos.push({ day: `${d.start_date?.slice(0, 10)} → ${d.end_date?.slice(0, 10)}`, source: 'Gestión de Incapacidades' });
    }

    let injustificada = 0;
    let justificada = 0;
    let permiso = 0;
    let compensatorioDias = 0;

    for (const log of empLogs) {
      const name = log.schedule?.schedule?.name?.toLowerCase()?.trim() || '';
      if (!name) continue;

      if (name === 'cm' || name === 'incapacidad') {
        const alreadyCounted = empDisabilities.some(d => {
          const dStart = d.start_date?.slice(0, 10) || '';
          const dEnd = d.end_date?.slice(0, 10) || '';
          return log.day >= dStart && log.day <= dEnd;
        });
        if (!alreadyCounted) {
          details.certMedicos.push({ day: log.day, source: 'Horario asignado' });
        }
        continue;
      }
      if (name.startsWith('a. injus') || name === 'ausencia') {
        injustificada++;
        details.injustificada.push({ day: log.day, source: 'Horario asignado' });
        continue;
      }
      if (name.startsWith('a. justificada')) {
        justificada++;
        details.justificada.push({ day: log.day, source: 'Horario asignado' });
        continue;
      }
      if (name === 'permiso') {
        permiso++;
        details.permiso.push({ day: log.day, source: 'Horario asignado' });
        continue;
      }
      if (name === 'compensatorio') {
        compensatorioDias++;
        details.compensatorio.push({ day: log.day, source: 'Horario asignado' });
        continue;
      }
    }

    return {
      certMedicos: details.certMedicos.length,
      injustificada,
      justificada,
      permiso,
      compensatorioDias,
      compensatorioHoras: compensatorioDias * 8,
      details,
    };
  });

  // ─── Computed: Report data (delegates to utils) ────────────
  public timelogsReport = computed(() => {
    const filteredData = this.filteredDaylogs();
    const { start, end } = this.normalizedDateRange();
    if (!start || !end || filteredData.length === 0) return [];

    const dateRangeStart = format(startOfDay(new Date(start)), 'yyyy-MM-dd');
    const dateRangeEnd = format(startOfDay(new Date(end)), 'yyyy-MM-dd');

    return mapDayLogsToReportRows(filteredData, dateRangeStart, dateRangeEnd, this.TIMEZONE);
  });

  // ─── Constructor: Effects ──────────────────────────────────
  constructor() {
    // Realtime: reload httpResources when timelogs or schedules change
    effect(() => {
      const batch = this.timelogChanges();
      if (!batch) return;
      this.silentReloading.set(true);
      this.logsBefore22.reload();
      this.logsAfter22.reload();
    }, { injector: this.injector });

    effect(() => {
      const batch = this.scheduleChanges();
      if (!batch) return;
      this.silentReloading.set(true);
      this.schedules.reload();
    }, { injector: this.injector });

    // Reset silentReloading when loading finishes
    effect(() => {
      const loading = this._logsComputed().isLoading();
      if (!loading && this.silentReloading()) {
        this.silentReloading.set(false);
      }
    }, { injector: this.injector });

    // Log errors
    effect(() => {
      const logsError = this.logs.error();
      const schedulesError = this.schedules.error();
      const timeoffsError = this.timeoffs.error();

      if (logsError) this.logger.error('[TimelogsComponent] Error cargando timelogs:', logsError);
      if (schedulesError) this.logger.error('[TimelogsComponent] Error cargando employee_schedules:', schedulesError);
      if (timeoffsError) this.logger.error('[TimelogsComponent] Error cargando timeoffs:', timeoffsError);

      const logsData = this.logs.value();
      if (logsData && logsData.length === 0 && !logsError) {
        this.logger.warn('[TimelogsComponent] No se encontraron timelogs', {
          company_id: this.organizationService.getCurrentCompanyId(),
          dateRange: this.dateRange(),
          employeeId: this.employeeId() || 'Todos',
        });
      }
    }, { injector: this.injector });

    // Warn if results truncated
    effect(() => {
      if (this.resultsTruncated()) {
        this.message.add({
          severity: 'warn',
          summary: 'Resultados incompletos',
          detail: 'Se alcanzó el límite de registros. Algunos datos podrían no mostrarse. Seleccione un rango de fechas más corto o filtre por empleado.',
          life: 8000,
        });
        this.logger.warn('[TimelogsComponent] Resultados truncados por límite de', this.QUERY_LIMIT);
      }
    }, { injector: this.injector });
  }

  // ─── Public methods ────────────────────────────────────────

  public openSummaryDetail(title: string, items: { day: string; source: string }[]): void {
    this.summaryDialogTitle.set(title);
    this.summaryDialogItems.set(items);
    this.summaryDialogVisible.set(true);
  }

  public onEmployeeSearchEnter = (): void => {
    this.employeeSearch.set(this.employeeSearchInput());
  };

  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  public getScheduleTooltip(schedule: EmployeeScheduleData | undefined): string | undefined {
    if (schedule && schedule.approved === false) return 'Horario pendiente de aprobación';
    return undefined;
  }

  async generateReport() {
    try {
      this.loading.set(true);
      const { utils, writeFile } = await import('xlsx');
      const data = this.timelogsReport();

      const headers = Object.keys(data[0] || {});
      const ws = utils.json_to_sheet(data, { header: headers });

      const lastCol = String.fromCharCode(64 + headers.length);
      ws['!autofilter'] = { ref: `A1:${lastCol}${data.length + 1}` };
      ws['!cols'] = [
        { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 25 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 40 },
      ];

      const wb = utils.book_new();

      const { start, end } = this.normalizedDateRange();
      const reportInfo = [
        ['REPORTE DE MARCACIONES'],
        ['Fecha de generación:', formatInTimeZone(new Date(), this.TIMEZONE, 'dd/MM/yyyy HH:mm')],
        ['Período:', start && end
          ? isEqual(start, end)
            ? formatInTimeZone(start, this.TIMEZONE, 'dd/MM/yyyy')
            : `${formatInTimeZone(start, this.TIMEZONE, 'dd/MM/yyyy')} - ${formatInTimeZone(end, this.TIMEZONE, 'dd/MM/yyyy')}`
          : 'Sin fecha',
        ],
        ['Total de registros:', data.length],
        [''],
      ];

      const infoWs = utils.aoa_to_sheet(reportInfo);
      infoWs['!cols'] = [{ wch: 30 }, { wch: 30 }];

      utils.book_append_sheet(wb, infoWs, 'Información');
      utils.book_append_sheet(wb, ws, 'Marcaciones');

      if (!start || !end) {
        this.message.add({ severity: 'warn', summary: 'Fecha requerida', detail: 'Por favor selecciona un rango de fechas' });
        return;
      }

      const name = this.selectedEmployee()
        ? (this.selectedEmployee()?.short_name.toUpperCase() || '').trim().replace(' ', '_')
        : 'GLOBAL';
      const fileName = `${name}_${formatInTimeZone(start, this.TIMEZONE, 'yyyyMMdd')}-${formatInTimeZone(end, this.TIMEZONE, 'yyyyMMdd')}.xlsx`;

      writeFile(wb, fileName);

      this.message.add({ severity: 'success', summary: 'Reporte generado', detail: `El archivo ${fileName} se ha descargado correctamente` });
    } catch (error) {
      this.logger.error('Error generating report:', error);
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el reporte. Por favor, intente nuevamente.' });
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Overtime confirmation flow ────────────────────────────

  public async onOvertimeAction(log: DayLog): Promise<void> {
    this.selectedOvertimeLog.set(log);
    this.selectedOvertimeRecord.set(log.overtimeRecord ?? null);
    this.overtimeDialogVisible.set(true);
  }

  public async onOvertimeDialogResult(result: OvertimeDialogResult): Promise<void> {
    if (result.action === 'cancel') {
      this.closeOvertimeDialog();
      return;
    }

    const log = this.selectedOvertimeLog();
    if (!log?.employee?.id || !log.day) {
      this.logger.error('[TimelogsComponent] Invalid log data for overtime action');
      return;
    }

    const currentEmployeeId = this.store.auth.currentEmployeeId();
    if (!currentEmployeeId) {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo identificar el usuario actual' });
      return;
    }

    this.overtimeLoading.set(true);

    try {
      const existingRecord = this.selectedOvertimeRecord();

      if (result.action === 'confirm') {
        if (existingRecord?.id) {
          await this.overtimeService.confirm({
            recordId: existingRecord.id,
            confirmedBy: currentEmployeeId,
            hours: result.hours,
            reason: result.reason,
          });
        } else {
          const newRecord = await this.overtimeService.save({
            employee_id: log.employee.id,
            timelog_date: log.day,
            hours: result.hours ?? log.overtimeHours ?? 0,
            status: 'confirmed',
            reason: result.reason,
          });
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
          detail: `Se confirmaron ${result.hours ?? log.overtimeHours} horas extras para ${log.employee.first_name} ${log.employee.father_name}`,
        });
      } else if (result.action === 'reject') {
        if (existingRecord?.id) {
          await this.overtimeService.reject({
            recordId: existingRecord.id,
            confirmedBy: currentEmployeeId,
            reason: result.reason ?? 'Rechazado sin motivo',
          });
        } else {
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
      this.refreshOvertimeRecords();
    } catch (error) {
      this.logger.error('[TimelogsComponent] Error processing overtime action:', error);
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo procesar la acción. Por favor, intente nuevamente.' });
    } finally {
      this.overtimeLoading.set(false);
    }
  }

  // ─── Private helpers ───────────────────────────────────────

  private getErrorMessage(error: any): { summary: string; detail: string } {
    if (!error) return { summary: 'Error desconocido', detail: 'Ocurrió un error inesperado' };

    if (error.message?.includes('Network') || error.message?.includes('Failed to fetch') || error.message?.includes('timeout')) {
      return { summary: 'Error de conexión', detail: 'No se pudo conectar con el servidor. Verifique su conexión a internet e intente nuevamente.' };
    }
    if (error.status === 401 || error.status === 403) {
      return { summary: 'Error de autenticación', detail: 'Su sesión ha expirado o no tiene permisos. Por favor, inicie sesión nuevamente.' };
    }
    if (error.status >= 500) {
      return { summary: 'Error del servidor', detail: 'El servidor está experimentando problemas. Por favor, intente más tarde o contacte al administrador.' };
    }
    if (error.status >= 400 && error.status < 500) {
      return { summary: 'Error en la solicitud', detail: 'La solicitud no pudo ser procesada. Verifique los filtros seleccionados e intente nuevamente.' };
    }
    return { summary: 'Error al cargar datos', detail: 'No se pudieron cargar las marcaciones. Por favor, intente nuevamente.' };
  }

  private closeOvertimeDialog(): void {
    this.overtimeDialogVisible.set(false);
    this.selectedOvertimeLog.set(null);
    this.selectedOvertimeRecord.set(null);
  }

  private refreshOvertimeRecords(): void {
    const current = this.dateRange();
    this.dateRange.set([...current]);
  }
}
