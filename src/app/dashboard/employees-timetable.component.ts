import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  Injector,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  differenceInDays,
  endOfDay,
  format,
  isBefore,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { es as esDateFns } from 'date-fns/locale';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputOtp } from 'primeng/inputotp';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { ToggleSwitch, ToggleSwitchChangeEvent } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import * as OTPAuth from 'otpauth';
import { colorVariants, EmployeeSchedule, GroomerEmployeeConfig } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { SupabaseRealtimeService } from '../services/supabase-realtime.service';
import {
  ScheduleAuditLog,
  ScheduleAuditService,
} from '../services/schedule-audit.service';
import { ScheduleChangeRequestService, CreateChangeRequestPayload } from '../services/schedule-change-request.service';
import { ScheduleLockService } from '../services/schedule-lock.service';
import { DashboardStore } from '../stores/dashboard.store';
import { getEnvString } from '../utils/env.utils';
import { AddEmployeeToBranchDialogComponent } from './add-employee-to-branch-dialog.component';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';
import { AuditHistoryDialogComponent } from './employees-timetable/components/audit-history-dialog/audit-history-dialog.component';
import { ChangeRequestDialogComponent } from './employees-timetable/components/change-request-dialog/change-request-dialog.component';
import { ChangeRequestsMetricsComponent } from './employees-timetable/components/change-requests-metrics/change-requests-metrics.component';
import { ChangeRequestsPanelComponent } from './employees-timetable/components/change-requests-panel/change-requests-panel.component';
import { MonthWeekSelectorComponent } from './employees-timetable/components/month-week-selector/month-week-selector.component';
import { SpecificAuditDialogComponent } from './employees-timetable/components/specific-audit-dialog/specific-audit-dialog.component';
import { TimetableFiltersComponent } from './employees-timetable/components/timetable-filters/timetable-filters.component';
import { TimetableGridComponent } from './employees-timetable/components/timetable-grid/timetable-grid.component';
import { TimetableHeaderComponent } from './employees-timetable/components/timetable-header/timetable-header.component';
import {
  buildAsistenteMinEntryMinutesByKey,
  buildManagerConflictKeys,
  buildPeluqueroConflictKeys,
  buildShiftIntervalsByEmployeeId,
  findIntervalForDate,
  getCellScheduleWarning,
} from './employees-timetable/utils/timetable-schedule.utils';
import {
  ScheduleActionContext,
  TimetableScheduleActionsService,
} from './services/timetable-schedule-actions.service';
import { TimetableFilterService } from './services/timetable-filter.service';
import { TimetableNavigationService } from './services/timetable-navigation.service';
import { TimetablePermissionsService } from './services/timetable-permissions.service';
import {
  generateWeekDays,
  getCurrentWeekOfMonth,
  getMonthOptions,
  getWeeksInMonth,
} from './utils/timetable-date.utils';

// Helper: compara dos arrays como conjuntos (orden no importa).
function arraysEqualSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

