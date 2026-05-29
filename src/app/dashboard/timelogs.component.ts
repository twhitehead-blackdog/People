import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  Injector,
  model,
  resource,
  signal,
} from '@angular/core';
import { useRealtimeTrigger } from '../utils/realtime-trigger.utils';
import {
  addDays,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isEqual,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
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
import { TimelogAlertsComponent } from './settings/timelog-alerts.component';
import { OvertimeRecordsService } from './timelogs/services/overtime-records.service';
import { PUNCHED_AT_BACKFILL_CUTOFF_DATE, TimelogsApiService } from './timelogs/timelogs-api.service';
import {
  formatHours,
  formatLunchExceededTotal,
  getAlertIcon,
  getAlertSeverity,
  getAlertTooltip,
} from './timelogs/utils/alert.utils';
import { applyMetricsToDayLogs, buildBaseDayLogs } from './timelogs/utils/daylog-processing.utils';
import { filterDayLogs } from './timelogs/utils/daylog-filter.utils';
import { mapDayLogsToReportRows } from './timelogs/utils/timelogs-report.utils';
import { matchesEmployeeSearch } from './timelogs/utils/employee-search.utils';
import { RESTRICTED_SCHEDULE_NAMES, SUMMARY_SCHEDULE_IDS } from './timelogs/utils/timelogs-constants';
import {
  addView,
  generateViewId,
  loadSavedViews,
  removeView,
  TimelogSavedView,
} from './timelogs/utils/saved-views.utils';

@Component({
  selector: 'pt-timelogs',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    Button,
    Card,
    ToastModule,
    Dialog,
    InputTextModule,
    Tooltip,
    TimelogsFiltersComponent,
    TimelogsTableComponent,
    OvertimeConfirmationDialogComponent,
    TimelogAlertsComponent,
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
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <p-button
              [icon]="tableDensity() === 'compact' ? 'pi pi-bars' : 'pi pi-align-justify'"
              severity="secondary"
              [text]="true"
              rounded
              (click)="toggleDensity()"
              [pTooltip]="tableDensity() === 'compact' ? 'Densidad: Compacta (click para Normal)' : 'Densidad: Normal (click para Compacta)'"
              tooltipPosition="bottom"
            />
            <p-button
              icon="pi pi-info-circle"
              severity="info"
              [text]="true"
              rounded
              (click)="infoDialogVisible.set(true)"
              pTooltip="Cómo funciona el sistema (?)"
              tooltipPosition="bottom"
            />
            <!-- Menú de vistas guardadas -->
            <div class="relative">
              <p-button
                icon="pi pi-bookmark"
                severity="secondary"
                [outlined]="true"
                rounded
                (click)="viewsMenuVisible.set(!viewsMenuVisible())"
                [label]="savedViews().length > 0 ? 'Vistas (' + savedViews().length + ')' : 'Vistas'"
                pTooltip="Aplicar o guardar combinaciones de filtros"
                tooltipPosition="bottom"
                class="min-h-[44px]"
              />
              @if (viewsMenuVisible()) {
                <div
                  class="absolute top-full mt-1 right-0 z-50 min-w-[260px] max-w-[320px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
                  (click)="$event.stopPropagation()"
                >
                  <div class="p-2 border-b border-neutral-800 flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-gray-300 uppercase">Mis vistas</span>
                    <p-button
                      icon="pi pi-plus"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      (click)="openSaveViewDialog()"
                      pTooltip="Guardar filtros actuales"
                      tooltipPosition="left"
                    />
                  </div>
                  @if (savedViews().length === 0) {
                    <div class="p-4 text-center text-sm text-gray-500">
                      <i class="pi pi-info-circle block mb-2 text-lg"></i>
                      Sin vistas guardadas.
                      <br />
                      <span class="text-xs">Aplica filtros y guárdalos con el botón +</span>
                    </div>
                  } @else {
                    <div class="max-h-[320px] overflow-y-auto">
                      @for (v of savedViews(); track v.id) {
                        <button
                          type="button"
                          class="w-full text-left px-3 py-2 hover:bg-neutral-800/60 transition-colors flex items-center justify-between gap-2 group border-b border-neutral-800/60 last:border-b-0"
                          (click)="applyView(v)"
                        >
                          <div class="min-w-0 flex-1">
                            <div class="text-sm text-white truncate">{{ v.name }}</div>
                            <div class="text-[10px] text-gray-500">
                              {{ v.createdAt | date : 'dd/MM/yy' }}
                            </div>
                          </div>
                          <i
                            class="pi pi-trash text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            (click)="deleteView(v, $event)"
                          ></i>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
            <p-button
              [icon]="onlyProblems() ? 'pi pi-exclamation-triangle' : 'pi pi-flag'"
              [severity]="onlyProblems() ? 'warn' : 'secondary'"
              [outlined]="!onlyProblems()"
              rounded
              (click)="onlyProblems.set(!onlyProblems())"
              [label]="onlyProblems() ? 'Mostrando problemas' : 'Solo problemas'"
              [pTooltip]="onlyProblems() ? 'Mostrando filas con retrasos, errores, almuerzo excedido, salida temprana o sin horario. Click para desactivar.' : 'Mostrar solo filas con problemas (Shift+P)'"
              tooltipPosition="bottom"
              class="min-h-[44px]"
            />
            @if (hasActiveFilters()) {
              <p-button
                icon="pi pi-filter-slash"
                severity="secondary"
                [outlined]="true"
                rounded
                (click)="clearAllFilters()"
                [label]="'Limpiar (' + getActiveFiltersCount() + ')'"
                pTooltip="Volver al mes actual sin filtros (Esc)"
                tooltipPosition="bottom"
                class="min-h-[44px]"
              />
            }
            @if (store.isAdmin() && pendingOvertimeLogs().length > 0) {
              <p-button
                icon="pi pi-check-square"
                severity="warn"
                rounded
                (click)="openBulkApprove()"
                [label]="'Aprobar extras (' + pendingOvertimeLogs().length + ')'"
                pTooltip="Aprobar todas las horas extras pendientes visibles en la tabla actual"
                tooltipPosition="bottom"
                class="min-h-[44px]"
              />
            }
            <p-button
              icon="pi pi-file-excel"
              [loading]="loading()"
              (click)="generateReport()"
              severity="success"
              [disabled]="timelogsReport().length === 0"
              label="Excel"
              rounded
              pTooltip="Exportar a Excel (Shift+E)"
              tooltipPosition="bottom"
              class="min-h-[44px]"
            />
            <p-button
              icon="pi pi-file-pdf"
              [loading]="pdfLoading()"
              (click)="generatePdf()"
              severity="danger"
              [disabled]="timelogsReport().length === 0"
              label="PDF"
              rounded
              pTooltip="Exportar a PDF para imprimir/firmar"
              tooltipPosition="bottom"
              class="min-h-[44px]"
            />
          </div>
        </div>
      </ng-template>

      <!-- Indicador global de carga: barra delgada animada visible mientras
           CUALQUIER resource (logs, schedules, timeoffs, overtime) esté
           cargando. Antes solo se mostraba dentro de la tabla, lo que dejaba
           al usuario sin feedback cuando schedules o timeoffs tardaban. -->
      <div
        class="timelogs-loading-bar"
        [class.timelogs-loading-bar--active]="anyResourceLoading()"
        role="progressbar"
        [attr.aria-busy]="anyResourceLoading()"
        [attr.aria-label]="anyResourceLoading() ? 'Cargando marcaciones' : null"
      ></div>

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

      <!-- Presets rápidos de fecha — atajos sin abrir el datepicker -->
      <div class="flex flex-wrap items-center gap-1.5 mb-3 -mt-1 text-xs">
        <span class="text-gray-500 mr-1">Rangos:</span>
        @for (preset of datePresets(); track preset.label) {
          <button
            type="button"
            (click)="applyDatePreset(preset.range)"
            class="px-2.5 py-1 rounded-full border transition-colors"
            [class.bg-amber-500/20]="isDatePresetActive(preset.range)"
            [class.border-amber-500/60]="isDatePresetActive(preset.range)"
            [class.text-amber-300]="isDatePresetActive(preset.range)"
            [class.bg-neutral-800/60]="!isDatePresetActive(preset.range)"
            [class.border-neutral-700/60]="!isDatePresetActive(preset.range)"
            [class.text-gray-300]="!isDatePresetActive(preset.range)"
            [class.hover:border-neutral-500]="!isDatePresetActive(preset.range)"
          >{{ preset.label }}</button>
        }
      </div>

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
        [isLoading]="anyResourceLoading() && !silentReloading()"
        [isInitialLoading]="isInitialLoading()"
        [delayToleranceMinutes]="delayToleranceMinutes"
        [employeeId]="employeeId"
        [maxEmployeeTagWidth]="maxEmployeeTagWidth()"
        [maxScheduleBadgeWidth]="maxScheduleBadgeWidth()"
        [maxDelayTagWidth]="maxDelayTagWidth()"
        [maxLunchTagWidth]="maxLunchTagWidth()"
        [maxExitTagWidth]="maxExitTagWidth()"
        [maxHoursTagWidth]="maxHoursTagWidth()"
        [isAdmin]="store.isAdmin()"
        [density]="tableDensity()"
        (overtimeAction)="onOvertimeAction($event)"
        (clearFiltersRequested)="clearAllFilters()"
        (employeeClicked)="onEmployeeClickedInTable($event)"
        (dayClicked)="openDayDrillDown($event)"
      ></pt-timelogs-table>
      <!-- Alertas de seguridad de marcaciones (solo Tristan) -->
      @if (canSeeSecurityAlerts()) {
        <div class="mt-4">
          <pt-timelog-alerts />
        </div>
      }
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

    <!-- Bulk approve overtime: confirmación + progreso -->
    <p-dialog
      header="Aprobar horas extras pendientes"
      [(visible)]="bulkConfirmVisible"
      [modal]="true"
      [closable]="!bulkProcessing()"
      [dismissableMask]="!bulkProcessing()"
      [style]="{ width: '460px' }"
    >
      @if (!bulkProcessing()) {
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <i class="pi pi-exclamation-triangle text-amber-400 text-xl"></i>
            <div class="flex-1">
              <div class="text-sm font-semibold text-white">
                {{ pendingOvertimeLogs().length }} registros con extras pendientes
              </div>
              <div class="text-xs text-gray-400">
                Total: {{ getBulkTotalHours().toFixed(2) }} h extras
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-300 m-0">
            Se aprobarán <strong>todas las horas extras pendientes visibles en la tabla actual</strong>.
            Esta acción procesará una por una y dejará un registro de auditoría.
          </p>
          <p class="text-xs text-gray-500 m-0 italic">
            Si quieres rechazar alguna o cambiar las horas, usa el botón individual en cada fila.
          </p>
        </div>
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button label="Cancelar" severity="secondary" [text]="true" (click)="bulkConfirmVisible.set(false)" />
            <p-button
              label="Aprobar todas"
              icon="pi pi-check"
              severity="success"
              (click)="confirmBulkApprove()"
            />
          </div>
        </ng-template>
      } @else {
        <div class="flex flex-col gap-3 items-center py-4">
          <i class="pi pi-spin pi-spinner text-3xl text-amber-400"></i>
          <div class="text-sm text-white">
            Procesando: {{ bulkProgress().done }} / {{ bulkProgress().total }}
          </div>
          @if (bulkProgress().failed > 0) {
            <div class="text-xs text-red-400">
              {{ bulkProgress().failed }} con error (se reintentará al finalizar)
            </div>
          }
          <div class="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-500 transition-all"
              [style.width]="(bulkProgress().total > 0 ? (bulkProgress().done / bulkProgress().total * 100) : 0) + '%'"
            ></div>
          </div>
        </div>
      }
    </p-dialog>

    <!-- Drill-down: detalle del día -->
    <p-dialog
      [header]="drillDownLog() ?
        ((drillDownLog()!.employee.first_name || '') + ' ' + (drillDownLog()!.employee.father_name || '') + ' — ' + (drillDownLog()!.day))
        : 'Detalle del día'"
      [(visible)]="drillDownVisible"
      [modal]="true"
      [style]="{ width: '640px', maxWidth: '95vw' }"
      [dismissableMask]="true"
    >
      @if (drillDownLog(); as log) {
        <div class="flex flex-col gap-4">
          <!-- Metadata -->
          <div class="flex flex-wrap gap-4 p-3 bg-neutral-800/40 rounded-lg border border-neutral-800">
            <div>
              <div class="text-[10px] uppercase text-gray-500">Horario</div>
              <div class="text-sm font-semibold text-white">{{ log.schedule?.schedule?.name || 'Sin horario' }}</div>
            </div>
            @if (log.totalHours) {
              <div>
                <div class="text-[10px] uppercase text-gray-500">Horas trabajadas</div>
                <div class="text-sm font-semibold"
                  [class.text-green-400]="!log.insufficientHours"
                  [class.text-red-400]="log.insufficientHours"
                >{{ log.totalHours.toFixed(2) }}h</div>
              </div>
            }
            @if (log.overtimeHours && log.overtimeHours > 0) {
              <div>
                <div class="text-[10px] uppercase text-gray-500">Extras</div>
                <div class="text-sm font-semibold text-cyan-400">{{ log.overtimeHours.toFixed(2) }}h</div>
              </div>
            }
            @if (log.delay) {
              <div>
                <div class="text-[10px] uppercase text-gray-500">Retraso</div>
                <div class="text-sm font-semibold text-red-400">{{ log.delay }} min</div>
              </div>
            }
            @if (log.alert) {
              <div>
                <div class="text-[10px] uppercase text-gray-500">Alerta</div>
                <div class="text-sm font-semibold text-amber-400">{{ log.alert }}</div>
              </div>
            }
          </div>

          <!-- Timeline visual de marcaciones -->
          <div class="flex flex-col gap-2">
            <div class="text-xs uppercase text-gray-500 font-semibold mb-1">Marcaciones</div>
            @for (mark of getDayMarks(log); track mark.type) {
              <div class="p-3 bg-neutral-800/60 rounded-lg border border-neutral-700/50 flex items-start gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  [style.background]="mark.color + '22'"
                >
                  <i class="pi text-sm" [ngClass]="mark.icon" [style.color]="mark.color"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-sm font-semibold text-white">{{ mark.label }}</span>
                    <span class="text-sm font-mono text-amber-300">
                      {{ mark.punch?.date | date : 'HH:mm:ss' : '-0500' }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-3 text-[11px] text-gray-400">
                    @if (mark.punch?.branch?.name) {
                      <span><i class="pi pi-building mr-1 text-[10px]"></i>{{ mark.punch?.branch?.name }}</span>
                    }
                    @if (mark.punch?.is_manual) {
                      <span class="text-amber-300">
                        <i class="pi pi-pencil mr-1 text-[10px]"></i>
                        Manual: {{ mark.punch?.manual_reason || 'sin motivo' }}
                      </span>
                    }
                    @if (mark.punch?.invalid_ip) {
                      <span class="text-orange-400">
                        <i class="pi pi-exclamation-triangle mr-1 text-[10px]"></i>
                        IP inválida: {{ mark.punch?.ip || '—' }}
                      </span>
                    } @else if (mark.punch?.ip) {
                      <span><i class="pi pi-globe mr-1 text-[10px]"></i>{{ mark.punch?.ip }}</span>
                    }
                    @if (mark.punch?.source) {
                      <span><i class="pi pi-tag mr-1 text-[10px]"></i>{{ mark.punch?.source }}</span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-4 text-center text-sm text-gray-500 bg-neutral-800/40 rounded-lg">
                <i class="pi pi-info-circle mr-1"></i>
                Sin marcaciones registradas para este día.
              </div>
            }
          </div>
        </div>
      }
    </p-dialog>

    <!-- Dialog para nombrar y guardar una vista -->
    <p-dialog
      header="Guardar vista"
      [(visible)]="saveViewDialogVisible"
      [modal]="true"
      [style]="{ width: '400px' }"
      [dismissableMask]="true"
    >
      <div class="flex flex-col gap-3">
        <p class="text-sm text-gray-400 m-0">
          Dale un nombre descriptivo a los filtros actuales para volver a ellos
          con un solo clic más tarde.
        </p>
        <input
          type="text"
          pInputText
          placeholder="Ej. Tardanzas este mes — Park Plaza"
          [ngModel]="newViewName()"
          (ngModelChange)="newViewName.set($event)"
          (keyup.enter)="saveCurrentView()"
          maxlength="60"
          class="w-full"
          autofocus
        />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (click)="saveViewDialogVisible.set(false)"
          />
          <p-button
            label="Guardar"
            icon="pi pi-bookmark"
            (click)="saveCurrentView()"
          />
        </div>
      </ng-template>
    </p-dialog>
  </div>`,
  styles: `
    ::ng-deep .p-tag .p-tag-icon {
      margin-right: 0.5rem;
    }
    /* Barra de progreso indeterminada — visible mientras cualquier resource
       esté cargando. Cuando termina, fade-out suave. */
    .timelogs-loading-bar {
      position: relative;
      height: 3px;
      width: 100%;
      margin: 0 0 4px 0;
      overflow: hidden;
      background: transparent;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }
    .timelogs-loading-bar--active {
      opacity: 1;
    }
    .timelogs-loading-bar--active::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 35%;
      height: 100%;
      background: linear-gradient(
        90deg,
        rgba(245, 158, 11, 0) 0%,
        rgba(245, 158, 11, 0.95) 50%,
        rgba(245, 158, 11, 0) 100%
      );
      animation: timelogs-loading-slide 1.2s ease-in-out infinite;
      border-radius: 2px;
    }
    @keyframes timelogs-loading-slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(385%); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsComponent {
  // ─── Injections ────────────────────────────────────────────
  public employees = inject(EmployeesStore);
  public store = inject(DashboardStore);

  /** Solo Tristan Whitehead (soporte) ve el panel de alertas de seguridad */
  public canSeeSecurityAlerts = computed((): boolean => {
    const emp = this.store.currentEmployee();
    if (!emp) return false;
    const email = (emp.work_email || emp.email || '').toLowerCase().trim();
    return email === 'soporte@blackdogpanama.com';
  });
  public organizationService = inject(OrganizationService);
  public timelogsApiService = inject(TimelogsApiService);
  private logger = inject(LoggerService);
  private apiUrl = inject(ApiUrlService);
  private injector = inject(Injector);
  private message = inject(MessageService);
  private overtimeService = inject(OvertimeRecordsService);

  // ─── Constants ─────────────────────────────────────────────
  private readonly TIMEZONE = 'America/Panama';
  // Cap real de la paginación en TimelogsApiService.fetchAllLogs: 50 páginas × 10K filas.
  // Si lo golpeamos, la UI muestra el warning de "Resultados incompletos".
  private readonly QUERY_LIMIT = 500000;

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
  // Toggle combinado: activa retrasos + errores + salida temprana + almuerzo
  public onlyProblems = signal(false);
  // Densidad de la tabla: 'normal' (44px por fila) o 'compact' (28px).
  // Persiste en localStorage para que cada usuario mantenga su preferencia.
  public tableDensity = signal<'normal' | 'compact'>(
    (typeof localStorage !== 'undefined' &&
      (localStorage.getItem('timelogs-density') as 'normal' | 'compact')) ||
      'normal',
  );
  public filtersExpanded = signal(false);
  public loading = signal(false);
  public pdfLoading = signal(false);
  // Vistas guardadas (filtros recurrentes que el usuario nombra)
  public savedViews = signal<TimelogSavedView[]>([]);
  public viewsMenuVisible = signal(false);
  public saveViewDialogVisible = signal(false);
  public newViewName = signal('');
  // Drill-down: detalle completo de un DayLog (timeline visual)
  public drillDownVisible = signal(false);
  public drillDownLog = signal<DayLog | null>(null);
  // Bulk approve overtime
  public bulkConfirmVisible = signal(false);
  public bulkProcessing = signal(false);
  public bulkProgress = signal({ done: 0, total: 0, failed: 0 });

  // Overtime dialog state
  public overtimeDialogVisible = signal(false);
  public selectedOvertimeLog = signal<DayLog | null>(null);
  public selectedOvertimeRecord = signal<EmployeeOvertimeRecord | null>(null);
  public overtimeLoading = signal(false);

  // ─── Realtime triggers ─────────────────────────────────────
  private timelogChanges = useRealtimeTrigger('timelogs');
  private scheduleChanges = useRealtimeTrigger('employee_schedules');
  private overtimeChanges = useRealtimeTrigger('employee_overtime_records');

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

  // ─── Quick date presets ────────────────────────────────────
  // El usuario casi siempre quiere uno de estos rangos. Los botones aplican
  // directamente sin pasar por el datepicker.
  public datePresets = computed(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });   // lunes
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });       // domingo
    const lastWeekStart = subDays(weekStart, 7);
    const lastWeekEnd = subDays(weekEnd, 7);
    const thisMonth = startOfMonth(today);
    const lastMonth = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    return [
      { label: 'Hoy', range: [today, today], shortcut: 'D' },
      { label: 'Ayer', range: [yesterday, yesterday], shortcut: 'Y' },
      { label: 'Esta semana', range: [weekStart, today], shortcut: 'W' },
      { label: 'Semana pasada', range: [lastWeekStart, lastWeekEnd], shortcut: '' },
      { label: 'Este mes', range: [thisMonth, today], shortcut: 'M' },
      { label: 'Mes pasado', range: [lastMonth, lastMonthEnd], shortcut: '' },
      { label: 'Últimos 7 días', range: [subDays(today, 6), today], shortcut: '' },
      { label: 'Últimos 30 días', range: [subDays(today, 29), today], shortcut: '' },
    ];
  });

  /**
   * Aplica un preset de fechas — atajo común para evitar el datepicker.
   */
  public applyDatePreset(range: Date[]): void {
    this.dateRange.set([startOfDay(range[0]), startOfDay(range[1])]);
  }

  /** True si el rango actual coincide exactamente con el preset. */
  public isDatePresetActive(range: Date[]): boolean {
    const current = this.dateRange();
    if (!current || current.length < 2) return false;
    return isSameDay(current[0], range[0]) && isSameDay(current[1], range[1]);
  }

  // ─── Tag width computeds (UI layout) ──────────────────────
  public maxEmployeeTagWidth = computed(() => {
    const possibleTags = ['Error de Horario', 'Día Libre', 'Feriado', 'Sin Horario'];
    const maxLength = Math.max(...possibleTags.map((tag) => tag.length));
    return `${Math.max(100, maxLength * 8 + 24)}px`;
  });

  public maxScheduleBadgeWidth = computed(() => {
    const schedules = this.schedules.value() || [];
    // Set para deduplicar — y reducción manual evita `Math.max(...spread)`
    // que puede stack-overflowear con miles de schedules.
    const uniqueNames = new Set<string>();
    for (const s of schedules) uniqueNames.add(s.schedule?.name || 'Sin horario');
    let maxLength = 'Sin horario'.length;
    uniqueNames.forEach((n) => { if (n.length > maxLength) maxLength = n.length; });
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

  // ─── Computed: Rango como strings 'yyyy-MM-dd' (compartido) ─
  // Calcular una vez aquí en vez de en cada totals/report computed.
  public normalizedDateStrings = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return { startStr: '', endStr: '' };
    return {
      startStr: format(startOfDay(new Date(start)), 'yyyy-MM-dd'),
      endStr: format(startOfDay(new Date(end)), 'yyyy-MM-dd'),
    };
  });

  // ─── Computed: Days list ───────────────────────────────────
  // El loop ascendente garantiza orden cronológico; no necesita .sort().
  days = computed(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return [];

    const normalizedStart = startOfDay(new Date(start));
    const normalizedEnd = startOfDay(new Date(end));
    const days: string[] = [];
    let currentDate = new Date(normalizedStart);

    while (currentDate <= normalizedEnd) {
      days.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }

    return days;
  });

  // ─── Computed: Filter state ────────────────────────────────
  // dateRange cuenta como "filtro activo" SOLO si el usuario eligió algo
  // distinto del default (mes actual hasta hoy). Antes contaba siempre
  // como activo porque el array tenía length 2 desde el inicio.
  public hasCustomDateRange = computed(() => {
    const range = this.dateRange();
    if (!range || range.length === 0) return false;
    const defaultStart = startOfMonth(new Date());
    const defaultEnd = new Date();
    const customStart = !range[0] || !isSameDay(range[0], defaultStart);
    const customEnd = !range[1] || !isSameDay(range[1], defaultEnd);
    return customStart || customEnd;
  });

  public hasActiveFilters = computed(
    () =>
      this.onlyDelayed() ||
      this.onlyErrors() ||
      this.onlyEarlyExit() ||
      this.onlyLunchExceeded() ||
      this.onlyWithMarcaciones() ||
      this.onlyProblems() ||
      !!this.employeeId() ||
      !!this.branchId() ||
      !!this.employeeSearch() ||
      this.hasCustomDateRange(),
  );

  public getActiveFiltersCount = computed(() => {
    let count = 0;
    if (this.onlyDelayed()) count++;
    if (this.onlyErrors()) count++;
    if (this.onlyEarlyExit()) count++;
    if (this.onlyLunchExceeded()) count++;
    if (this.onlyWithMarcaciones()) count++;
    if (this.onlyProblems()) count++;
    if (this.employeeId()) count++;
    if (this.branchId()) count++;
    if (this.employeeSearch()) count++;
    if (this.hasCustomDateRange()) count++;
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

  // ─── httpResource: Overtime Records ─────────────────────────
  // Trae los `employee_overtime_records` del rango para que el botón de
  // aprobación de extras refleje el estado real (pending/confirmed/rejected)
  // y para no crear duplicados al re-confirmar uno existente.
  public overtimeRecords = httpResource<EmployeeOvertimeRecord[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/employee_overtime_records', {
        select:
          '*,confirmedByEmployee:employees!confirmed_by(id,first_name,father_name)',
        and: `(timelog_date.gte.${startStr},timelog_date.lte.${endStr})`,
        company_id: `eq.${companyId}`,
      }),
      method: 'GET' as const,
    };
  });

  // ─── resource: Timelogs paginados (split before/after cutoff) ────
  // Supabase tiene un hard cap server-side de 10K filas por request. Paginamos
  // manual para no perder filas (exits al final del rango).
  public logsBefore22 = resource<any[], { start: Date; end: Date; employeeId?: string } | undefined>({
    params: () => {
      const { start, end } = this.normalizedDateRange();
      if (!start || !end) return undefined;
      const { beforeRange } = this.timelogsApiService.splitDateRange({ start, end });
      if (!beforeRange) return undefined;
      return { start: beforeRange.start, end: beforeRange.end, employeeId: this.employeeId() };
    },
    loader: async ({ params, abortSignal }) => {
      if (!params) return [];
      return this.timelogsApiService.fetchAllLogs(params.start, params.end, params.employeeId, abortSignal);
    },
  });

  public logsAfter22 = resource<any[], { start: Date; end: Date; employeeId?: string } | undefined>({
    params: () => {
      const { start, end } = this.normalizedDateRange();
      if (!start || !end) return undefined;
      const { afterRange } = this.timelogsApiService.splitDateRange({ start, end });
      if (!afterRange) return undefined;
      return { start: afterRange.start, end: afterRange.end, employeeId: this.employeeId() };
    },
    loader: async ({ params, abortSignal }) => {
      if (!params) return [];
      return this.timelogsApiService.fetchAllLogs(params.start, params.end, params.employeeId, abortSignal);
    },
  });

  // Fecha que parte las dos consultas de timelogs. Definida una sola vez en
  // TimelogsApiService.PUNCHED_AT_BACKFILL_CUTOFF_DATE.
  private readonly PUNCHED_AT_BACKFILL_CUTOFF = PUNCHED_AT_BACKFILL_CUTOFF_DATE;

  // ─── Computed: Logs combinados (memoizados) ────────────────
  // Tres signals independientes para que la memoización río abajo funcione:
  // cambiar isLoading no invalida el array de logs y viceversa.
  private logsValue = computed<any[]>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return [];

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const cutoffStr = this.PUNCHED_AT_BACKFILL_CUTOFF;

    const before22Data = this.logsBefore22.value() ?? [];
    const after22Data = this.logsAfter22.value() ?? [];

    if (endStr <= cutoffStr) return before22Data;
    if (startStr > cutoffStr) return after22Data;
    return [...before22Data, ...after22Data];
  });

  private logsIsLoading = computed<boolean>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return false;
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const cutoffStr = this.PUNCHED_AT_BACKFILL_CUTOFF;

    if (endStr <= cutoffStr) return this.logsBefore22.isLoading();
    if (startStr > cutoffStr) return this.logsAfter22.isLoading();
    return this.logsBefore22.isLoading() || this.logsAfter22.isLoading();
  });

  private logsErrorSignal = computed<any>(() => {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) return undefined;
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const cutoffStr = this.PUNCHED_AT_BACKFILL_CUTOFF;

    if (endStr <= cutoffStr) return this.logsBefore22.error();
    if (startStr > cutoffStr) return this.logsAfter22.error();
    return this.logsBefore22.error() || this.logsAfter22.error();
  });

  // Fachada estable para los consumidores que esperan { value, isLoading, error }
  public logs = {
    value: (): any[] => this.logsValue(),
    isLoading: (): boolean => this.logsIsLoading(),
    error: (): any => this.logsErrorSignal(),
  } as any;

  /**
   * Indicador GLOBAL de carga. True si CUALQUIERA de los 4 resources está
   * cargando (logs, schedules, timeoffs, overtimeRecords). Antes el spinner
   * de la tabla solo escuchaba `logs`, así que si schedules o timeoffs
   * tardaban más, la tabla aparecía vacía sin avisar al usuario.
   */
  public anyResourceLoading = computed(
    () =>
      this.logsIsLoading() ||
      this.schedules.isLoading() ||
      this.timeoffs.isLoading() ||
      this.overtimeRecords.isLoading(),
  );

  /**
   * True solo durante la PRIMERA carga (aún no hay datos en ningún
   * resource). Útil para mostrar skeleton/placeholder en vez de "Sin
   * resultados" mientras se obtienen datos por primera vez.
   */
  public isInitialLoading = computed(() => {
    if (!this.anyResourceLoading()) return false;
    // Hay algún resource cargando — verificar si ya tenemos datos previos
    const hasLogsData =
      (this.logsBefore22.value()?.length ?? 0) > 0 ||
      (this.logsAfter22.value()?.length ?? 0) > 0;
    const hasSchedulesData = (this.schedules.value()?.length ?? 0) > 0;
    // Primera carga si no tenemos NADA todavía
    return !hasLogsData && !hasSchedulesData;
  });

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
    const logsError = this.logsErrorSignal();
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

  // ─── Computed: DayLogs (3-phase memoization) ───────────────
  // Fase 1: estructura base (cara) — depende solo de datos crudos + rango + selección
  // de empleados/sucursal. NO incluye métricas ni alertas para que cambiar la
  // tolerancia no dispare un rebuild completo.
  public baseDayLogs = computed(() => {
    const { startStr, endStr } = this.normalizedDateStrings();
    if (!startStr || !endStr) return [];

    return buildBaseDayLogs({
      logsData: this.logs.value() ?? [],
      schedulesData: this.schedules.value() ?? [],
      timeoffsData: this.timeoffs.value() ?? [],
      daysList: this.days(),
      dateRangeStart: startStr,
      dateRangeEnd: endStr,
      employeesList: this.employees.employeesList(),
      employeeSearch: this.employeeSearch()?.toLowerCase().trim() || '',
      employeeId: this.employeeId(),
      branchId: this.branchId(),
      onlyWithMarcaciones: this.onlyWithMarcaciones(),
      timezone: this.TIMEZONE,
      logger: this.logger,
    });
  });

  // Fase 2: aplica alertas + métricas (retraso, horas, almuerzo) y mergea los
  // overtime records (estado pending/confirmed/rejected del botón de extras).
  // Solo re-corre cuando cambia la base, la tolerancia, o los overtime records.
  public dayLogs = computed(() => {
    return applyMetricsToDayLogs(
      this.baseDayLogs(),
      this.timeoffs.value() ?? [],
      this.TIMEZONE,
      this.delayToleranceMinutes(),
      this.logger,
      this.overtimeRecords.value() ?? [],
    );
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
      onlyProblems: this.onlyProblems(),
    })
  );

  /**
   * DayLogs visibles con extras pendientes de aprobación (overtimeHours > 0
   * y NO confirmed/rejected). Sirve para el botón de "Aprobar todas".
   */
  public pendingOvertimeLogs = computed(() => {
    return this.filteredDaylogs().filter(
      (dl) =>
        !!dl.overtimeHours &&
        dl.overtimeHours > 0 &&
        (!dl.overtimeRecord || dl.overtimeRecord.status === 'pending'),
    );
  });

  // ─── Computed: Totals for selected employee ────────────────
  // filteredDaylogs ya está acotado al rango por buildBaseDayLogs; no se
  // necesita re-filtrar por fecha aquí.
  public totalLunchExceededMinutes = computed(() =>
    this.filteredDaylogs().reduce((total: number, log: DayLog) => {
      if (log.lunchExceeded && log.lunchMinutes && log.lunchMinutes > 60) {
        return total + (log.lunchMinutes - 60);
      }
      return total;
    }, 0),
  );

  public totalDelayMinutes = computed(() =>
    this.filteredDaylogs().reduce((total: number, log: DayLog) => {
      if (log.delay && typeof log.delay === 'number') {
        return total + log.delay;
      }
      return total;
    }, 0),
  );

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

    // Categorizar primero por ID (robusto a renombres en Supabase), con
    // fallback a nombres por si aparece un schedule nuevo no registrado en
    // SUMMARY_SCHEDULE_IDS (ver timelogs-constants.ts).
    const categorize = (
      schedId: string | undefined | null,
      schedName: string,
    ): 'certMedicos' | 'injustificada' | 'justificada' | 'permiso' | 'compensatorio' | null => {
      if (schedId) {
        if (SUMMARY_SCHEDULE_IDS.certMedicos.includes(schedId as never)) return 'certMedicos';
        if (SUMMARY_SCHEDULE_IDS.injustificada.includes(schedId as never)) return 'injustificada';
        if (SUMMARY_SCHEDULE_IDS.justificada.includes(schedId as never)) return 'justificada';
        if (SUMMARY_SCHEDULE_IDS.permiso.includes(schedId as never)) return 'permiso';
        if (SUMMARY_SCHEDULE_IDS.compensatorio.includes(schedId as never)) return 'compensatorio';
      }
      // Fallback por nombre (solo si el ID no matchea ninguna categoría conocida)
      const n = schedName.toLowerCase().trim();
      if (!n) return null;
      if (n === 'cm' || n === 'incapacidad') return 'certMedicos';
      if (n.startsWith('a. injus') || n === 'ausencia') return 'injustificada';
      if (n.startsWith('a. justificada')) return 'justificada';
      if (n === 'permiso') return 'permiso';
      if (n === 'compensatorio') return 'compensatorio';
      return null;
    };

    for (const log of empLogs) {
      const schedId = log.schedule?.schedule?.id;
      const schedName = log.schedule?.schedule?.name || '';
      const category = categorize(schedId, schedName);
      if (!category) continue;

      if (category === 'certMedicos') {
        const alreadyCounted = empDisabilities.some(d => {
          const dStart = d.start_date?.slice(0, 10) || '';
          const dEnd = d.end_date?.slice(0, 10) || '';
          return log.day >= dStart && log.day <= dEnd;
        });
        if (!alreadyCounted) {
          details.certMedicos.push({ day: log.day, source: 'Horario asignado' });
        }
      } else if (category === 'injustificada') {
        injustificada++;
        details.injustificada.push({ day: log.day, source: 'Horario asignado' });
      } else if (category === 'justificada') {
        justificada++;
        details.justificada.push({ day: log.day, source: 'Horario asignado' });
      } else if (category === 'permiso') {
        permiso++;
        details.permiso.push({ day: log.day, source: 'Horario asignado' });
      } else if (category === 'compensatorio') {
        compensatorioDias++;
        details.compensatorio.push({ day: log.day, source: 'Horario asignado' });
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
    const { startStr, endStr } = this.normalizedDateStrings();
    if (!startStr || !endStr || filteredData.length === 0) return [];

    return mapDayLogsToReportRows(filteredData, startStr, endStr, this.TIMEZONE);
  });

  // ─── Constructor: Effects ──────────────────────────────────
  constructor() {
    // Cargar vistas guardadas del localStorage al iniciar
    try {
      this.savedViews.set(loadSavedViews());
    } catch {
      /* localStorage inaccesible, vacío */
    }

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

    // Realtime: si otro admin aprueba/rechaza overtime desde otro tab o desde
    // la API, refrescamos el record sin recargar la página.
    effect(() => {
      const batch = this.overtimeChanges();
      if (!batch) return;
      this.silentReloading.set(true);
      this.overtimeRecords.reload();
    }, { injector: this.injector });

    // Reset silentReloading robusto: espera a que TODOS los resources
    // terminen de cargar. Antes solo escuchaba logsIsLoading y se quedaba
    // pegado si schedules/timeoffs/overtime hacían reload por realtime sin
    // que logs estuviera cargando.
    effect(() => {
      const anyLoading =
        this.logsIsLoading() ||
        this.schedules.isLoading() ||
        this.timeoffs.isLoading() ||
        this.overtimeRecords.isLoading();
      if (!anyLoading && this.silentReloading()) {
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

    // Debounce de búsqueda de empleado: el usuario escribe en
    // `employeeSearchInput` y 400ms después se commitea a `employeeSearch`
    // (que dispara el filtro). Evita búsquedas en cada tecla y soluciona el
    // caso "escribí pero olvidé presionar Enter" — ahora se aplica solo.
    effect((onCleanup) => {
      const input = this.employeeSearchInput();
      const handle = setTimeout(() => {
        if (this.employeeSearch() !== input) {
          this.employeeSearch.set(input);
        }
      }, 400);
      onCleanup(() => clearTimeout(handle));
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

  // ─── Bulk approve overtime ─────────────────────────────────

  /** Total de horas extras pendientes en los DayLogs visibles. */
  public getBulkTotalHours(): number {
    return this.pendingOvertimeLogs().reduce(
      (acc, dl) => acc + (dl.overtimeHours ?? 0),
      0,
    );
  }

  /** Abre el dialog de confirmación de aprobación masiva. */
  public openBulkApprove(): void {
    if (this.pendingOvertimeLogs().length === 0) return;
    this.bulkConfirmVisible.set(true);
  }

  /**
   * Procesa la aprobación de todas las extras pendientes una por una.
   * Si una falla, continúa con las demás y al final reporta cuántas OK/error.
   * Cada operación es atómica en Supabase — no hay riesgo de estado parcial
   * dentro de un mismo record.
   */
  public async confirmBulkApprove(): Promise<void> {
    const logs = this.pendingOvertimeLogs();
    if (logs.length === 0) return;

    const currentEmployeeId = this.store.auth.currentEmployeeId();
    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario actual.',
      });
      return;
    }

    this.bulkProcessing.set(true);
    this.bulkProgress.set({ done: 0, total: logs.length, failed: 0 });

    let okCount = 0;
    let failCount = 0;

    for (const log of logs) {
      try {
        const existing = log.overtimeRecord;
        if (existing?.id) {
          await this.overtimeService.confirm({
            recordId: existing.id,
            confirmedBy: currentEmployeeId,
            hours: log.overtimeHours,
            reason: 'Aprobación masiva',
          });
        } else if (log.employee?.id) {
          const newRecord = await this.overtimeService.save({
            employee_id: log.employee.id,
            timelog_date: log.day,
            hours: log.overtimeHours ?? 0,
            status: 'confirmed',
            reason: 'Aprobación masiva',
          });
          await this.overtimeService.confirm({
            recordId: newRecord.id,
            confirmedBy: currentEmployeeId,
            hours: log.overtimeHours,
            reason: 'Aprobación masiva',
          });
        }
        okCount++;
      } catch (error) {
        failCount++;
        this.logger.error(
          '[TimelogsComponent] Error aprobando overtime en bulk',
          {
            employee_id: log.employee?.id,
            day: log.day,
            error,
          },
        );
      } finally {
        this.bulkProgress.update((p) => ({
          done: p.done + 1,
          total: p.total,
          failed: failCount,
        }));
      }
    }

    this.bulkProcessing.set(false);
    this.bulkConfirmVisible.set(false);
    this.overtimeRecords.reload();

    if (failCount === 0) {
      this.message.add({
        severity: 'success',
        summary: 'Extras aprobadas',
        detail: `${okCount} registros confirmados correctamente.`,
        life: 4000,
      });
    } else {
      this.message.add({
        severity: 'warn',
        summary: 'Aprobación parcial',
        detail: `${okCount} aprobadas, ${failCount} con error. Revisa el log y vuelve a intentarlo.`,
        life: 6000,
      });
    }
  }

  /** Abre el modal de drill-down con detalle completo del día. */
  public openDayDrillDown(log: DayLog): void {
    this.drillDownLog.set(log);
    this.drillDownVisible.set(true);
  }

  /**
   * Retorna las marcaciones del día ordenadas para el drill-down con
   * metadata visual (icono, color, etiqueta).
   */
  public getDayMarks(log: DayLog) {
    const marks: Array<{
      type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
      label: string;
      icon: string;
      color: string;
      punch: DayLog['entry'];
    }> = [];
    if (log.entry) {
      marks.push({
        type: 'entry',
        label: 'Entrada',
        icon: 'pi-sign-in',
        color: '#22C55E',
        punch: log.entry,
      });
    }
    if (log.lunch_start) {
      marks.push({
        type: 'lunch_start',
        label: 'Inicio de almuerzo',
        icon: 'pi-clock',
        color: '#F59E0B',
        punch: log.lunch_start,
      });
    }
    if (log.lunch_end) {
      marks.push({
        type: 'lunch_end',
        label: 'Fin de almuerzo',
        icon: 'pi-clock',
        color: '#F59E0B',
        punch: log.lunch_end,
      });
    }
    if (log.exit) {
      marks.push({
        type: 'exit',
        label: 'Salida',
        icon: 'pi-sign-out',
        color: '#3B82F6',
        punch: log.exit,
      });
    }
    return marks;
  }

  // ─── Vistas guardadas ──────────────────────────────────────

  /** Abre el dialog para nombrar y guardar la vista actual. */
  public openSaveViewDialog(): void {
    this.newViewName.set('');
    this.saveViewDialogVisible.set(true);
  }

  /** Persiste la vista actual con el nombre dado. */
  public saveCurrentView(): void {
    const name = this.newViewName().trim();
    if (!name) {
      this.message.add({
        severity: 'warn',
        summary: 'Nombre requerido',
        detail: 'Dale un nombre a tu vista para guardarla.',
      });
      return;
    }

    const range = this.dateRange();
    const view: TimelogSavedView = {
      id: generateViewId(),
      name,
      createdAt: new Date().toISOString(),
      filters: {
        dateRange:
          range && range.length === 2
            ? {
                start: format(range[0], 'yyyy-MM-dd'),
                end: format(range[1] ?? range[0], 'yyyy-MM-dd'),
              }
            : null,
        employeeId: this.employeeId(),
        branchId: this.branchId(),
        employeeSearch: this.employeeSearch() || undefined,
        onlyDelayed: this.onlyDelayed(),
        onlyErrors: this.onlyErrors(),
        onlyEarlyExit: this.onlyEarlyExit(),
        onlyLunchExceeded: this.onlyLunchExceeded(),
        onlyWithMarcaciones: this.onlyWithMarcaciones(),
        onlyProblems: this.onlyProblems(),
        delayRange: this.delayRange(),
        lunchExceededRange: this.lunchExceededRange(),
        delayToleranceMinutes: this.delayToleranceMinutes(),
      },
    };

    this.savedViews.set(addView(view));
    this.saveViewDialogVisible.set(false);
    this.message.add({
      severity: 'success',
      summary: 'Vista guardada',
      detail: `"${name}" disponible en el menú de vistas.`,
      life: 2500,
    });
  }

  /** Aplica una vista guardada como filtros activos. */
  public applyView(view: TimelogSavedView): void {
    const f = view.filters;
    if (f.dateRange) {
      this.dateRange.set([
        new Date(f.dateRange.start + 'T00:00:00'),
        new Date(f.dateRange.end + 'T00:00:00'),
      ]);
    }
    this.employeeId.set(f.employeeId);
    this.branchId.set(f.branchId);
    this.employeeSearch.set(f.employeeSearch ?? '');
    this.employeeSearchInput.set(f.employeeSearch ?? '');
    this.onlyDelayed.set(f.onlyDelayed);
    this.onlyErrors.set(f.onlyErrors);
    this.onlyEarlyExit.set(f.onlyEarlyExit);
    this.onlyLunchExceeded.set(f.onlyLunchExceeded);
    this.onlyWithMarcaciones.set(f.onlyWithMarcaciones);
    this.onlyProblems.set(f.onlyProblems);
    this.delayRange.set(f.delayRange ?? null);
    this.lunchExceededRange.set(f.lunchExceededRange ?? null);
    if (typeof f.delayToleranceMinutes === 'number') {
      this.delayToleranceMinutes.set(f.delayToleranceMinutes);
    }
    this.viewsMenuVisible.set(false);
    this.message.add({
      severity: 'info',
      summary: `Vista aplicada: ${view.name}`,
      detail: 'Filtros restaurados.',
      life: 2000,
    });
  }

  /** Elimina una vista guardada del localStorage. */
  public deleteView(view: TimelogSavedView, event: Event): void {
    event.stopPropagation();
    this.savedViews.set(removeView(view.id));
    this.message.add({
      severity: 'info',
      summary: 'Vista eliminada',
      detail: `"${view.name}" fue borrada.`,
      life: 2000,
    });
  }

  public toggleDensity(): void {
    const next = this.tableDensity() === 'compact' ? 'normal' : 'compact';
    this.tableDensity.set(next);
    try {
      localStorage.setItem('timelogs-density', next);
    } catch {
      /* localStorage no disponible (SSR), seguir */
    }
  }

  /**
   * Handler: el usuario hizo clic en el nombre de un empleado en la tabla.
   * Lo selecciona como filtro y limpia la búsqueda de texto para evitar
   * conflicto. Si ya está seleccionado, lo deselecciona (toggle).
   */
  public onEmployeeClickedInTable(employeeId: string | undefined): void {
    if (!employeeId) return;
    if (this.employeeId() === employeeId) {
      this.employeeId.set(undefined);
    } else {
      this.employeeId.set(employeeId);
      this.employeeSearch.set('');
      this.employeeSearchInput.set('');
    }
  }

  /**
   * Reset de todos los filtros UI a su valor default. El rango de fechas
   * vuelve al mes actual hasta hoy. No toca el dataset crudo — el rebuild
   * de DayLogs sale de la propia memoización al cambiar los signals.
   */
  public clearAllFilters(): void {
    this.dateRange.set([startOfMonth(new Date()), new Date()]);
    this.employeeId.set(undefined);
    this.branchId.set(undefined);
    this.employeeSearch.set('');
    this.employeeSearchInput.set('');
    this.onlyDelayed.set(false);
    this.onlyErrors.set(false);
    this.onlyEarlyExit.set(false);
    this.onlyLunchExceeded.set(false);
    this.onlyWithMarcaciones.set(false);
    this.onlyProblems.set(false);
    this.delayRange.set(null);
    this.lunchExceededRange.set(null);
    this.message.add({
      severity: 'info',
      summary: 'Filtros limpiados',
      detail: 'Vista restaurada al mes actual.',
      life: 2000,
    });
  }

  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  public getScheduleTooltip(schedule: EmployeeScheduleData | undefined): string | undefined {
    if (schedule && schedule.approved === false) return 'Horario pendiente de aprobación';
    return undefined;
  }

  /**
   * Exporta el reporte de marcaciones a un archivo Excel profesional con:
   *  - Hoja "Información": metadata + KPIs agregados del período.
   *  - Hoja "Marcaciones": detalle día por día con header de marca,
   *    zebra striping, errores destacados en rojo/amarillo, filtros automáticos,
   *    freeze pane.
   *  - Hoja "Totales": resumen por empleado con fila de gran total.
   *
   * La utilidad `exportTimelogsWorkbook` se carga dinámicamente (xlsx-js-style)
   * para mantener el bundle principal liviano.
   */
  async generateReport() {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      this.message.add({
        severity: 'warn',
        summary: 'Fecha requerida',
        detail: 'Por favor selecciona un rango de fechas',
      });
      return;
    }

    try {
      this.loading.set(true);

      const { exportTimelogsWorkbook } = await import(
        './timelogs/utils/timelogs-excel-export.utils'
      );

      const filteredDayLogs = this.filteredDaylogs();
      const totalRowsWithMarks = filteredDayLogs.filter(
        (dl) => dl.entry || dl.lunch_start || dl.lunch_end || dl.exit,
      ).length;

      const sel = this.selectedEmployee();
      const scopeName = sel?.short_name
        ? sel.short_name.toUpperCase().trim()
        : 'GLOBAL';

      await exportTimelogsWorkbook({
        filteredDayLogs,
        start,
        end,
        timezone: this.TIMEZONE,
        scopeName,
        totalRows: filteredDayLogs.length,
        totalRowsWithMarks,
        companyName: this.organizationService.isNaz()
          ? 'Naz'
          : 'Black Dog Panamá',
        generatedByEmail:
          this.store.currentEmployee()?.work_email ||
          this.store.currentEmployee()?.email ||
          undefined,
      });

      this.message.add({
        severity: 'success',
        summary: 'Reporte generado',
        detail: 'El archivo Excel se descargó correctamente.',
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

  /**
   * Exporta el reporte de marcaciones a un PDF profesional, orientación
   * horizontal con tabla detallada, totales por empleado y líneas de firma.
   * Apropiado para imprimir o adjuntar al expediente del empleado.
   */
  async generatePdf(): Promise<void> {
    const { start, end } = this.normalizedDateRange();
    if (!start || !end) {
      this.message.add({
        severity: 'warn',
        summary: 'Fecha requerida',
        detail: 'Por favor selecciona un rango de fechas',
      });
      return;
    }

    try {
      this.pdfLoading.set(true);
      const { exportTimelogsPdf } = await import(
        './timelogs/utils/timelogs-pdf-export.utils'
      );

      const sel = this.selectedEmployee();
      const scopeName = sel?.short_name
        ? sel.short_name.toUpperCase().trim()
        : 'GLOBAL';

      await exportTimelogsPdf({
        filteredDayLogs: this.filteredDaylogs(),
        start,
        end,
        timezone: this.TIMEZONE,
        scopeName,
        companyName: this.organizationService.isNaz()
          ? 'Naz'
          : 'Black Dog Panamá',
        generatedByEmail:
          this.store.currentEmployee()?.work_email ||
          this.store.currentEmployee()?.email ||
          undefined,
      });

      this.message.add({
        severity: 'success',
        summary: 'PDF generado',
        detail: 'El archivo PDF se descargó correctamente.',
      });
    } catch (error) {
      this.logger.error('Error generating PDF:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el PDF. Por favor, intente nuevamente.',
      });
    } finally {
      this.pdfLoading.set(false);
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
    // Recarga directa del resource — antes se forzaba un cambio de dateRange
    // para invalidar todo el árbol reactivo, ahora podemos pedir solo lo que
    // cambió.
    this.overtimeRecords.reload();
  }

  // ─── Atajos de teclado ────────────────────────────────────
  // Mejoran la productividad de power-users (RRHH, gerentes que revisan
  // marcaciones todo el día):
  //  - "/"            → enfocar la búsqueda
  //  - Cmd/Ctrl+K     → ídem, estilo command palette moderno
  //  - Esc            → limpiar filtros (si los hay) o cerrar dialogs
  //  - Shift+E        → exportar Excel
  //  - Shift+P        → toggle "Solo problemas"
  @HostListener('window:keydown', ['$event'])
  public handleShortcuts(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    // Cmd/Ctrl+K: enfocar búsqueda (siempre, hasta dentro de inputs)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusEmployeeSearch();
      return;
    }

    // Esc: si hay dialogs abiertos, los cerramos. Si no, limpia filtros.
    if (event.key === 'Escape') {
      if (this.drillDownVisible()) {
        this.drillDownVisible.set(false);
        return;
      }
      if (this.saveViewDialogVisible()) {
        this.saveViewDialogVisible.set(false);
        return;
      }
      if (this.viewsMenuVisible()) {
        this.viewsMenuVisible.set(false);
        return;
      }
      if (this.summaryDialogVisible()) {
        this.summaryDialogVisible.set(false);
        return;
      }
      if (this.infoDialogVisible()) {
        this.infoDialogVisible.set(false);
        return;
      }
      if (this.overtimeDialogVisible()) {
        this.overtimeDialogVisible.set(false);
        return;
      }
      if (!isTyping && this.hasActiveFilters()) {
        event.preventDefault();
        this.clearAllFilters();
      }
      return;
    }

    // Resto de atajos: solo si NO estamos escribiendo en un input
    if (isTyping) return;

    if (event.key === '/') {
      event.preventDefault();
      this.focusEmployeeSearch();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      this.generateReport();
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.onlyProblems.set(!this.onlyProblems());
      return;
    }
  }

  private focusEmployeeSearch(): void {
    // Busca el input del autocomplete y le da focus. Es defensivo porque la
    // estructura interna del autocomplete de PrimeNG puede cambiar.
    const el = document.querySelector(
      'pt-timelogs-filters input[type="text"]',
    ) as HTMLInputElement | null;
    if (el) {
      el.focus();
      el.select?.();
    }
  }
}