@Component({
  selector: 'pt-employees-timetable',
  providers: [
    DialogService,
    DynamicDialogRef,
    TimetablePermissionsService,
    TimetableFilterService,
    TimetableScheduleActionsService,
    ConfirmationService,
  ],
  imports: [
    FormsModule,
    Button,
    ToggleSwitch,
    Select,
    MultiSelect,
    Dialog,
    InputText,
    ConfirmDialog,
    InputOtp,
    Tooltip,
    TimetableFiltersComponent,
    TimetableHeaderComponent,
    TimetableGridComponent,
    MonthWeekSelectorComponent,
    AuditHistoryDialogComponent,
    SpecificAuditDialogComponent,
    ChangeRequestDialogComponent,
    ChangeRequestsMetricsComponent,
    ChangeRequestsPanelComponent,
  ],
  template: `<div class="timetable-wrapper px-3 sm:px-5 md:px-8 pt-2 sm:pt-5 pb-4">
      <!-- Desktop title -->
      <div class="hidden md:flex md:items-end md:justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white m-0">Turnos</h2>
          <p class="text-sm text-gray-400 m-0 mt-0.5">
            Vista semanal de turnos y horarios de empleados
            <span class="ml-2 text-[11px]">
              <span class="font-semibold text-white">{{ fixedSchedulesList().length }}</span> fijos
              @if (coveringSchedulesList().length > 0) {
                · <span class="text-cyan-300 font-semibold">{{ coveringSchedulesList().length }}</span> cobertura
              }
              @if (floatingSchedulesList().length > 0) {
                · <span class="text-purple-300 font-semibold">{{ floatingSchedulesList().length }}</span> rotativos
              }
            </span>
          </p>
        </div>
        <!-- Leyenda de badges -->
        <div class="flex items-center gap-2 text-[10px]">
          <span class="font-semibold bg-green-500/15 text-green-300 border border-green-500/30 rounded px-2 py-0.5" pTooltip="Empleados con menos de 30 días en la empresa" tooltipPosition="top">NUEVO</span>
          <span class="font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded px-2 py-0.5" pTooltip="Empleado de otra sucursal cubriendo turnos aquí esta semana" tooltipPosition="top">COBERTURA</span>
          <span class="font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded px-2 py-0.5" pTooltip="Personal rotativo (sincronizado con Horario Peluquería)" tooltipPosition="top">ROTATIVO</span>
          <button
            class="ml-2 h-7 px-2 rounded-md bg-neutral-800 border border-neutral-700/50 text-gray-300 flex items-center gap-1.5 text-xs hover:bg-neutral-700 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
            (click)="openAuditHistoryDialog()"
            pTooltip="Historial de cambios por día y usuario"
            tooltipPosition="top"
          >
            <i class="pi pi-history text-xs"></i>
            <span>Historial</span>
          </button>
        </div>
      </div>

      <!-- Mobile compact header bar -->
      <div class="flex md:hidden items-center gap-2 mb-2">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <span class="text-sm font-bold text-white shrink-0">Turnos</span>
          <pt-timetable-header
            [currentWeekLabel]="currentWeek()"
            [menuItems]="menuItems"
          />
        </div>
        <div class="flex items-center gap-1 shrink-0">
          @if(permissionsService.canApproveSchedules() && !bulkSelectionMode() && totalPendingCount() > 0) {
            <button
              class="relative w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-gray-400 flex items-center justify-center"
              (click)="toggleBulkSelectionMode()"
            >
              <i class="pi pi-check-square text-xs"></i>
              <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-amber-500 rounded-full text-[9px] text-black font-bold flex items-center justify-center leading-none">{{ totalPendingCount() }}</span>
            </button>
          }
          @if(permissionsService.canAddEmployees()) {
            <button
              class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-gray-400 flex items-center justify-center"
              (click)="openAddEmployeeDialog()"
            >
              <i class="pi pi-user-plus text-xs"></i>
            </button>
          }
          @if (permissionsService.isStoreManager()) {
            <button
              class="w-8 h-8 rounded-lg bg-neutral-800 border border-cyan-500/30 text-cyan-400 flex items-center justify-center"
              (click)="showHelpDialog.set(true)"
            >
              <i class="pi pi-question-circle text-xs"></i>
            </button>
          }
          <button
            class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-gray-400 flex items-center justify-center hover:bg-neutral-700 transition-colors"
            (click)="openAuditHistoryDialog()"
            pTooltip="Historial de cambios"
            tooltipPosition="bottom"
          >
            <i class="pi pi-history text-xs"></i>
          </button>
          @if(!permissionsService.isStoreManager()) {
            <button
              class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-amber-400 flex items-center justify-center"
              (click)="showChangeRequestsMetrics.set(true)"
            >
              <i class="pi pi-chart-bar text-xs"></i>
            </button>
          }
          <button
            class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
            [class]="filtersOpen() ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-neutral-800 border-neutral-700/50 text-gray-400'"
            (click)="filtersOpen.set(!filtersOpen())"
          >
            <i class="pi pi-sliders-h text-xs"></i>
          </button>
        </div>
      </div>

      <!-- Mobile bulk selection bar -->
      @if (bulkSelectionMode()) {
        <div class="flex md:hidden items-center gap-2 bg-neutral-700/30 rounded-xl px-3 py-2 mb-2 border border-cyan-500/20">
          <span class="text-xs text-cyan-400 font-medium flex-1">
            <i class="pi pi-check-square mr-1.5"></i>{{ selectedShiftsCount() }} seleccionados
          </span>
          @if (selectedShiftsCount() > 0) {
            <button class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold" (click)="onBulkApprove()">Aprobar</button>
          }
          <button class="px-3 py-1.5 rounded-lg bg-neutral-700 border border-neutral-600 text-gray-300 text-xs" (click)="cancelBulkSelection()">Cancelar</button>
        </div>
      }

      <!-- Filtros: siempre visible en desktop, colapsable en mobile -->
      <div class="mb-4" [class.hidden]="isMobileView() && !filtersOpen()">
        <pt-timetable-filters
          [branches]="store.branches.entities()"
          [positions]="store.positions.entities()"
          [disableBranch]="disableBranch()"
          [hideBranch]="permissionsService.isStoreManager()"
          [employeeSearch]="filterService.employeeSearch"
          [currentBranch]="filterService.currentBranch"
          [currentPosition]="filterService.currentPosition"
        >
          <!-- Controles de navegación solo en desktop -->
          <div class="hidden md:flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2 w-full xl:w-auto">
            <pt-timetable-header
              [currentWeekLabel]="currentWeek()"
              [menuItems]="menuItems"
            />
            <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              @if(permissionsService.canApproveSchedules()) {
                @if (!bulkSelectionMode()) {
                  <p-button
                    [label]="'Seleccionar (' + totalPendingCount() + ')'"
                    icon="pi pi-check-square"
                    severity="info"
                    [outlined]="true"
                    size="small"
                    pTooltip="Seleccionar múltiples turnos para aprobar"
                    tooltipPosition="top"
                    (onClick)="toggleBulkSelectionMode()"
                    [disabled]="totalPendingCount() === 0"
                  />
                } @else {
                  <div class="flex items-center gap-2 bg-neutral-700/50 rounded-lg px-2 py-1">
                    <span class="text-xs text-cyan-400 font-medium">
                      <i class="pi pi-check-square mr-1"></i>{{ selectedShiftsCount() }} seleccionados
                    </span>
                    @if (selectedShiftsCount() > 0) {
                      <p-button [label]="'Aprobar (' + selectedShiftsCount() + ')'" icon="pi pi-check" severity="success" size="small" (onClick)="onBulkApprove()" />
                    }
                    <p-button label="Cancelar" icon="pi pi-times" severity="secondary" [outlined]="true" size="small" (onClick)="cancelBulkSelection()" />
                  </div>
                }
              }
              @if(permissionsService.canAddEmployees()) {
                <p-button
                  [label]="permissionsService.isStoreManager() ? '¿Te falta alguien en tu tienda?' : '¿No aparece un empleado?'"
                  icon="pi pi-user-plus"
                  [severity]="permissionsService.isStoreManager() ? 'info' : 'help'"
                  outlined
                  rounded
                  size="small"
                  (onClick)="openAddEmployeeDialog()"
                />
              }
              @if (permissionsService.isStoreManager()) {
                <p-button
                  icon="pi pi-question-circle"
                  severity="info"
                  outlined
                  rounded
                  size="small"
                  pTooltip="Guía de horarios"
                  tooltipPosition="top"
                  (onClick)="showHelpDialog.set(true)"
                />
              }
              @if (store.isAdmin()) {
                <p-button
                  icon="pi pi-history"
                  severity="info"
                  outlined
                  rounded
                  size="small"
                  pTooltip="Historial de auditoría de turnos"
                  tooltipPosition="top"
                  (onClick)="openAuditHistoryDialog()"
                />
                <p-button
                  icon="pi pi-chart-bar"
                  severity="warn"
                  outlined
                  rounded
                  size="small"
                  pTooltip="Métricas de solicitudes de cambio"
                  tooltipPosition="top"
                  (onClick)="showChangeRequestsMetrics.set(true)"
                />
                <div class="flex items-center gap-1.5 bg-neutral-800/60 border border-neutral-700/40 rounded-lg px-2 py-1 cursor-pointer"
                     [pTooltip]="lockIsActive() ? 'Sistema de bloqueo ON: los gerentes no podrán editar turnos cuando llegue el sabado de bloqueo. Desactivar requiere PIN de autenticador.' : 'Sistema de bloqueo OFF: los gerentes pueden editar turnos libremente. Activa para restablecer el ciclo de bloqueo.'"
                     tooltipPosition="top">
                  <i class="pi pi-lock text-xs" [class.text-amber-400]="lockIsActive()" [class.text-gray-500]="!lockIsActive()"></i>
                  <span class="text-xs" [class.text-amber-300]="lockIsActive()" [class.text-gray-500]="!lockIsActive()">
                    {{ lockIsActive() ? 'Sistema ON' : 'Sistema OFF' }}
                  </span>
                  <p-toggleSwitch [ngModel]="lockToggleValue()" (onChange)="onLockToggle($event)" styleClass="scale-75" />
                </div>
              }
            </div>
          </div>
        </pt-timetable-filters>
      </div>

      <!-- Cycle info banner: shown when week is NOT locked -->
      @if (!isCurrentWeekLocked()) {
        <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-2.5 mb-3">
          <i class="pi pi-lock-open text-emerald-400 text-lg flex-shrink-0"></i>
          <div class="flex-1">
            @if (permissionsService.isStoreManager()) {
              <div class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <span class="text-sm font-semibold text-emerald-300">Semana abierta</span>
                <span class="inline-flex items-center justify-center text-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[12px] text-emerald-200 min-w-[260px]">
                  <i class="pi pi-calendar text-[10px]"></i>
                  Trabajar en: {{ unlockWeekRangeLabel() }}
                </span>
              </div>
              <div class="text-xs text-emerald-200/70 mt-1">
                Puedes editar horarios directamente en esta semana.
                @if (nextLockDeadlineLabel()) {
                  Se bloquea el <span class="font-semibold text-emerald-200">{{ nextLockDeadlineLabel() }} a las 11:59 PM</span>.
                }
              </div>
            } @else {
              <span class="text-sm font-semibold text-emerald-300">Calendario abierto</span>
              <div class="text-xs text-emerald-200/70 mt-1">
                Los horarios se bloquean cada <span class="font-semibold text-emerald-200">sábado a las 11:59 PM</span> en ciclos de 2 semanas.
              </div>
            }
          </div>
        </div>
      }

      <!-- Lock banner: shown when week is locked -->
      @if (isCurrentWeekLocked()) {
        <div class="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-4">
          <i class="pi pi-lock text-amber-400 text-lg"></i>
          <div class="flex-1">
            @if (permissionsService.isStoreManager()) {
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span class="text-sm font-semibold text-amber-300">Semana bloqueada</span>
                <div class="flex flex-wrap items-center justify-center text-center gap-2 md:justify-end">
                  <span class="inline-flex items-center justify-center text-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[12px] text-amber-200 min-w-[220px]">
                    <i class="pi pi-lock text-[10px]"></i>
                    Bloqueado: {{ blockedWeekRangeLabel() }}
                  </span>
                  <span class="inline-flex items-center justify-center text-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[12px] text-emerald-200 min-w-[260px]">
                    <i class="pi pi-calendar text-[10px]"></i>
                    Trabajar en: {{ unlockWeekRangeLabel() }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-amber-200/70 mt-1">
                Para cambios usa <span class="font-semibold text-amber-200">Gestiones → Cambio de Horario</span>
              </div>
            } @else {
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-amber-300">Calendario bloqueado</span>
                <span class="inline-flex items-center justify-center text-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[11px] text-amber-200">
                  <i class="pi pi-calendar text-[10px]"></i>
                  Bloqueado: {{ blockedWeekRangeLabel() }}
                </span>
              </div>
              <div class="text-xs text-amber-200/70 mt-1">
                Los cambios a esta semana requieren solicitud de aprobación
              </div>
            }
          </div>
        </div>
      }

      <!-- Change requests button for approvers (always visible if pending) -->
      @if (!isCurrentWeekLocked() && permissionsService.canApproveSchedules() && pendingChangeRequestCount() > 0) {
        <div class="flex justify-end mb-3">
          <p-button
            label="Solicitudes de cambio"
            icon="pi pi-inbox"
            severity="warn"
            size="small"
            [outlined]="true"
            [badge]="'' + pendingChangeRequestCount()"
            badgeSeverity="danger"
            (onClick)="openChangeRequestsPanel()"
          />
        </div>
      }

      <pt-timetable-grid
        [employees]="fixedSchedulesList()"
        [days]="days()"
        [canManageSchedules]="store.canManageSchedules()"
        [canApproveSchedules]="permissionsService.canApproveSchedules()"
        [selectionMode]="bulkSelectionMode()"
        [selectedKeys]="selectedSelectionKeys()"
        [isStoreManager]="permissionsService.isStoreManager()"
        [lockedPositions]="lockedPositions()"
        [managerBranchId]="managerBranchId()"
        [viewBranchId]="viewBranchId()"
        [strictMode]="isStrictMode()"
        [disablePagination]="!!filterService.currentBranch()"
        (editShift)="editSchedule($event)"
        (deleteShift)="deleteSchedule($event.shift, $event.date)"
        (approveShift)="approveSchedule($event)"
        (confirmWeek)="confirmEmployeeWeek($event)"
        (addShift)="editSchedule($event)"
        (viewAudit)="onViewSpecificAudit($event)"
        (toggleSelection)="toggleShiftSelection($event)"
        (lockedShift)="onLockedShiftClick()"
        (employeeNameClick)="openFloatingToggleDialog($event)"
      />

      @if (coveringSchedulesList().length > 0) {
        <div class="flex items-center gap-2 mt-6 mb-2 px-1">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <i class="pi pi-sync text-cyan-400 text-sm"></i>
            <span class="text-sm font-bold text-cyan-300">Personal en cobertura</span>
            <span class="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full px-2 py-0.5">{{ coveringSchedulesList().length }}</span>
          </div>
          <span class="text-[11px] text-gray-400 hidden sm:inline">No son fijos de esta sucursal — cubren turnos esta semana.</span>
        </div>
        <pt-timetable-grid
          [employees]="coveringSchedulesList()"
          [days]="days()"
          [canManageSchedules]="store.canManageSchedules()"
          [canApproveSchedules]="permissionsService.canApproveSchedules()"
          [selectionMode]="bulkSelectionMode()"
          [selectedKeys]="selectedSelectionKeys()"
          [isStoreManager]="permissionsService.isStoreManager()"
          [lockedPositions]="lockedPositions()"
          [managerBranchId]="managerBranchId()"
          [viewBranchId]="viewBranchId()"
          [alwaysShowBranchTag]="true"
          [strictMode]="isStrictMode()"
          [disablePagination]="true"
          (editShift)="editSchedule($event)"
          (deleteShift)="deleteSchedule($event.shift, $event.date)"
          (approveShift)="approveSchedule($event)"
          (confirmWeek)="confirmEmployeeWeek($event)"
          (addShift)="editSchedule($event)"
          (viewAudit)="onViewSpecificAudit($event)"
          (toggleSelection)="toggleShiftSelection($event)"
          (lockedShift)="onLockedShiftClick()"
        />
      }

      @if (floatingSchedulesList().length > 0) {
        <div class="flex items-center gap-2 mt-6 mb-2 px-1">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <i class="pi pi-sync text-purple-400 text-sm"></i>
            <span class="text-sm font-bold text-purple-300">Personal rotativo</span>
            <span class="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2 py-0.5">{{ floatingSchedulesList().length }}</span>
          </div>
          <span class="text-[11px] text-gray-400 hidden sm:inline">Rotan entre sucursales — pueden o no tener sucursal hogar fija.</span>
        </div>
        <pt-timetable-grid
          [employees]="floatingSchedulesList()"
          [days]="days()"
          [canManageSchedules]="store.canManageSchedules()"
          [canApproveSchedules]="permissionsService.canApproveSchedules()"
          [selectionMode]="bulkSelectionMode()"
          [selectedKeys]="selectedSelectionKeys()"
          [isStoreManager]="permissionsService.isStoreManager()"
          [lockedPositions]="lockedPositions()"
          [managerBranchId]="managerBranchId()"
          [viewBranchId]="viewBranchId()"
          [alwaysShowBranchTag]="true"
          [strictMode]="isStrictMode()"
          [disablePagination]="true"
          (editShift)="editSchedule($event)"
          (deleteShift)="deleteSchedule($event.shift, $event.date)"
          (approveShift)="approveSchedule($event)"
          (confirmWeek)="confirmEmployeeWeek($event)"
          (addShift)="editSchedule($event)"
          (viewAudit)="onViewSpecificAudit($event)"
          (toggleSelection)="toggleShiftSelection($event)"
          (lockedShift)="onLockedShiftClick()"
          (employeeNameClick)="openFloatingToggleDialog($event)"
        />
      }
    </div>

    <p-dialog
      header="Desbloquear edicion"
      modal
      [(visible)]="unlockModal"
      [closable]="false"
      [dismissableMask]="true"
    >
      <div class="input-container">
        <label>Introduzca codigo de desbloqueo</label>
        <input pInputText type="text" #code />
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <p-button
          label="Cancelar"
          (click)="hideModal()"
          rounded
          severity="secondary"
        />
        <p-button label="Validar" (click)="validateCode(code)" rounded />
      </div>
    </p-dialog>

    <!-- Asignación de sucursal / rotativo -->
    <p-dialog
      header="Asignación de sucursal"
      [(visible)]="floatingDialogVisible"
      modal
      [dismissableMask]="true"
      [style]="{ width: '480px' }"
    >
      @if (floatingDialogEmployee(); as emp) {
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2 pb-2 border-b border-neutral-700/40">
            <i class="pi pi-user text-cyan-400"></i>
            <span class="font-semibold text-white">{{ emp.first_name }} {{ emp.father_name }}</span>
            <span class="text-xs text-gray-400">· {{ emp.position?.name || 'Sin cargo' }}</span>
            @if (floatingDialogIsFloating()) {
              <span class="ml-auto text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded px-1.5 py-0.5">ROTATIVO</span>
            }
          </div>

          <!-- Sucursal hogar (no rotativo: single-select obligatorio) -->
          @if (!floatingDialogIsFloating()) {
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <i class="pi pi-building text-[11px]"></i> Sucursal
              </label>
              <p-select
                fluid
                [ngModel]="floatingDialogBranchId() ?? null"
                (ngModelChange)="floatingDialogBranchId.set($event ?? undefined)"
                [options]="branchSelectOptions()"
                optionLabel="name"
                optionValue="id"
                placeholder="Seleccionar sucursal..."
                appendTo="body"
                filter
              />
            </div>
          }
          <!-- Sucursales habituales (rotativo: multi-select opcional) -->
          @if (floatingDialogIsFloating()) {
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <i class="pi pi-th-large text-[11px]"></i> Sucursales habituales
                <span class="text-[10px] font-normal text-gray-500">(opcional)</span>
              </label>
              <p-multiSelect
                [ngModel]="floatingDialogRotationBranches()"
                (ngModelChange)="floatingDialogRotationBranches.set($event ?? [])"
                [options]="branchSelectOptions()"
                optionLabel="name"
                optionValue="id"
                placeholder="Ninguna (solo donde tenga turnos)"
                display="chip"
                appendTo="body"
                filter
                [showClear]="true"
                styleClass="w-full"
              />
              <span class="text-[11px] text-gray-400 italic">
                Aparece en la sección "Personal rotativo" de cada sucursal seleccionada,
                más cualquier sucursal donde tenga turnos esa semana. Si dejas vacío, solo donde tenga turnos.
              </span>
            </div>
          }

          <!-- Toggle rotativo -->
          <div class="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <p-toggleSwitch
              [ngModel]="floatingDialogIsFloating()"
              (onChange)="floatingDialogIsFloating.set($event.checked)"
            />
            <div class="flex-1">
              <div class="text-sm font-semibold text-cyan-200 flex items-center gap-1.5">
                <i class="pi pi-sync text-[11px]"></i> Personal rotativo / sin sucursal fija
              </div>
              <p class="text-[11px] text-gray-400 m-0 mt-1">
                Aparecerá en la sección "Personal rotativo" — separado del resto — en su sucursal hogar
                y en cualquier sucursal donde tenga turnos esa semana.
                Compatible con tener una sucursal hogar asignada o quedar sin sucursal.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="floatingDialogVisible.set(false)" />
          <p-button label="Guardar" icon="pi pi-check" severity="info" (onClick)="saveFloatingDialog()" />
        </div>
      }
    </p-dialog>

    <pt-month-week-selector
      [(visible)]="monthWeekSelectorVisible"
      [(selectedMonth)]="selectedMonth"
      [(selectedWeek)]="selectedWeek"
      [monthOptions]="getMonthOptions()"
      [weekOptions]="weekOptions()"
      [selectedMonthOption]="selectedMonthOption()"
      (monthChange)="onMonthChange($event)"
      (confirm)="goToSelectedWeek()"
    />

    <pt-audit-history-dialog
      [(visible)]="showAuditHistoryDialog"
      [allHistory]="allAuditHistory()"
      [isLoading]="isLoadingAuditHistory()"
      [isLoadingMore]="isLoadingMoreAudit()"
      [hasMore]="hasMoreAuditHistory()"
      [employeeOptions]="store.employees.employeesList()"
      (loadMore)="loadMoreAuditHistory()"
    />

    <pt-specific-audit-dialog
      [(visible)]="showSpecificAuditDialog"
      [header]="specificAuditDialogHeader()"
      [history]="specificAuditHistory()"
      [isLoading]="isLoadingSpecificAudit()"
    />

    <pt-change-request-dialog
      [(visible)]="showChangeRequestDialog"
      [employeeId]="changeRequestEmployeeId()"
      [employeeName]="changeRequestEmployeeName()"
      [date]="changeRequestDate()"
      [requestType]="changeRequestType()"
      [currentSchedule]="changeRequestCurrentSchedule()"
      [branchId]="changeRequestBranchId()"
      [requestedBy]="store.currentEmployee()?.id || ''"
      [schedules]="store.schedules.entities()"
      (requestSent)="onChangeRequestSent()"
    />

    <pt-change-requests-panel
      [(visible)]="showChangeRequestsPanel"
      [canReview]="permissionsService.canApproveSchedules()"
      [reviewerId]="store.currentEmployee()?.id || ''"
      (requestProcessed)="onChangeRequestProcessed()"
    />

    <pt-change-requests-metrics
      [(visible)]="showChangeRequestsMetrics"
    />

    <!-- ConfirmDialog for manager shift edits -->
    <p-confirmdialog />

    <!-- Help guide dialog (store managers only) -->
    <p-dialog
      header="Guía de Horarios"
      [visible]="showHelpDialog()"
      (visibleChange)="showHelpDialog.set($event)"
      [modal]="true"
      [style]="{ width: '520px', maxWidth: '95vw' }"
      [draggable]="false"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <div class="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
          <h4 class="text-amber-300 font-semibold m-0 mb-2 flex items-center gap-2">
            <i class="pi pi-calendar-clock text-sm"></i> ¿Cómo funcionan los horarios?
          </h4>
          <p class="text-gray-300 m-0">
            Los horarios se planifican en <strong>ciclos de 2 semanas</strong>. Cada sábado a las 11:59 PM se bloquean
            los horarios de las próximas 2 semanas. <br/><br/>
            Durante esas 2 semanas bloqueadas, tienes tiempo para planificar las <strong>siguientes 2 semanas</strong>.
            Así el ciclo continúa cada 2 semanas.
          </p>
        </div>
        <div class="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
          <h4 class="text-white font-semibold m-0 mb-2 flex items-center gap-2">
            <i class="pi pi-arrow-right-arrow-left text-amber-400 text-sm"></i> ¿Cómo solicitar un cambio de horario?
          </h4>
          <ol class="text-gray-300 m-0 pl-4 space-y-1 list-decimal">
            <li>Ve a <strong>Gestiones</strong> en el menú lateral</li>
            <li>Selecciona <strong>"Cambio de Horario"</strong></li>
            <li>Llena el formulario con el empleado, fecha y horario propuesto</li>
            <li>Escribe una justificación clara</li>
            <li>Envía la solicitud — RRHH la revisará y aplicará el cambio si es aprobada</li>
          </ol>
        </div>
        <div class="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
          <h4 class="text-white font-semibold m-0 mb-2 flex items-center gap-2">
            <i class="pi pi-user-plus text-blue-400 text-sm"></i> ¿Te falta alguien en tu tienda?
          </h4>
          <p class="text-gray-300 m-0">
            Usa el botón <strong>"¿Te falta alguien en tu tienda?"</strong> para transferir un empleado a tu sucursal.
            El gerente de su sucursal actual recibirá una notificación automática.
          </p>
        </div>
        <div class="p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
          <h4 class="text-white font-semibold m-0 mb-2 flex items-center gap-2">
            <i class="pi pi-info-circle text-gray-400 text-sm"></i> Posiciones sin bloqueo
          </h4>
          <p class="text-gray-300 m-0">
            Peluqueros, Bañadores y Asistentes de peluquería <strong>no tienen bloqueo</strong> por la
            naturaleza dinámica de su trabajo. Sus horarios se pueden modificar en cualquier momento.
          </p>
        </div>
      </div>
    </p-dialog>

    <!-- Lock PIN dialog (admin/RRHH to disable lock) -->
    <p-dialog
      header="Desactivar bloqueo de horarios"
      [visible]="showLockPinDialog()"
      (visibleChange)="showLockPinDialog.set($event)"
      [modal]="true"
      [style]="{ width: '400px' }"
      [draggable]="false"
      (onHide)="onLockPinDialogHide()"
    >
      <div class="flex flex-col gap-4 py-2">
        <div class="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-sm text-amber-200">
          <i class="pi pi-exclamation-triangle mr-1.5 text-amber-400"></i>
          Al desactivar, los gerentes podrán editar horarios sin restricciones hasta que lo reactives.
        </div>
        <div class="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-gray-300">
          <i class="pi pi-shield mr-1.5 text-gray-400"></i>
          Introduce tu código de autenticador de 6 dígitos para confirmar.
        </div>
        <div class="flex flex-col items-center gap-2">
          <p-inputOtp [ngModel]="lockPinValue()" (ngModelChange)="lockPinValue.set($event)" [length]="6" [integerOnly]="true" />
          @if (lockPinError()) {
            <span class="text-xs text-red-400">{{ lockPinError() }}</span>
          }
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-neutral-700">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" rounded (onClick)="cancelLockPin()" />
          <p-button label="Confirmar desactivación" severity="danger" rounded [loading]="lockPinLoading()" (onClick)="confirmLockPin()" />
        </div>
      </div>
    </p-dialog>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesTimetableComponent implements OnInit {
  public store = inject(DashboardStore);
  public editionLocked = model<boolean>();
  public unlockModal = signal(false);

  // Asignación de sucursal / rotativo (source of truth: groomer_employee_config.is_rotating, compartido con salon-schedule)
  public floatingDialogVisible = signal(false);
  public floatingDialogEmployee = signal<any | null>(null);
  public floatingDialogBranchId = signal<string | undefined>(undefined);
  public floatingDialogIsFloating = signal<boolean>(false);
  /** Multi-select de sucursales habituales (solo aplica cuando rotativo=ON) */
  public floatingDialogRotationBranches = signal<string[]>([]);
  public groomerConfigs = signal<GroomerEmployeeConfig[]>([]);
  public rotatingMap = computed(() => {
    const m = new Map<string, boolean>();
    for (const c of this.groomerConfigs()) m.set(c.employee_id, !!c.is_rotating);
    return m;
  });
  /** Opciones del select de sucursal en el popup (incluye placeholder "sin sucursal" cuando rotativo) */
  public branchSelectOptions = computed(() =>
    this.store.branches.entities() as any[]
  );
  public monthWeekSelectorVisible = signal(false);
  public selectedMonth = signal<Date>(new Date());
  public selectedMonthOption = signal<{ label: string; value: Date }>({
    label: '',
    value: new Date(),
  });
  public selectedWeek = signal<number>(1);
  public disableBranch = signal(true);
  public filtersOpen = signal(false);
  public isMobileView = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  // Audit history
  public showAuditHistoryDialog = signal(false);
  public isLoadingAuditHistory = signal(false);
  public isLoadingMoreAudit = signal(false);
  public allAuditHistory = signal<ScheduleAuditLog[]>([]);
  public hasMoreAuditHistory = signal(true);
  private auditPage = 1;
  private readonly AUDIT_PAGE_SIZE = 50;

  // Specific audit dialog
  public showSpecificAuditDialog = signal(false);
  public selectedAuditEmployeeId = signal<string | null>(null);
  public selectedAuditDate = signal<Date | null>(null);
  public specificAuditHistory = signal<ScheduleAuditLog[]>([]);
  public isLoadingSpecificAudit = signal(false);

  // Change request dialog
  public showChangeRequestDialog = signal(false);
  public changeRequestEmployeeId = signal('');
  public changeRequestEmployeeName = signal('');
  public changeRequestDate = signal<Date | null>(null);
  public changeRequestType = signal<'create' | 'update' | 'delete'>('update');
  public changeRequestCurrentSchedule = signal<EmployeeSchedule | null>(null);
  public changeRequestBranchId = signal<string | null>(null);

  // Change requests panel & metrics
  public showChangeRequestsPanel = signal(false);
  public showChangeRequestsMetrics = signal(false);

  // Help dialog (store managers)
  public showHelpDialog = signal(false);

  // Lock PIN dialog (admin/RRHH)
  public showLockPinDialog = signal(false);
  public lockPinValue = signal('');
  public lockPinError = signal('');
  public lockPinLoading = signal(false);
  public lockIsActive = computed(() => this.scheduleLockService.settings()?.is_active ?? true);
  /** Local writable copy for the toggle visual state — prevents PrimeNG from flipping before PIN is confirmed */
  public lockToggleValue = signal(true);

  // Confirmation dialog — show only once per session
  private scheduleWarningShown = false;

  // Bulk selection
  public bulkSelectionMode = signal<boolean>(false);
  public selectedSelectionKeys = signal<Set<string>>(new Set());
  public selectedShiftsCount = computed(
    () => this.selectedSelectionKeys().size
  );
  public totalPendingCount = computed(() => {
    let count = 0;
    for (const emp of this.employeeSchedulesList()) {
      for (const day of emp.days) {
        if (day.shift && !day.shift.approved) count++;
      }
    }
    return count;
  });

  private apiUrl = inject(ApiUrlService);
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private realtime = inject(SupabaseRealtimeService);
  /** G3: realtime sync con salon-schedule. Cuando se toca groomer_employee_config en otra pestaña/vista, recargamos. */
  private configChanges = this.realtime.subscribeToTable('groomer_employee_config');
  private configReloadEffect = effect(() => {
    const change = this.configChanges();
    if (change) {
      // Recargar configs sin spammear
      this.loadGroomerConfigs();
    }
  });
  private readonly esLocale = esDateFns;
  public permissionsService = inject(TimetablePermissionsService);
  public filterService = inject(TimetableFilterService);
  public navigationService = inject(TimetableNavigationService);
  public injector = inject(Injector);
  private auditService = inject(ScheduleAuditService);
  private scheduleActions = inject(TimetableScheduleActionsService);
  private dialog = inject(DialogService);
  private message = inject(MessageService);
  private confirm = inject(ConfirmationService);
  public scheduleLockService = inject(ScheduleLockService);
  private changeRequestService = inject(ScheduleChangeRequestService);

  public isHRDepartment = this.permissionsService.isHRDepartment;
  public currentDate = this.navigationService.currentDate;
  public start = this.navigationService.start;
  public end = this.navigationService.end;
  public currentWeek = this.navigationService.currentWeek;
  public colorVariants = colorVariants;

  days = computed(() => generateWeekDays(this.start()));

  /**
   * Whether the currently viewed week is locked (past the Friday 6pm deadline).
   * Store managers cannot edit locked weeks — they must submit change requests.
   */
  public isCurrentWeekLocked = computed(() =>
    this.scheduleLockService.isWeekLocked(this.start())
  );

  /** Next lock deadline formatted string for the banner, e.g. "sábado 5 de abril". */
  public nextLockDeadlineLabel = computed(() => {
    const deadline = this.scheduleLockService.getNextLockDeadline(this.start());
    if (!deadline) return null;
    return format(deadline, "EEEE d 'de' MMMM", { locale: this.esLocale });
  });

  /**
   * Cycle ranges derived from lock settings:
   * - blockedRange: active locked cycle period
   * - workRange: next cycle period to work/edit
   */
  private lockCycleRanges = computed(() => {
    const settings = this.scheduleLockService.settings();
    const fallbackStart = this.start();
    const fallbackEnd = this.end();
    if (!settings?.reference_date) {
      return {
        blockedStart: fallbackStart,
        blockedEnd: fallbackEnd,
        workStart: addDays(fallbackEnd, 1),
        workEnd: addDays(fallbackEnd, 14),
      };
    }

    const refDate = new Date(`${settings.reference_date}T00:00:00`);
    const cycleDays = (settings.lock_cycle_weeks ?? 2) * 7;
    // Anchor on today to always show the currently-active locked cycle,
    // regardless of which week the user is viewing.
    const anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (anchor.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const periodIndex = daysDiff < 0 ? 0 : Math.floor(daysDiff / cycleDays);
    const blockedStart = addDays(refDate, periodIndex * cycleDays);
    const blockedEnd = addDays(blockedStart, cycleDays - 1);
    const workStart = addDays(blockedEnd, 1);
    const workEnd = addDays(workStart, cycleDays - 1);

    return { blockedStart, blockedEnd, workStart, workEnd };
  });

  /** Real blocked cycle range label (e.g. "29 mar - 11 abr 2026"). */
  public blockedWeekRangeLabel = computed(() => {
    const range = this.lockCycleRanges();
    return `${format(range.blockedStart, 'dd MMM', {
      locale: this.esLocale,
    })} - ${format(range.blockedEnd, 'dd MMM yyyy', { locale: this.esLocale })}`;
  });

  /** Next cycle range to work/edit (e.g. "12 abr - 25 abr 2026"). */
  public unlockWeekRangeLabel = computed(() => {
    const range = this.lockCycleRanges();
    return `${format(range.workStart, 'dd MMM', { locale: this.esLocale })} - ${format(
      range.workEnd,
      'dd MMM yyyy',
      { locale: this.esLocale }
    )}`;
  });

  /**
   * Set of position names that are locked for the currently viewed week.
   * Passed down to timetable-grid for per-employee lock rendering.
   */
  public lockedPositions = computed((): Set<string> => {
    const employees = this.employeeSchedulesList();
    const locked = new Set<string>();
    // Use any date from the current week as representative
    const refDate = this.start();
    for (const emp of employees) {
      const posName = emp.position?.name ?? '';
      if (posName && this.scheduleLockService.isDateLockedForPosition(refDate, posName)) {
        locked.add(posName);
      }
    }
    return locked;
  });

  /** Count of pending change requests (for badge display) */
  public pendingChangeRequestCount = signal(0);

  weekOptions = computed(() => {
    const weeks = this.getWeeksInMonth(this.selectedMonth());
    return weeks.map((w) => ({ label: 'Semana ' + w, value: w }));
  });

  // ========== Salon Branch Assignments Resource (linked to salon-schedule) ==========

  public assignmentsResource = httpResource<Array<{
    id: string;
    employee_id: string;
    branch_id: string;
    date: string;
    branch?: { id: string; name: string; short_name: string };
  }>>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(this.start(), 'yyyy-MM-dd');
    const endDate = format(this.end(), 'yyyy-MM-dd');
    return {
      url: this.apiUrl.build('rest/v1/groomer_branch_assignments', {
        and: `(date.gte.${startDate},date.lte.${endDate})`,
        ...(companyId ? { company_id: `eq.${companyId}` } : {}),
        select: 'id,employee_id,branch_id,date,branch:branches(id,name,short_name)',
      }),
      method: 'GET',
    };
  });

  /** Paleta de colores por sucursal — debe coincidir con salon-schedule */
  private readonly branchColorPalette = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
    '#F97316', '#14B8A6', '#A855F7', '#EAB308',
    '#22C55E', '#E11D48', '#0EA5E9', '#D946EF',
    '#6366F1', '#78716C', '#64748B', '#0D9488',
  ];

  private branchColorByShortName = computed((): Map<string, string> => {
    const branches = this.store.branches.entities()
      .filter((b: any) => b.short_name)
      .sort((a: any, b: any) => (a.short_name ?? '').localeCompare(b.short_name ?? ''));
    const map = new Map<string, string>();
    branches.forEach((b: any, i: number) => {
      map.set(b.short_name!, this.branchColorPalette[i % this.branchColorPalette.length]);
    });
    return map;
  });

  /** Map "<employeeId>|YYYY-MM-DD" → assignment con color */
  public assignmentsByEmployeeDate = computed((): Map<string, { branch_id: string; branch?: { id: string; name: string; short_name: string }; color?: string }> => {
    const map = new Map<string, { branch_id: string; branch?: { id: string; name: string; short_name: string }; color?: string }>();
    const colorMap = this.branchColorByShortName();
    for (const a of this.assignmentsResource.value() ?? []) {
      const dateKey = (a.date ?? '').slice(0, 10);
      const color = a.branch?.short_name ? colorMap.get(a.branch.short_name) : undefined;
      map.set(`${a.employee_id}|${dateKey}`, { branch_id: a.branch_id, branch: a.branch, color });
    }
    return map;
  });

  /** Sucursal del gerente actual (si aplica) */
  public managerBranchId = computed((): string | null => {
    if (!this.permissionsService.isStoreManager()) return null;
    return this.store.currentEmployee()?.branch_id ?? null;
  });

  /**
   * Sucursal "en foco" para la vista: la del gerente si aplica, sino la
   * seleccionada en el filtro de sucursal. Sirve para detectar empleados
   * que están cubriendo (no fijos en esa sucursal).
   */
  public viewBranchId = computed((): string | null => {
    return this.managerBranchId() ?? this.filterService.currentBranch() ?? null;
  });

  /** Setting global: si true, gerentes solo pueden agregar horarios desde salon-schedule (en espera) */
  public strictAssignmentMode = httpResource<any[]>(() => ({
    url: this.apiUrl.build('rest/v1/settings', {
      key: 'eq.salon_strict_assignment',
      select: 'value',
    }),
    method: 'GET',
  }));

  public isStrictMode = computed((): boolean => {
    const rows = this.strictAssignmentMode.value();
    return Array.isArray(rows) && rows.length > 0 && rows[0]?.value === 'true';
  });

  // ========== Schedule Resource ==========

  public schedulesResource = httpResource<EmployeeSchedule[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(this.start(), 'yyyy-MM-dd');
    const endDate = format(this.end(), 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/employee_schedules', {
        select:
          'id,employee_id,schedule_id,branch_id,start_date,end_date,approved,migrated_from_branch_id,migrated_at,cover_reason,schedule:schedules(id,name,color,day_off,entry_time),branch:branches(id,name,short_name),employee:employees!employee_schedule_employee_id_fkey(id,company_id)',
        start_date: `lte.${endDate}`,
        end_date: `gte.${startDate}`,
        ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
      }),
      method: 'GET',
    };
  });

  // ========== Computed: Employee + Schedule Mapping ==========

  /** Empleados "invitados" para gerentes: peluqueros de otras sucursales con
   * al menos un día de salon-schedule asignado a la sucursal del gerente
   * dentro del periodo visible. Solo lectura excepto en sus días asignados.
   */
  private guestEmployees = computed(() => {
    const viewBranchId = this.viewBranchId();
    if (!viewBranchId) return [];

    const baseIds = new Set(this.filterService.filteredEmployees().map((e) => e.id));
    const assignments = this.assignmentsResource.value() ?? [];
    const schedules = this.schedulesResource.value() ?? [];

    const guestIds = new Set<string>();
    for (const a of assignments) {
      if (a.branch_id === viewBranchId && !baseIds.has(a.employee_id)) {
        guestIds.add(a.employee_id);
      }
    }
    // Empleados con turnos directos (no solo asignaciones de peluquería)
    // en la sucursal en foco pero cuyo hogar es otra sucursal: están cubriendo.
    for (const s of schedules) {
      if (s.branch_id === viewBranchId && s.employee_id && !baseIds.has(s.employee_id)) {
        guestIds.add(s.employee_id);
      }
    }
    if (guestIds.size === 0) return [];

    const allEmployees = this.store.employees.employeesList()
      .filter((e: any) => e.is_active && guestIds.has(e.id) && e.branch_id !== viewBranchId);

    return allEmployees.map((e: any) => ({
      id: e.id,
      first_name: e.first_name,
      father_name: e.father_name,
      branch: e.branch,
      branch_id: e.branch_id,
      position: e.position,
      position_id: e.position_id,
      start_date: e.start_date,
    }));
  });

  public currentEmployees = computed(() => {
    const base = this.filterService.filteredEmployees();
    const guests = this.guestEmployees();
    return [...base, ...guests].map((employee) => ({
      ...employee,
      days: this.days(),
    }));
  });

  public shifts = computed(() =>
    this.schedulesResource
      .value()
      ?.filter((schedule) =>
        this.currentEmployees().some((e) => e.id === schedule.employee_id)
      )
      .map((shift) => ({
        id: shift.id,
        employee_id: shift.employee_id,
        branch_id: shift.branch_id,
        start_date: shift.start_date,
        end_date: shift.end_date,
        schedule_id: shift.schedule_id,
        schedule: shift.schedule,
        branch: shift.branch,
        approved: shift.approved,
      }))
      .flat()
  );

  private shiftIntervalsByEmployeeId = computed(() =>
    buildShiftIntervalsByEmployeeId(
      this.schedulesResource.value() ?? [],
      new Set(this.currentEmployees().map((e) => e.id))
    )
  );

  private managerConflictKeys = computed(() =>
    buildManagerConflictKeys(
      this.currentEmployees() as any,
      this.shiftIntervalsByEmployeeId()
    )
  );

  private peluqueroConflictKeys = computed(() =>
    buildPeluqueroConflictKeys(
      this.schedulesResource.value() ?? [],
      this.store.employees.entities() as any
    )
  );

  private asistenteMinEntryMinutesByKey = computed(() =>
    buildAsistenteMinEntryMinutesByKey(
      this.schedulesResource.value() ?? [],
      this.store.employees.entities() as any
    )
  );

  public employeeSchedulesList = computed(() => {
    const employees = this.currentEmployees();
    const intervalsMap = this.shiftIntervalsByEmployeeId();
    const mgrConflicts = this.managerConflictKeys();
    const pelConflicts = this.peluqueroConflictKeys();
    const asistenteMin = this.asistenteMinEntryMinutesByKey();
    const viewBranchId = this.viewBranchId();
    const rotating = this.rotatingMap();

    return employees.map((employee) => ({
      id: employee.id,
      first_name: employee.first_name,
      father_name: employee.father_name,
      branch_id: (employee as any).branch_id ?? null,
      position_id: employee.position_id,
      position: employee.position
        ? { id: (employee.position as any).id, name: employee.position.name }
        : { id: '', name: '' },
      isNewHire: differenceInDays(new Date(), employee.start_date ?? new Date()) < 30,
      // Fuente: groomer_employee_config.is_rotating (compartido con salon-schedule)
      isFloating: rotating.get(employee.id) ?? false,
      // Solo se considera "en cobertura" si su sucursal hogar difiere de la vista actual.
      // Los rotativos siguen en su lista normal y se identifican con badge ROTATIVO.
      isCovering: !!(viewBranchId && (employee as any).branch_id && (employee as any).branch_id !== viewBranchId),
      homeBranchName:
        (employee as any).branch?.short_name
        ?? (employee as any).branch?.name
        ?? null,
      days: employee.days.map((day) => {
        const shift =
          findIntervalForDate(
            intervalsMap.get(employee.id) ?? [],
            day.date
          )?.shift ?? null;
        const scheduleWarning = getCellScheduleWarning(
          employee.position_id,
          day.date,
          shift,
          mgrConflicts,
          pelConflicts,
          asistenteMin
        );
        const dateKey = format(day.date, 'yyyy-MM-dd');
        const assignment = this.assignmentsByEmployeeDate().get(`${employee.id}|${dateKey}`) ?? null;
        return { ...day, shift, scheduleWarning, assignment };
      }),
    }));
  });

  /** Empleados fijos de la sucursal en foco (o todos cuando no hay filtro).
   *  Excluye rotativos (van a su propia sección al final). */
  public fixedSchedulesList = computed(() =>
    this.employeeSchedulesList().filter((e) => !e.isCovering && !e.isFloating)
  );

  /** Empleados en cobertura: aparecen cuando hay sucursal en foco
   *  y su sucursal hogar es distinta. Excluye rotativos. */
  public coveringSchedulesList = computed(() =>
    this.employeeSchedulesList().filter((e) => e.isCovering && !e.isFloating)
  );

  /** Empleados rotativos. Aparecen siempre al final, separados del personal fijo
   *  aunque tengan la misma sucursal hogar que la vista actual. */
  public floatingSchedulesList = computed(() =>
    this.employeeSchedulesList().filter((e) => e.isFloating)
  );

  // ========== Specific Audit Dialog Header ==========

  public specificAuditDialogHeader = computed(() => {
    const employeeId = this.selectedAuditEmployeeId();
    const date = this.selectedAuditDate();
    const employeeName = employeeId
      ? this.getEmployeeName(employeeId)
      : '';
    const dateStr = date ? format(date, 'dd/MM/yyyy') : '';
    return `Historial de Auditoría - ${employeeName} - ${dateStr}`;
  });

  // ========== Menu Items ==========

  public menuItems: MenuItem[] = [
    {
      label: 'Semana actual',
      icon: 'pi pi-calendar',
      command: () => this.goToday(),
    },
    { separator: true },
    {
      label: 'Semana anterior',
      icon: 'pi pi-angle-left',
      command: () => this.previousWeek(),
    },
    {
      label: 'Semana siguiente',
      icon: 'pi pi-angle-right',
      command: () => this.nextWeek(),
    },
    { separator: true },
    {
      label: 'Ir a Semana Trabajar',
      icon: 'pi pi-calendar-plus',
      command: () => this.goToWorkWeek(),
    },
    {
      label: 'Seleccionar mes y semana',
      icon: 'pi pi-calendar',
      command: () => this.openMonthWeekSelector(),
    },
  ];

  // ========== Lifecycle ==========

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobileView.set(window.innerWidth < 768);
  }

  ngOnInit(): void {
    this.editionLocked.set(true);
    this.store.positions.fetchItems();
    this.scheduleLockService.loadSettings();
    this.loadPendingChangeRequestCount();
    this.loadGroomerConfigs();

    effect(
      () => {
        this.disableBranch.set(
          this.permissionsService.shouldDisableBranchSelector()
        );
        const filterBranchId = this.permissionsService.getFilterBranchId();
        if (filterBranchId !== null) {
          this.filterService.currentBranch.set(filterBranchId);
        }
      },
      { injector: this.injector }
    );

    // Keep lockToggleValue in sync with the real lock state
    effect(
      () => { this.lockToggleValue.set(this.lockIsActive()); },
      { injector: this.injector, allowSignalWrites: true }
    );

    // Retry loadSettings when companyId becomes available (fixes race condition)
    effect(
      () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        if (companyId && !this.scheduleLockService.loaded()) {
          this.scheduleLockService.loadSettings();
        }
      },
      { injector: this.injector }
    );
  }

  private loadPendingChangeRequestCount(): void {
    this.changeRequestService.getPendingCount().subscribe({
      next: (requests) => this.pendingChangeRequestCount.set(requests.length),
      error: () => this.pendingChangeRequestCount.set(0),
    });
  }

  // ========== Navigation ==========

  public nextWeek() { this.navigationService.nextWeek(); }
  public previousWeek() { this.navigationService.previousWeek(); }
  public goToday() { this.navigationService.goToToday(); }

  public goToWorkWeek(): void {
    const workStart = this.lockCycleRanges().workStart;
    this.navigationService.goToDate(workStart);
  }

  public openMonthWeekSelector() {
    const today = new Date();
    const monthDate = startOfMonth(today);
    this.selectedMonth.set(monthDate);
    const options = this.getMonthOptions();
    const currentOption =
      options.find((opt) => isSameMonth(opt.value, monthDate)) ||
      options[options.length - 1];
    this.selectedMonthOption.set(currentOption);
    this.selectedWeek.set(this.getCurrentWeekOfMonth(today));
    this.monthWeekSelectorVisible.set(true);
  }

  public getWeeksInMonth = getWeeksInMonth;
  public getCurrentWeekOfMonth = getCurrentWeekOfMonth;
  public getMonthOptions = getMonthOptions;

  public onMonthChange(option: { label: string; value: Date }) {
    if (option?.value) {
      this.selectedMonthOption.set(option);
      this.selectedMonth.set(option.value);
      this.selectedWeek.set(1);
    }
  }

  public goToSelectedWeek() {
    this.navigationService.goToSelectedWeek(
      this.selectedMonth(),
      this.selectedWeek()
    );
    this.monthWeekSelectorVisible.set(false);
  }

  // ========== Unlock Edition ==========

  unlockEdition(event: ToggleSwitchChangeEvent) {
    if (!event.checked) this.unlockModal.set(true);
  }

  validateCode(code: HTMLInputElement) {
    if (code.value === getEnvString('ENV_UNLOCK_CODE')) {
      this.editionLocked.set(false);
      this.unlockModal.set(false);
      code.value = '';
      return;
    }
    this.editionLocked.set(true);
  }

  public hideModal() {
    this.editionLocked.set(true);
    this.unlockModal.set(false);
  }

  // ========== Lock Toggle (admin/RRHH) ==========

  public onLockToggle(event: ToggleSwitchChangeEvent): void {
    if (!event.checked) {
      // Disabling requires PIN — accept the visual flip (false→false is no-op, stays flipped),
      // show dialog. If cancelled we revert to true (a real change).
      this.lockToggleValue.set(false);
      this.lockPinValue.set('');
      this.lockPinError.set('');
      this.showLockPinDialog.set(true);
    } else {
      // Re-enabling needs no PIN
      this.scheduleLockService.toggleLock(true).catch(() => {
        this.lockToggleValue.set(false); // Revert on failure
        this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo activar el bloqueo.' });
      });
    }
  }

  public async confirmLockPin(): Promise<void> {
    const token = String(this.lockPinValue() ?? '');
    if (token.length < 6) {
      this.lockPinError.set('Introduce los 6 dígitos completos.');
      return;
    }
    const currentEmp = this.store.currentEmployee();
    if (!currentEmp?.code_uri) {
      this.lockPinError.set('No tienes un autenticador configurado. Contacta al administrador.');
      return;
    }
    this.lockPinLoading.set(true);
    try {
      const totp = OTPAuth.URI.parse(currentEmp.code_uri);
      if ((totp as any).validate({ token }) === null) {
        this.lockPinError.set('Código incorrecto. Intenta de nuevo.');
        this.lockPinValue.set('');
        return;
      }
      await this.scheduleLockService.toggleLock(false);
      this.showLockPinDialog.set(false);
      this.message.add({ severity: 'warn', summary: 'Bloqueo desactivado', detail: 'Los gerentes pueden editar horarios temporalmente.' });
    } catch {
      this.lockPinError.set('Error al desactivar el bloqueo. Intenta de nuevo.');
    } finally {
      this.lockPinLoading.set(false);
    }
  }

  public cancelLockPin(): void {
    this.lockToggleValue.set(true); // Revert toggle visual (false→true = real change)
    this.showLockPinDialog.set(false);
  }

  public onLockPinDialogHide(): void {
    // Revert toggle if lock is still active (dialog closed without confirming PIN)
    if (this.lockIsActive()) {
      this.lockToggleValue.set(true);
    }
    this.lockPinValue.set('');
    this.lockPinError.set('');
  }

  // ========== Schedule CRUD (delegated to service) ==========

  private getActionContext(): ScheduleActionContext {
    return {
      currentEmployeeId: this.store.currentEmployee()?.id,
      schedules: this.store.schedules.entities() as any,
      employees: this.store.employees.entities() as any,
      branches: this.store.branches.entities() as any,
    };
  }

  private onScheduleActionSuccess = () => this.schedulesResource.reload();

  public editSchedule({
    employee_id,
    employee_schedule,
    date,
    branchId,
  }: {
    employee_id?: string;
    employee_schedule?: EmployeeSchedule;
    date?: Date;
    branchId?: string;
  } = {}): void {
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para editar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden editar horarios.',
      });
      return;
    }

    // Calcular isNewHire antes de los checks de bloqueo (también se pasa al dialog)
    const _empForNewHire = this.store.employees.entities().find(e => e.id === (employee_id || employee_schedule?.employee_id));
    const isNewHire = differenceInDays(new Date(), _empForNewHire?.start_date ?? new Date()) < 15;

    // If date is locked for this employee's position and user is store manager, redirect to gestiones
    // Si la semana está bloqueada y el gerente no es admin/HR, redirigir a gestiones
    if (this.permissionsService.isStoreManager()) {
      const targetDate = date || (employee_schedule?.start_date ? new Date(employee_schedule.start_date) : this.start());
      const positionName = _empForNewHire?.position?.name || '';
      if (!isNewHire && this.scheduleLockService.isDateLockedForPosition(targetDate, positionName)) {
        this.message.add({
          severity: 'warn',
          summary: 'Calendario bloqueado',
          detail: 'Este horario está bloqueado. Ve a Gestiones → Cambio de Horario para enviar una solicitud de cambio.',
          life: 5000,
        });
        return;
      }
    }

    const employeeHasSchedulesInWeek = employee_id
      ? this.shifts()?.some(
          (shift) =>
            shift.employee_id === employee_id &&
            isWithinInterval(this.start(), {
              start: startOfDay(
                toDate(shift.start_date, { timeZone: 'America/Panama' })
              ),
              end: endOfDay(
                toDate(shift.end_date, { timeZone: 'America/Panama' })
              ),
            })
        ) || false
      : false;

    const openForm = () => {
      const ref = this.dialog.open(EmployeeSchedulesFormComponent, {
        header: 'Editar horario',
        data: {
          employee_id,
          employee_schedule,
          date,
          branch: branchId ?? this.filterService.currentBranch(),
          weekStart: this.start(),
          weekEnd: this.end(),
          employeeHasSchedulesInWeek,
          isNewHire,
        },
        modal: true,
        dismissableMask: true,
      });
      ref?.onClose?.subscribe(() => this.schedulesResource.reload());
    };

    if (this.permissionsService.isStoreManager() && !this.scheduleWarningShown) {
      this.confirm.confirm({
        header: 'Aviso importante',
        message: 'Una vez que confirmes este horario, no podrás modificarlo sin enviar una solicitud de aprobación a RRHH. ¿Deseas continuar?',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonProps: { label: 'Sí, continuar', severity: 'warn' },
        rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
        accept: () => {
          this.scheduleWarningShown = true;
          openForm();
        },
      });
    } else {
      openForm();
    }
  }

  public isPast = (date: Date) => isBefore(date, new Date());

  deleteSchedule(employee_schedule: EmployeeSchedule, date?: Date) {
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para eliminar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden eliminar horarios.',
      });
      return;
    }

    // If date is locked for this employee's position and user is store manager, redirect to gestiones
    if (this.permissionsService.isStoreManager()) {
      const targetDate = date || (employee_schedule.start_date ? new Date(employee_schedule.start_date) : this.start());
      const emp = this.store.employees.entities().find(e => e.id === employee_schedule.employee_id);
      const positionName = emp?.position?.name || '';
      if (this.scheduleLockService.isDateLockedForPosition(targetDate, positionName)) {
        this.message.add({
          severity: 'warn',
          summary: 'Calendario bloqueado',
          detail: 'Este horario está bloqueado. Ve a Gestiones → Cambio de Horario para enviar una solicitud de cambio.',
          life: 5000,
        });
        return;
      }
    }

    this.scheduleActions.deleteSchedule(
      employee_schedule,
      date,
      this.getActionContext(),
      this.onScheduleActionSuccess
    );
  }

  public approveSchedule(id: string) {
    this.scheduleActions.approveSchedule(
      id,
      this.shifts() ?? [],
      this.getActionContext(),
      this.onScheduleActionSuccess
    );
  }

  public confirmEmployeeWeek(employee: any) {
    const pendingWithWarnings = employee.days.filter(
      (d: any) => d.shift && !d.shift.approved && d.scheduleWarning
    );
    if (pendingWithWarnings.length > 0) {
      this.message.add({
        severity: 'warn',
        summary: 'Aprobación en lote no permitida',
        detail: `${pendingWithWarnings.length} horario(s) tienen advertencias. Debes aprobarlos uno por uno desde cada celda.`,
      });
      return;
    }

    this.scheduleActions.confirmEmployeeWeek(
      employee,
      this.getActionContext(),
      this.onScheduleActionSuccess
    );
  }

  // ========== Change Requests ==========

  public openChangeRequestDialog(
    employeeId: string,
    date: Date | undefined,
    requestType: 'create' | 'update' | 'delete',
    currentSchedule?: EmployeeSchedule
  ): void {
    this.changeRequestEmployeeId.set(employeeId);
    this.changeRequestEmployeeName.set(this.getEmployeeName(employeeId));
    this.changeRequestDate.set(date || null);
    this.changeRequestType.set(requestType);
    this.changeRequestCurrentSchedule.set(currentSchedule || null);
    this.changeRequestBranchId.set(
      currentSchedule?.branch_id || this.filterService.currentBranch() || null
    );
    this.showChangeRequestDialog.set(true);
  }

  public openChangeRequestsPanel(): void {
    this.showChangeRequestsPanel.set(true);
  }

  public onChangeRequestSent(): void {
    this.loadPendingChangeRequestCount();
  }

  public onChangeRequestProcessed(): void {
    this.loadPendingChangeRequestCount();
    this.schedulesResource.reload();
  }

  // ========== Bulk Selection ==========

  public toggleBulkSelectionMode(): void {
    this.bulkSelectionMode.set(true);
    this.selectedSelectionKeys.set(new Set());
  }

  public cancelBulkSelection(): void {
    this.bulkSelectionMode.set(false);
    this.selectedSelectionKeys.set(new Set());
  }

  public toggleShiftSelection(event: { shiftId: string; date: Date }): void {
    if (!event.shiftId) return;
    const key = `${event.shiftId}|${event.date.toISOString()}`;
    const newSet = new Set(this.selectedSelectionKeys());
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    this.selectedSelectionKeys.set(newSet);
  }

  public onBulkApprove(): void {
    const keys = Array.from(this.selectedSelectionKeys());
    if (keys.length === 0) return;

    const shiftIds = new Set<string>();
    keys.forEach((key) => {
      const parts = key.split('|');
      if (parts.length > 0) shiftIds.add(parts[0]);
    });

    const uniqueIds = Array.from(shiftIds);
    if (uniqueIds.length === 0) return;

    const list = this.employeeSchedulesList();
    const idsWithWarnings = new Set<string>();
    for (const emp of list) {
      for (const day of emp.days) {
        if (day.shift?.id && day.scheduleWarning) {
          idsWithWarnings.add(day.shift.id);
        }
      }
    }
    const selectedWithWarnings = uniqueIds.filter((id) => idsWithWarnings.has(id));
    if (selectedWithWarnings.length > 0) {
      this.message.add({
        severity: 'warn',
        summary: 'Aprobación en lote no permitida',
        detail: `${selectedWithWarnings.length} horario(s) tienen advertencias. Debes aprobarlos uno por uno desde cada celda.`,
      });
      return;
    }

    this.scheduleActions.batchApproveSchedules(
      uniqueIds,
      keys.length,
      this.shifts() ?? [],
      this.getActionContext(),
      () => {
        this.cancelBulkSelection();
        this.schedulesResource.reload();
      }
    );
  }

  // ========== Add Employee Dialog ==========

  public openAddEmployeeDialog() {
    const canSelectBranch = this.permissionsService.canSelectBranch();
    let targetBranch = this.store.currentBranch();

    if (!canSelectBranch) {
      if (!targetBranch) {
        this.message.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No tienes una sucursal asignada',
        });
        return;
      }
    } else {
      if (this.filterService.currentBranch()) {
        const branchId = this.filterService.currentBranch();
        targetBranch =
          this.store.branches.entities().find((b) => b.id === branchId) ||
          undefined;
      } else {
        targetBranch = undefined;
      }
    }

    const isStoreManager = this.permissionsService.isStoreManager();
    const ref = this.dialog.open(AddEmployeeToBranchDialogComponent, {
      header: isStoreManager ? 'Transferir empleado a tu tienda' : 'Añadir empleado a sucursal',
      width: '500px',
      data: {
        branchId: targetBranch?.id || null,
        branchName: targetBranch?.name || '',
        canSelectBranch,
        isStoreManager,
      },
      modal: true,
      dismissableMask: true,
    });
    ref?.onClose?.subscribe((added) => {
      if (added) {
        this.store.employees.reloadItems();
        this.schedulesResource.reload();
      }
    });
  }

  // ========== Audit History ==========

  public openAuditHistoryDialog() {
    this.loadAuditHistory();
    this.showAuditHistoryDialog.set(true);
  }

  public onLockedShiftClick(): void {
    this.message.add({
      severity: 'warn',
      summary: 'Turno bloqueado',
      detail: 'Este turno está bloqueado. Para solicitar un cambio, usa el botón "Solicitar cambio de horario".',
      life: 5000,
    });
  }

  public openFloatingToggleDialog(employee: any): void {
    if (!this.permissionsService.canApproveSchedules() && !this.store.isAdmin()) {
      this.message.add({
        severity: 'info',
        summary: 'Solo administradores',
        detail: 'Solo administradores o aprobadores pueden cambiar la asignación de sucursal.',
        life: 4000,
      });
      return;
    }
    // Cargar el empleado completo desde el store (no solo el snapshot de la grilla)
    const full = this.store.employees.entities().find((e: any) => e.id === employee.id) ?? employee;
    this.floatingDialogEmployee.set(full);
    this.floatingDialogBranchId.set(full.branch_id ?? undefined);
    // Default: si no tiene rotation_branch_ids pero sí branch_id, prefiltrar con su sucursal hogar
    const stored: string[] = (full as any).rotation_branch_ids ?? [];
    const defaulted = stored.length === 0 && full.branch_id ? [full.branch_id] : stored;
    this.floatingDialogRotationBranches.set(defaulted);
    // Fuente de verdad: groomer_employee_config (compartida con salon-schedule)
    this.floatingDialogIsFloating.set(this.rotatingMap().get(full.id) ?? false);
    this.floatingDialogVisible.set(true);
  }

  public async saveFloatingDialog(): Promise<void> {
    const emp = this.floatingDialogEmployee();
    if (!emp) return;
    const isRotating = this.floatingDialogIsFloating();
    const wasRotating = this.rotatingMap().get(emp.id) ?? false;
    const rotationBranches = isRotating ? this.floatingDialogRotationBranches() : [];

    // Derivar branch_id final:
    // - No rotativo: usar el select de sucursal (obligatorio).
    // - Rotativo: usar la primera de la lista (si hay), o null.
    const branchId = isRotating
      ? (rotationBranches.length > 0 ? rotationBranches[0] : null)
      : (this.floatingDialogBranchId() ?? null);

    // Validación: no rotativo requiere sucursal
    if (!isRotating && !branchId) {
      this.message.add({
        severity: 'warn',
        summary: 'Falta sucursal',
        detail: 'Asignale una sucursal o activá rotativo (que permite quedar sin sucursal).',
        life: 5000,
      });
      return;
    }

    const currentRotation: string[] = (emp as any).rotation_branch_ids ?? [];
    const rotationChanged = !arraysEqualSet(currentRotation, rotationBranches);
    const branchChanged = (branchId ?? null) !== (emp.branch_id ?? null);
    const rotatingChanged = isRotating !== wasRotating;

    if (!branchChanged && !rotatingChanged && !rotationChanged) {
      this.floatingDialogVisible.set(false);
      return;
    }

    try {
      // 1) PATCH employees: branch_id y/o rotation_branch_ids
      if (branchChanged || rotationChanged) {
        const payload: any = {};
        if (branchChanged) payload.branch_id = branchId;
        if (rotationChanged) payload.rotation_branch_ids = rotationBranches;
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/employees', { id: `eq.${emp.id}` }),
            payload,
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      }

      // 1b) Si cambió la sucursal de un NO-rotativo, ofrecer reasignar turnos futuros
      if (branchChanged && !isRotating && branchId) {
        await this.maybeReassignFutureShifts(emp.id, branchId);
      }
      // 2) Toggle rotativo → UPSERT groomer_employee_config (misma fuente que salon-schedule)
      if (rotatingChanged) {
        const companyId = this.organizationService.getCurrentCompanyId();
        if (!companyId) throw new Error('Sin company_id');
        const current = this.groomerConfigs().find((c) => c.employee_id === emp.id);
        const payload = {
          company_id: companyId,
          employee_id: emp.id,
          is_rotating: isRotating,
          zone: current?.zone ?? null,
        };
        const url = this.apiUrl.build('rest/v1/groomer_employee_config', {
          on_conflict: 'company_id,employee_id',
        });
        const updated = await firstValueFrom(
          this.http.post<GroomerEmployeeConfig[]>(url, payload, {
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          })
        );
        const row = Array.isArray(updated) ? updated[0] : (updated as any);
        const existing = this.groomerConfigs();
        const idx = existing.findIndex((c) => c.employee_id === emp.id);
        if (idx >= 0) {
          this.groomerConfigs.set([...existing.slice(0, idx), row, ...existing.slice(idx + 1)]);
        } else {
          this.groomerConfigs.set([...existing, row]);
        }
      }

      this.message.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Asignación actualizada (sincronizada con Horario Peluquería).',
        life: 3000,
      });
      this.floatingDialogVisible.set(false);
      this.floatingDialogEmployee.set(null);
      if (branchChanged) this.store.employees.reloadItems();
    } catch (e) {
      console.error('Error guardando asignación', e);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar. Intenta de nuevo.',
        life: 4000,
      });
    }
  }

  /** Cuando un no-rotativo cambia de sucursal, ofrecer reasignar sus turnos futuros. */
  private async maybeReassignFutureShifts(employeeId: string, newBranchId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    // Contar turnos futuros que NO están ya en la sucursal nueva
    const countUrl = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      end_date: `gte.${today}`,
      branch_id: `neq.${newBranchId}`,
      select: 'id',
    });
    let count = 0;
    try {
      const rows = await firstValueFrom(
        this.http.get<Array<{ id: string }>>(countUrl, {
          headers: { Prefer: 'count=exact' },
          observe: 'response' as any,
        } as any)
      ) as any;
      count = Array.isArray(rows?.body) ? rows.body.length : 0;
    } catch (e) {
      console.warn('Error contando turnos futuros', e);
      return;
    }
    if (count === 0) return;

    this.confirm.confirm({
      header: 'Reasignar turnos futuros',
      message: `Este empleado tiene ${count} turno(s) futuros en otra sucursal. ¿Reasignar también esos turnos a la nueva sucursal?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, reasignar',
      rejectLabel: 'No, dejarlos',
      accept: async () => {
        try {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/employee_schedules', {
                employee_id: `eq.${employeeId}`,
                end_date: `gte.${today}`,
                branch_id: `neq.${newBranchId}`,
              }),
              { branch_id: newBranchId, migrated_at: new Date().toISOString() },
              { headers: { Prefer: 'return=minimal' } }
            )
          );
          this.message.add({
            severity: 'success',
            summary: 'Turnos reasignados',
            detail: `${count} turno(s) movidos a la nueva sucursal.`,
            life: 3500,
          });
          this.schedulesResource.reload();
        } catch (e) {
          console.error('Error reasignando turnos', e);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron reasignar los turnos.',
            life: 4000,
          });
        }
      },
    });
  }

  private loadGroomerConfigs(): void {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;
    const url = this.apiUrl.build('rest/v1/groomer_employee_config', {
      company_id: `eq.${companyId}`,
      select: '*',
    });
    this.http.get<GroomerEmployeeConfig[]>(url).subscribe({
      next: (configs) => this.groomerConfigs.set(configs ?? []),
      error: (e) => console.error('[Timetable] Error cargando groomer_employee_config:', e),
    });
  }

  public onViewSpecificAudit(event: { employeeId: string; date: Date }) {
    this.selectedAuditEmployeeId.set(event.employeeId);
    this.selectedAuditDate.set(event.date);
    this.loadSpecificAuditHistory(event.employeeId, event.date);
    this.showSpecificAuditDialog.set(true);
  }

  public getEmployeeName(employeeId: string): string {
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === employeeId);
    return employee
      ? `${employee.first_name} ${employee.father_name}`
      : 'Empleado desconocido';
  }

  private async loadAuditHistory() {
    this.isLoadingAuditHistory.set(true);
    this.auditPage = 1;
    this.hasMoreAuditHistory.set(true);
    try {
      const history = await firstValueFrom(
        this.auditService.getAllAuditHistory({ page: 1, pageSize: this.AUDIT_PAGE_SIZE })
      );
      const sorted = (history || []).slice().sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
      this.allAuditHistory.set(sorted);
      if (!history || history.length < this.AUDIT_PAGE_SIZE) {
        this.hasMoreAuditHistory.set(false);
      }
    } catch (error) {
      console.error('Error cargando historial de auditoría:', error);
      this.allAuditHistory.set([]);
    } finally {
      this.isLoadingAuditHistory.set(false);
    }
  }

  public async loadMoreAuditHistory() {
    if (this.isLoadingMoreAudit() || !this.hasMoreAuditHistory()) return;
    this.isLoadingMoreAudit.set(true);
    this.auditPage++;
    try {
      const more = await firstValueFrom(
        this.auditService.getAllAuditHistory({ page: this.auditPage, pageSize: this.AUDIT_PAGE_SIZE })
      );
      if (!more || more.length < this.AUDIT_PAGE_SIZE) {
        this.hasMoreAuditHistory.set(false);
      }
      if (more?.length) {
        this.allAuditHistory.update(prev => {
          const merged = [...prev, ...more];
          merged.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
          return merged;
        });
      }
    } catch (error) {
      console.error('Error cargando más auditoría:', error);
      this.auditPage--;
    } finally {
      this.isLoadingMoreAudit.set(false);
    }
  }

  private async loadSpecificAuditHistory(employeeId: string, date: Date) {
    this.isLoadingSpecificAudit.set(true);
    try {
      const history = await firstValueFrom(
        this.auditService.getAuditHistoryByEmployeeAndDate(employeeId, date)
      );
      this.specificAuditHistory.set(history || []);
    } catch (error) {
      console.error('Error cargando auditoría específica:', error);
      this.specificAuditHistory.set([]);
    } finally {
      this.isLoadingSpecificAudit.set(false);
    }
  }
}
