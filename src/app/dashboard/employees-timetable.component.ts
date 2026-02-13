import { DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  subDays,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Calendar } from 'primeng/calendar';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitch, ToggleSwitchChangeEvent } from 'primeng/toggleswitch';
import { catchError, EMPTY, firstValueFrom, forkJoin } from 'rxjs';
import { v4 } from 'uuid';
import { colorVariants, EmployeeSchedule } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import {
  ScheduleAuditLog,
  ScheduleAuditService,
} from '../services/schedule-audit.service';
import { DashboardStore } from '../stores/dashboard.store';
import { getEnvString } from '../utils/env.utils';
import { AddEmployeeToBranchDialogComponent } from './add-employee-to-branch-dialog.component';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';
import { MonthWeekSelectorComponent } from './employees-timetable/components/month-week-selector/month-week-selector.component';
import { TimetableFiltersComponent } from './employees-timetable/components/timetable-filters/timetable-filters.component';
import { TimetableGridComponent } from './employees-timetable/components/timetable-grid/timetable-grid.component';
import { TimetableHeaderComponent } from './employees-timetable/components/timetable-header/timetable-header.component';
import {
  branchDayKey,
  conflictKey,
  getPeluqueroAfterAsistenteWarning,
  getScheduleWarningForManager,
  isAsistentePeluqueriaPosition,
  isManagerPosition,
  isPeluqueroPosition,
  parseEntryTimeToMinutes,
  SCHEDULE_ID_DIA_LIBRE,
} from './services/schedule-manager-rules';
import { TimetableFilterService } from './services/timetable-filter.service';
import { TimetableNavigationService } from './services/timetable-navigation.service';
import { TimetablePermissionsService } from './services/timetable-permissions.service';
import {
  generateWeekDays,
  getCurrentWeekOfMonth,
  getMonthOptions,
  getWeeksInMonth,
} from './utils/timetable-date.utils';

@Component({
  selector: 'pt-employees-timetable',
  // NOTA: Proveer estos servicios aquí para que compartan el mismo injector donde existe DashboardStore
  // (DashboardStore se provee en el layout/dashboard, no en root).
  providers: [
    DialogService,
    DynamicDialogRef,
    TimetablePermissionsService,
    TimetableFilterService,
  ],
  imports: [
    Card,
    FormsModule,
    TableModule,
    Button,
    NgClass,
    DatePipe,
    ToggleSwitch,
    Dialog,
    InputText,
    SelectModule,
    Calendar,
    DropdownModule,
    TimetableFiltersComponent,
    TimetableHeaderComponent,
    TimetableGridComponent,
    MonthWeekSelectorComponent,
  ],
  template: `<p-card>
      <ng-template #title> Turnos </ng-template>
      <ng-template #subtitle
        >Vista semanal de turnos y horarios de empleados</ng-template
      >

      <div class="items-center gap-2 w-full my-2 hidden">
        <p-toggleswitch
          inputId="active"
          [(ngModel)]="editionLocked"
          (onChange)="unlockEdition($event)"
        />
        <label for="active"
          ><i [ngClass]="editionLocked() ? 'pi pi-lock' : 'pi pi-unlock'"></i>
          Modificacion bloqueada</label
        >
      </div>

      <!-- Filtros y controles de navegación -->
      <div class="mb-4">
        <pt-timetable-filters
          [branches]="store.branches.entities()"
          [positions]="store.positions.entities()"
          [disableBranch]="disableBranch()"
          [employeeSearch]="filterService.employeeSearch"
          [currentBranch]="filterService.currentBranch"
          [currentPosition]="filterService.currentPosition"
        >
          <div
            class="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2 w-full xl:w-auto"
          >
            <pt-timetable-header
              [currentWeekLabel]="currentWeek()"
              [menuItems]="menuItems"
            />
            <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              @if(permissionsService.canApproveSchedules()) { @if
              (!bulkSelectionMode()) {
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
              <div
                class="flex items-center gap-2 bg-neutral-700/50 rounded-lg px-2 py-1"
              >
                <span class="text-xs text-cyan-400 font-medium">
                  <i class="pi pi-check-square mr-1"></i
                  >{{ selectedShiftsCount() }} seleccionados
                </span>
                @if (selectedShiftsCount() > 0) {
                <p-button
                  [label]="'Aprobar (' + selectedShiftsCount() + ')'"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  (onClick)="onBulkApprove()"
                />
                }
                <p-button
                  label="Cancelar"
                  icon="pi pi-times"
                  severity="secondary"
                  [outlined]="true"
                  size="small"
                  (onClick)="cancelBulkSelection()"
                />
              </div>
              } } @if(permissionsService.canAddEmployees()) {
              <p-button
                label="¿No aparece un empleado?"
                icon="pi pi-user-plus"
                severity="help"
                outlined
                rounded
                size="small"
                (onClick)="openAddEmployeeDialog()"
              />
              }
              @if (!permissionsService.isStoreManager()) {
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
              }
            </div>
          </div>
        </pt-timetable-filters>
      </div>

      <!-- Debug: Datos enviados al timetable-grid -->
      @if (false) {
      <div
        class="debug-info p-4 bg-yellow-100 border border-yellow-300 rounded mb-4"
      >
        <h3 class="font-bold">Debug TimetableGrid Inputs:</h3>
        <p>Employees: {{ employeeSchedulesList().length }}</p>
        <p>Days: {{ days().length }}</p>
        <p>Can Manage: {{ store.canManageSchedules() }}</p>
        <p>Can Approve: {{ permissionsService.canApproveSchedules() }}</p>
      </div>
      }
      <pt-timetable-grid
        [employees]="employeeSchedulesList()"
        [days]="days()"
        [canManageSchedules]="store.canManageSchedules()"
        [canApproveSchedules]="permissionsService.canApproveSchedules()"
        [selectionMode]="bulkSelectionMode()"
        [selectedKeys]="selectedSelectionKeys()"
        [isStoreManager]="permissionsService.isStoreManager()"
        [disablePagination]="!!filterService.currentBranch()"
        (editShift)="editSchedule($event)"
        (deleteShift)="deleteSchedule($event.shift, $event.date)"
        (approveShift)="approveSchedule($event)"
        (confirmWeek)="confirmEmployeeWeek($event)"
        (addShift)="editSchedule($event)"
        (viewAudit)="onViewSpecificAudit($event)"
        (toggleSelection)="toggleShiftSelection($event)"
      />
    </p-card>
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

    <!-- Dialog de Historial de Auditoría de Turnos -->
    <p-dialog
      [visible]="showAuditHistoryDialog()"
      (visibleChange)="showAuditHistoryDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1200px' }"
      [header]="'Historial de Auditoría - Turnos'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [closable]="true"
      (onHide)="showAuditHistoryDialog.set(false)"
    >
      <div class="space-y-4 pt-4">
        <!-- Filtros Avanzados -->
        <div
          class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm"
        >
          <div
            class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
            (click)="showAuditFilters.set(!showAuditFilters())"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-filter text-cyan-400 text-sm"></i>
              <h3 class="text-sm font-semibold text-white m-0">
                Filtros Avanzados
              </h3>
              @if (hasActiveAuditFilters()) {
              <span
                class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold"
              >
                {{ getActiveAuditFiltersCount() }} activos
              </span>
              }
            </div>
            <i
              class="pi text-sm"
              [class.pi-chevron-down]="!showAuditFilters()"
              [class.pi-chevron-up]="showAuditFilters()"
              [class.text-gray-400]="!showAuditFilters()"
              [class.text-cyan-400]="showAuditFilters()"
            ></i>
          </div>

          @if (showAuditFilters()) {
          <div class="p-3 space-y-2 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-user mr-1 text-cyan-400 text-xs"></i>Empleado
                </label>
                <p-select
                  [options]="store.employees.employeesList()"
                  optionLabel="short_name"
                  optionValue="id"
                  [(ngModel)]="selectedEmployeeFilter"
                  placeholder="Todos"
                  [showClear]="true"
                  filter
                  appendTo="body"
                  class="w-full text-sm"
                  [style]="{ height: '32px' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango
                  de Fechas
                </label>
                <p-calendar
                  [(ngModel)]="selectedDateRange"
                  selectionMode="range"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Seleccionar"
                  [showClear]="true"
                  class="w-full text-sm"
                  [inputStyle]="{ height: '32px', padding: '0.375rem' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Tipo de
                  Acción
                </label>
                <p-dropdown
                  [options]="auditActionOptions"
                  optionLabel="label"
                  optionValue="value"
                  [(ngModel)]="selectedActionFilter"
                  placeholder="Todas"
                  [showClear]="true"
                  class="w-full text-sm"
                  [style]="{ height: '32px' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i
                  >Búsqueda
                </label>
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar..."
                  [(ngModel)]="auditSearchText"
                  class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
                />
              </div>
            </div>

            <div
              class="flex items-center justify-between pt-2 border-t border-neutral-700/50"
            >
              <p-button
                label="Limpiar Todo"
                icon="pi pi-filter-slash"
                [outlined]="true"
                severity="secondary"
                (onClick)="clearAuditFilters()"
                [disabled]="!hasActiveAuditFilters()"
                size="small"
              />
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <i class="pi pi-info-circle"></i>
                <span
                  >{{ auditHistoryComputed().length }} de
                  {{ allAuditHistory().length }} resultados</span
                >
              </div>
            </div>
          </div>
          }
        </div>

        <!-- Lista de Historial -->
        @if (isLoadingAuditHistory()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (auditHistoryComputed().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría disponibles</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of auditHistoryComputed(); track log.id) {
          <div
            class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-700/50"
              >
                <i
                  [class]="
                    'pi ' +
                    getAuditActionIcon(log.action) +
                    ' text-lg ' +
                    getAuditActionColor(log.action)
                  "
                ></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-white font-semibold">
                      {{
                        log.changed_by_employee
                          ? log.changed_by_employee.first_name +
                            ' ' +
                            log.changed_by_employee.father_name
                          : 'Usuario desconocido'
                      }}
                    </div>
                    <div class="text-sm text-gray-400">
                      {{ getAuditActionLabel(log.action) }}
                      @if (log.employee_schedule?.employee) {
                      <span class="text-gray-500">
                        - {{ log.employee_schedule?.employee?.first_name }}
                        {{ log.employee_schedule?.employee?.father_name }}
                      </span>
                      }
                    </div>
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                @if (log.comment) {
                <div
                  class="text-sm text-gray-300 mt-2 p-2 bg-neutral-900/50 rounded border-l-2 border-cyan-400"
                >
                  {{ log.comment }}
                </div>
                } @if (log.old_status !== null && log.new_status !== null &&
                log.old_status !== log.new_status) {
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <span class="text-gray-400">Estado:</span>
                  <span
                    class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400"
                    >{{ log.old_status ? 'Aprobado' : 'Pendiente' }}</span
                  >
                  <i class="pi pi-arrow-right text-gray-500"></i>
                  <span
                    class="px-2 py-1 rounded bg-green-500/20 text-green-400"
                    >{{ log.new_status ? 'Aprobado' : 'Pendiente' }}</span
                  >
                </div>
                }
                <div class="text-xs text-gray-500 mt-2">
                  ID del horario:
                  <span class="font-mono text-gray-400">
                    {{
                      log.employee_schedule_id
                        ? log.employee_schedule_id.substring(0, 8) + '...'
                        : '—'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </p-dialog>

    <!-- Dialog de Historial de Auditoría Específica -->
    <p-dialog
      [visible]="showSpecificAuditDialog()"
      (visibleChange)="showSpecificAuditDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="getSpecificAuditDialogHeader()"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [closable]="true"
      (onHide)="showSpecificAuditDialog.set(false)"
    >
      <div class="space-y-4 pt-4">
        @if (isLoadingSpecificAudit()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (specificAuditHistory().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría para este día</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of specificAuditHistory(); track log.id) {
          <div
            class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-700/50"
              >
                <i
                  [class]="
                    'pi ' +
                    getAuditActionIcon(log.action) +
                    ' text-lg ' +
                    getAuditActionColor(log.action)
                  "
                ></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-white font-semibold">
                      {{
                        log.changed_by_employee
                          ? log.changed_by_employee.first_name +
                            ' ' +
                            log.changed_by_employee.father_name
                          : 'Usuario desconocido'
                      }}
                    </div>
                    <div class="text-sm text-gray-400">
                      {{ getAuditActionLabel(log.action) }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                @if (log.comment) {
                <div
                  class="text-sm text-gray-300 mt-2 p-2 bg-neutral-900/50 rounded border-l-2 border-cyan-400"
                >
                  {{ log.comment }}
                </div>
                } @if (log.old_status !== null && log.new_status !== null &&
                log.old_status !== log.new_status) {
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <span class="text-gray-400">Estado:</span>
                  <span
                    class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400"
                    >{{ log.old_status ? 'Aprobado' : 'Pendiente' }}</span
                  >
                  <i class="pi pi-arrow-right text-gray-500"></i>
                  <span
                    class="px-2 py-1 rounded bg-green-500/20 text-green-400"
                    >{{ log.new_status ? 'Aprobado' : 'Pendiente' }}</span
                  >
                </div>
                }
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </p-dialog> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesTimetableComponent implements OnInit {
  public store = inject(DashboardStore);
  public editionLocked = model<boolean>();
  public unlockModal = signal(false);
  public monthWeekSelectorVisible = signal(false);
  public selectedMonth = signal<Date>(new Date());
  public selectedMonthOption = signal<{ label: string; value: Date }>({
    label: '',
    value: new Date(),
  });
  public selectedWeek = signal<number>(1);
  public disableBranch = signal(true);
  public showAuditHistoryDialog = signal(false);

  // Historial de auditoría general
  public isLoadingAuditHistory = signal(false);
  public allAuditHistory = signal<ScheduleAuditLog[]>([]);

  // Filtros de auditoría
  public showAuditFilters = signal(false);
  public selectedEmployeeFilter = signal<string | null>(null);
  public selectedDateRange = signal<Date[] | null>(null);
  public selectedActionFilter = signal<string | null>(null);
  public auditSearchText = signal<string>('');

  // Bulk selection mode - managed from parent, passed to grid
  public bulkSelectionMode = signal<boolean>(false);
  public selectedSelectionKeys = signal<Set<string>>(new Set());
  public selectedShiftsCount = computed(
    () => this.selectedSelectionKeys().size
  );
  public totalPendingCount = computed(() => {
    let count = 0;
    const employees = this.employeeSchedulesList();
    for (const emp of employees) {
      for (const day of emp.days) {
        // day.shift exists and is not approved
        if (day.shift && !day.shift.approved) {
          count++;
        }
      }
    }
    return count;
  });

  // Dialog de auditoría específica
  public showSpecificAuditDialog = signal(false);
  public selectedAuditEmployeeId = signal<string | null>(null);
  public selectedAuditDate = signal<Date | null>(null);
  public specificAuditHistory = signal<ScheduleAuditLog[]>([]);
  public isLoadingSpecificAudit = signal(false);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private confirm = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private dialogService = inject(DialogService);
  public permissionsService = inject(TimetablePermissionsService);
  public filterService = inject(TimetableFilterService);
  public navigationService = inject(TimetableNavigationService);
  public injector = inject(Injector);
  private auditService = inject(ScheduleAuditService);

  private auditReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAuditHistoryQueryKey: string | null = null;

  public isHRDepartment = this.permissionsService.isHRDepartment;

  // Exponer signals y computed del servicio de navegación
  public currentDate = this.navigationService.currentDate;
  public start = this.navigationService.start;
  public end = this.navigationService.end;
  public currentWeek = this.navigationService.currentWeek;

  public colorVariants = colorVariants;

  days = computed(() => generateWeekDays(this.start()));

  weekOptions = computed(() => {
    const weeks = this.getWeeksInMonth(this.selectedMonth());
    return weeks.map((w) => ({ label: 'Semana ' + w, value: w }));
  });

  unlockEdition(event: ToggleSwitchChangeEvent) {
    if (!event.checked) {
      this.unlockModal.set(true);
    }
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
      label: 'Seleccionar mes y semana',
      icon: 'pi pi-calendar-plus',
      command: () => this.openMonthWeekSelector(),
    },
  ];

  // Usar filtros del servicio (exponer para uso en template)
  public get currentBranch() {
    return this.filterService.currentBranch;
  }
  public get currentPosition() {
    return this.filterService.currentPosition;
  }
  public get employeeSearch() {
    return this.filterService.employeeSearch;
  }
  private dialog = inject(DialogService);
  private message = inject(MessageService);

  // Computed que agrega los días a los empleados filtrados
  public currentEmployees = computed(() => {
    return this.filterService.filteredEmployees().map((employee) => ({
      ...employee,
      days: this.days(),
    }));
  });

  public schedulesResource = httpResource<EmployeeSchedule[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(this.start(), 'yyyy-MM-dd');
    const endDate = format(this.end(), 'yyyy-MM-dd');

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select:
        'id,employee_id,schedule_id,branch_id,start_date,end_date,approved,schedule:schedules(id,name,color,day_off,entry_time),branch:branches(id,name,short_name),employee:employees(id,company_id)',
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
      ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
    });

    return {
      url,
      method: 'GET',
    };
  });

  public shifts = computed(() =>
    this.schedulesResource
      .value()
      ?.filter((schedule) =>
        this.currentEmployees().some(
          (employee) => employee.id === schedule.employee_id
        )
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

  private shiftIntervalsByEmployeeId = computed(() => {
    const schedules = this.schedulesResource.value() ?? [];
    const allowedEmployees = new Set(this.currentEmployees().map((e) => e.id));

    const map = new Map<
      string,
      Array<{ start: Date; end: Date; shift: any }>
    >();

    for (const s of schedules) {
      if (!allowedEmployees.has(s.employee_id)) continue;

      const shift = {
        id: s.id,
        employee_id: s.employee_id,
        branch_id: s.branch_id,
        start_date: s.start_date,
        end_date: s.end_date,
        schedule_id: s.schedule_id,
        schedule: (s as any).schedule,
        branch: (s as any).branch,
        approved: (s as any).approved,
      };

      const start = startOfDay(
        toDate(shift.start_date, { timeZone: 'America/Panama' })
      );
      const end = endOfDay(
        toDate(shift.end_date, { timeZone: 'America/Panama' })
      );

      const list = map.get(shift.employee_id) ?? [];
      list.push({ start, end, shift });
      // Mantener ordenado por fecha de inicio para búsqueda binaria
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
      map.set(shift.employee_id, list);
    }

    return map;
  });

  /**
   * Búsqueda binaria para encontrar el intervalo que contiene una fecha específica
   * Los intervalos están ordenados por fecha de inicio
   */
  private findIntervalForDate(
    intervals: Array<{ start: Date; end: Date; shift: any }>,
    date: Date
  ): { start: Date; end: Date; shift: any } | null {
    let left = 0;
    let right = intervals.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const interval = intervals[mid];

      if (date >= interval.start && date <= interval.end) {
        return interval;
      }

      if (date < interval.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }

  public employeeSchedulesList = computed(() => {
    const employees = this.currentEmployees();
    const intervalsMap = this.shiftIntervalsByEmployeeId();
    const conflictKeys = this.managerConflictKeys();
    return employees.map((employee) => ({
      id: employee.id,
      first_name: employee.first_name,
      father_name: employee.father_name,
      position_id: employee.position_id,
      position: employee.position
        ? { id: (employee.position as any).id, name: employee.position.name }
        : { id: '', name: '' },
      days: employee.days.map((day) => {
        const shift =
          this.findIntervalForDate(
            intervalsMap.get(employee.id) ?? [],
            day.date
          )?.shift ?? null;
        const scheduleWarning = this.getCellScheduleWarning(
          employee.position_id,
          day.date,
          shift,
          conflictKeys
        );
        return { ...day, shift, scheduleWarning };
      }),
    }));
  });

  /** Claves (date|branch_id|schedule_id) donde hay 2+ Gerentes/Subgerentes en el mismo turno/sucursal/día. */
  private managerConflictKeys = computed(() => {
    const employees = this.currentEmployees();
    const intervalsMap = this.shiftIntervalsByEmployeeId();
    const countByKey = new Map<string, number>();
    for (const emp of employees) {
      if (!isManagerPosition(emp.position_id)) continue;
      const intervals = intervalsMap.get(emp.id) ?? [];
      for (const { start, end, shift } of intervals) {
        const days = eachDayOfInterval({ start, end });
        for (const d of days) {
          const key = conflictKey(d, shift?.branch_id, shift?.schedule_id);
          countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
        }
      }
    }
    const conflictSet = new Set<string>();
    countByKey.forEach((count, key) => {
      if (count >= 2) conflictSet.add(key);
    });
    return conflictSet;
  });

  /** Claves (date|branch_id|schedule_id) donde hay 2+ Peluqueros en el mismo turno/sucursal/día. Usa todos los employee_schedules de la semana para no depender de la lista filtrada. */
  private peluqueroConflictKeys = computed(() => {
    const schedules = this.schedulesResource.value() ?? [];
    const employees = this.store.employees.entities();
    const countByKey = new Map<string, number>();
    for (const s of schedules) {
      const emp = employees.find((e: any) => e.id === s.employee_id);
      if (!isPeluqueroPosition(emp?.position_id)) continue;
      const start = startOfDay(toDate(s.start_date, { timeZone: 'America/Panama' }));
      const end = endOfDay(toDate(s.end_date, { timeZone: 'America/Panama' }));
      const days = eachDayOfInterval({ start, end });
      for (const d of days) {
        const key = conflictKey(d, s.branch_id, s.schedule_id);
        countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      }
    }
    const conflictSet = new Set<string>();
    countByKey.forEach((count, key) => {
      if (count >= 2) conflictSet.add(key);
    });
    return conflictSet;
  });

  /** Por (date|branch_id), mínimo entry_time en minutos entre Asistentes de peluquería ese día en esa sucursal. Usa todos los employee_schedules de la semana y posición del store para no depender de la lista filtrada. */
  private asistenteMinEntryMinutesByKey = computed(() => {
    const schedules = this.schedulesResource.value() ?? [];
    const employees = this.store.employees.entities();
    const map = new Map<string, number>();
    for (const s of schedules) {
      const emp = employees.find((e: any) => e.id === s.employee_id);
      if (!isAsistentePeluqueriaPosition(emp?.position_id)) continue;
      const shift = {
        start_date: s.start_date,
        end_date: s.end_date,
        branch_id: s.branch_id,
        schedule: (s as any).schedule,
      };
      const start = startOfDay(toDate(shift.start_date, { timeZone: 'America/Panama' }));
      const end = endOfDay(toDate(shift.end_date, { timeZone: 'America/Panama' }));
      const days = eachDayOfInterval({ start, end });
      const entryMin = parseEntryTimeToMinutes(shift.schedule?.entry_time);
      if (entryMin == null) continue;
      for (const d of days) {
        const key = branchDayKey(d, shift.branch_id);
        const current = map.get(key);
        if (current == null || entryMin < current) map.set(key, entryMin);
      }
    }
    return map;
  });

  private getCellScheduleWarning(
    positionId: string | undefined,
    date: Date,
    shift: any,
    conflictKeys: Set<string>
  ): string | null {
    const msgs: string[] = [];

    // Reglas Gerente / Subgerente
    if (isManagerPosition(positionId) && shift) {
      const scheduleWarn = getScheduleWarningForManager(shift.schedule_id, date, positionId, shift?.schedule?.day_off);
      if (scheduleWarn) msgs.push(scheduleWarn);
      const key = conflictKey(date, shift.branch_id, shift.schedule_id);
      if (conflictKeys.has(key)) {
        const isDayOff = shift?.schedule_id === SCHEDULE_ID_DIA_LIBRE || shift?.schedule?.day_off === true;
        msgs.push(isDayOff
          ? 'Gerente y Subgerente no deberían tener el mismo día libre en la misma sucursal.'
          : 'Gerente y Subgerente no deberían estar en el mismo turno en la misma sucursal.');
      }
    }

    // Reglas Peluquero: no 2 peluqueros mismo horario; peluquero debe entrar después del asistente
    if (isPeluqueroPosition(positionId) && shift) {
      const peluqueroKeys = this.peluqueroConflictKeys();
      const key = conflictKey(date, shift.branch_id, shift.schedule_id);
      if (peluqueroKeys.has(key)) {
        msgs.push('No deben haber 2 peluqueros con el mismo horario en la misma sucursal.');
      }
      const dayOff = shift?.schedule_id === SCHEDULE_ID_DIA_LIBRE || shift?.schedule?.day_off === true;
      if (!dayOff && shift?.branch_id) {
        const peluqueroEntry = parseEntryTimeToMinutes(shift?.schedule?.entry_time);
        const bdKey = branchDayKey(date, shift.branch_id);
        const asistenteMin = this.asistenteMinEntryMinutesByKey().get(bdKey) ?? null;
        const afterWarn = getPeluqueroAfterAsistenteWarning(peluqueroEntry, asistenteMin);
        if (afterWarn) msgs.push(afterWarn);
      }
    }

    return msgs.length ? msgs.join(' ') : null;
  }

  ngOnInit(): void {
    this.editionLocked.set(true);

    // Cargar las posiciones para el filtro
    this.store.positions.fetchItems();

    effect(
      () => {
        this.disableBranch.set(
          this.permissionsService.shouldDisableBranchSelector()
        );
        const filterBranchId = this.permissionsService.getFilterBranchId();

        if (filterBranchId !== null) {
          // Si hay una sucursal específica para filtrar, establecerla
          this.filterService.currentBranch.set(filterBranchId);
        }
        // Si filterBranchId es null (admin), permitir selección libre
      },
      { injector: this.injector }
    );

    effect(
      () => {
        if (!this.showAuditHistoryDialog()) return;
        // Solo filtros que sí se pueden enviar al server (evitar reload por cada tecla en search)
        this.selectedEmployeeFilter();
        this.selectedDateRange();
        this.selectedActionFilter();
        this.queueAuditHistoryReload();
      },
      { injector: this.injector }
    );
  }

  public nextWeek() {
    this.navigationService.nextWeek();
  }

  public previousWeek() {
    this.navigationService.previousWeek();
  }

  public goToday() {
    this.navigationService.goToToday();
  }

  public openMonthWeekSelector() {
    const today = new Date();
    const monthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedMonth.set(monthDate);
    const options = this.getMonthOptions();
    const currentOption =
      options.find(
        (opt) =>
          opt.value.getFullYear() === monthDate.getFullYear() &&
          opt.value.getMonth() === monthDate.getMonth()
      ) || options[options.length - 1];
    this.selectedMonthOption.set(currentOption);
    this.selectedWeek.set(this.getCurrentWeekOfMonth(today));
    this.monthWeekSelectorVisible.set(true);
  }

  public getWeeksInMonth = getWeeksInMonth;

  public getCurrentWeekOfMonth = getCurrentWeekOfMonth;

  public onMonthChange(option: { label: string; value: Date }) {
    if (option && option.value) {
      this.selectedMonthOption.set(option);
      this.selectedMonth.set(option.value);
      this.selectedWeek.set(1);
    }
  }

  public goToSelectedWeek() {
    const month = this.selectedMonth();
    const weekNumber = this.selectedWeek();
    this.navigationService.goToSelectedWeek(month, weekNumber);
    this.monthWeekSelectorVisible.set(false);
  }

  public getMonthOptions = getMonthOptions;

  public editSchedule({
    employee_id,
    employee_schedule,
    date,
  }: {
    employee_id?: string;
    employee_schedule?: EmployeeSchedule;
    date?: Date;
  } = {}): void {
    // Verificar permisos antes de abrir el diálogo
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para editar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden editar horarios.',
      });
      return;
    }

    // Gerentes de tienda no pueden editar horarios aprobados
    if (this.permissionsService.isStoreManager() && employee_schedule?.approved) {
      this.message.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail:
          'No puedes editar horarios que ya han sido aprobados. Contacta a un administrador o al departamento de RRHH.',
      });
      return;
    }

    // Verificar si el empleado tiene horarios en la semana actual
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

    this.dialog
      .open(EmployeeSchedulesFormComponent, {
        header: 'Editar horario',
        data: {
          employee_id,
          employee_schedule,
          date,
          branch: this.filterService.currentBranch(),
          weekStart: this.start(),
          weekEnd: this.end(),
          employeeHasSchedulesInWeek,
        },
        modal: true,
        dismissableMask: true,
      })
      .onClose.subscribe(() => {
        this.schedulesResource.reload();
      });
  }

  public isPast = (date: Date) => isBefore(date, new Date());

  deleteSchedule(employee_schedule: EmployeeSchedule, date?: Date) {
    // Verificar permisos antes de eliminar
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para eliminar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden eliminar horarios.',
      });
      return;
    }

    // Gerentes de tienda no pueden eliminar horarios aprobados
    if (this.permissionsService.isStoreManager() && employee_schedule.approved) {
      this.message.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail:
          'No puedes eliminar horarios que ya han sido aprobados. Contacta a un administrador o al departamento de RRHH.',
      });
      return;
    }

    const message = date
      ? '¿Estás seguro de eliminar el horario de este día específico?'
      : '¿Estás seguro de eliminar este horario?';

    this.confirm.confirm({
      header: 'Eliminar horario',
      message,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();

        // Si se pasó una fecha específica y el horario es un rango de múltiples días,
        // dividir el rango y eliminar solo ese día
        if (date && employee_schedule) {
          const startDateObj = toDate(employee_schedule.start_date, {
            timeZone: 'America/Panama',
          });
          const endDateObj = toDate(employee_schedule.end_date, {
            timeZone: 'America/Panama',
          });
          const dateObj = toDate(date, { timeZone: 'America/Panama' });
          const isSingleDay = isSameDay(startDateObj, endDateObj);
          const dateIsInRange =
            dateObj >= startDateObj && dateObj <= endDateObj;

          // Si es un rango de múltiples días y la fecha está en el rango, dividir
          if (!isSingleDay && dateIsInRange) {
            this.deleteSingleDayFromRange(
              employee_schedule,
              dateObj,
              companyId
            );
            return;
          }
        }

        // Si es un solo día o no se pasó fecha específica, eliminar directamente
        const params: any = { id: `eq.${employee_schedule.id}` };

        // Agregar filtro por company_id para seguridad
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }

        // IMPORTANTE: Registrar auditoría ANTES de eliminar el horario
        // para evitar problemas con ON DELETE CASCADE
        const currentEmployeeId = this.store.currentEmployee()?.id;
        if (currentEmployeeId) {
          const schedule = this.store.schedules
            .entities()
            .find((s) => s.id === employee_schedule.schedule_id);
          const employee = this.store.employees
            .entities()
            .find((e) => e.id === employee_schedule.employee_id);
          const branch = this.store.branches
            .entities()
            .find((b) => b.id === employee_schedule.branch_id);

          const startDateFormatted = format(
            toDate(employee_schedule.start_date, {
              timeZone: 'America/Panama',
            }),
            'dd/MM/yyyy'
          );
          const endDateFormatted = format(
            toDate(employee_schedule.end_date, {
              timeZone: 'America/Panama',
            }),
            'dd/MM/yyyy'
          );
          const isSingleDay = isSameDay(
            toDate(employee_schedule.start_date, {
              timeZone: 'America/Panama',
            }),
            toDate(employee_schedule.end_date, {
              timeZone: 'America/Panama',
            })
          );

          // Registrar auditoría ANTES de eliminar
          await this.auditService.logChange({
            employeeScheduleId: employee_schedule.id,
            changedBy: currentEmployeeId,
            action: 'deleted',
            oldStatus: employee_schedule.approved,
            newStatus: false,
            oldValue: {
              employee_id: employee_schedule.employee_id,
              employee_name: employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'Desconocido',
              schedule_id: employee_schedule.schedule_id,
              schedule_name: schedule?.name || 'Desconocido',
              branch_id: employee_schedule.branch_id,
              branch_name: branch?.name || 'Desconocido',
              start_date: employee_schedule.start_date,
              end_date: employee_schedule.end_date,
              start_date_formatted: startDateFormatted,
              end_date_formatted: endDateFormatted,
              is_single_day: isSingleDay,
              approved: employee_schedule.approved,
            },
            newValue: null,
            comment: date
              ? `Día ${format(date, 'dd/MM/yyyy')} eliminado del horario "${schedule?.name || 'Desconocido'
              }" para ${employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'empleado'
              }${branch ? ` en sucursal ${branch.name}` : ''
              } (rango original: ${startDateFormatted} - ${endDateFormatted})`
              : `Horario "${schedule?.name || 'Desconocido'
              }" eliminado completamente para ${employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'empleado'
              }${isSingleDay
                ? ` el día ${startDateFormatted}`
                : ` del ${startDateFormatted} al ${endDateFormatted}`
              }${branch ? ` en sucursal ${branch.name}` : ''}`,
          });
        }

        // Ahora eliminar el horario
        this.http
          .delete(this.apiUrl.build('rest/v1/employee_schedules'), { params })
          .pipe(
            catchError((error) => {
              console.error(error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al eliminar el horario',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario eliminado correctamente',
              });
              this.schedulesResource.reload();
            },
          });
      },
    });
  }

  private deleteSingleDayFromRange(
    schedule: EmployeeSchedule,
    dateToDelete: Date,
    companyId: string | null
  ): void {
    const startDateObj = toDate(schedule.start_date, {
      timeZone: 'America/Panama',
    });
    const endDateObj = toDate(schedule.end_date, {
      timeZone: 'America/Panama',
    });
    const requests: any[] = [];

    // Caso 1: El día a eliminar es el primer día del rango
    if (isSameDay(startDateObj, dateToDelete)) {
      // Actualizar el turno original para que empiece al día siguiente
      if (addDays(dateToDelete, 1) <= endDateObj) {
        const updateData: any = {
          start_date: format(addDays(dateToDelete, 1), 'yyyy-MM-dd'),
          end_date: format(endDateObj, 'yyyy-MM-dd'),
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          approved: schedule.approved,
        };
        if (companyId) updateData.company_id = companyId;

        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            updateData,
            {
              params: {
                id: `eq.${schedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
          )
        );
      } else {
        // Si solo queda un día, eliminar el horario completo
        const params: any = { id: `eq.${schedule.id}` };
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }
        requests.push(
          this.http.delete(this.apiUrl.build('rest/v1/employee_schedules'), {
            params,
          })
        );
      }
    }
    // Caso 2: El día a eliminar es el último día del rango
    else if (isSameDay(endDateObj, dateToDelete)) {
      // Actualizar el turno original para que termine el día anterior
      if (subDays(dateToDelete, 1) >= startDateObj) {
        const updateData: any = {
          start_date: format(startDateObj, 'yyyy-MM-dd'),
          end_date: format(subDays(dateToDelete, 1), 'yyyy-MM-dd'),
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          approved: schedule.approved,
        };
        if (companyId) updateData.company_id = companyId;

        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            updateData,
            {
              params: {
                id: `eq.${schedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
          )
        );
      } else {
        // Si solo queda un día, eliminar el horario completo
        const params: any = { id: `eq.${schedule.id}` };
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }
        requests.push(
          this.http.delete(this.apiUrl.build('rest/v1/employee_schedules'), {
            params,
          })
        );
      }
    }
    // Caso 3: El día a eliminar está en el medio del rango
    else {
      // Dividir en dos turnos: uno antes y uno después del día a eliminar
      // 1. Actualizar el turno original para que termine el día anterior
      const updateData1: any = {
        start_date: format(startDateObj, 'yyyy-MM-dd'),
        end_date: format(subDays(dateToDelete, 1), 'yyyy-MM-dd'),
        schedule_id: schedule.schedule_id,
        branch_id: schedule.branch_id,
        approved: schedule.approved,
      };
      if (companyId) updateData1.company_id = companyId;

      requests.push(
        this.http.patch(
          this.apiUrl.build('rest/v1/employee_schedules'),
          updateData1,
          {
            params: {
              id: `eq.${schedule.id}`,
              ...(companyId ? { company_id: `eq.${companyId}` } : {}),
            },
          }
        )
      );

      // 2. Crear un nuevo turno para el período después del día a eliminar
      if (addDays(dateToDelete, 1) <= endDateObj) {
        const createData2: any = {
          id: v4(),
          employee_id: schedule.employee_id,
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          start_date: format(addDays(dateToDelete, 1), 'yyyy-MM-dd'),
          end_date: format(endDateObj, 'yyyy-MM-dd'),
          approved: schedule.approved,
        };
        if (companyId) createData2.company_id = companyId;

        requests.push(
          this.http.post(
            this.apiUrl.build('rest/v1/employee_schedules'),
            createData2
          )
        );
      }
    }

    // Ejecutar todas las operaciones en paralelo
    forkJoin(requests)
      .pipe(
        catchError((error) => {
          console.error(error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Ha ocurrido un error al eliminar el horario',
          });
          return EMPTY;
        })
      )
      .subscribe({
        next: async () => {
          // Registrar auditoría cuando se elimina un día específico de un rango
          const currentEmployeeId = this.store.currentEmployee()?.id;
          if (currentEmployeeId) {
            const scheduleType = this.store.schedules
              .entities()
              .find((s) => s.id === schedule.schedule_id);
            const employee = this.store.employees
              .entities()
              .find((e) => e.id === schedule.employee_id);
            const branch = this.store.branches
              .entities()
              .find((b) => b.id === schedule.branch_id);

            const dateStr = format(dateToDelete, 'yyyy-MM-dd');
            const dateFormatted = format(dateToDelete, 'dd/MM/yyyy');
            const dayName = format(dateToDelete, 'EEEE', { locale: es });
            const originalStartFormatted = format(
              toDate(schedule.start_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );
            const originalEndFormatted = format(
              toDate(schedule.end_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );

            // Registrar auditoría para el horario original que se modificó/dividió
            await this.auditService.logChange({
              employeeScheduleId: schedule.id,
              changedBy: currentEmployeeId,
              action: 'split_range', // Acción específica para división por eliminación
              oldStatus: schedule.approved,
              newStatus: schedule.approved, // Mantiene el mismo estado
              oldValue: {
                employee_id: schedule.employee_id,
                employee_name: employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'Desconocido',
                schedule_id: schedule.schedule_id,
                schedule_name: scheduleType?.name || 'Desconocido',
                branch_id: schedule.branch_id,
                branch_name: branch?.name || 'Desconocido',
                start_date: schedule.start_date,
                end_date: schedule.end_date,
                start_date_formatted: originalStartFormatted,
                end_date_formatted: originalEndFormatted,
                approved: schedule.approved,
              },
              newValue: {
                date_removed: dateStr,
                date_removed_formatted: dateFormatted,
                day_name: dayName,
                operation: 'day_deleted_from_range',
                // Información del rango original completo
                original_range: {
                  start_date: schedule.start_date,
                  end_date: schedule.end_date,
                  start_date_formatted: originalStartFormatted,
                  end_date_formatted: originalEndFormatted,
                },
              },
              comment: `Día ${dayName} ${dateFormatted} eliminado del horario "${scheduleType?.name || 'Desconocido'
                }" para ${employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'empleado'
                }${branch ? ` en sucursal ${branch.name}` : ''
                } (rango original: ${originalStartFormatted} - ${originalEndFormatted})`,
            });
          }

          this.message.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Horario eliminado correctamente',
          });
          this.schedulesResource.reload();
        },
      });
  }

  public approveSchedule(id: string) {
    this.confirm.confirm({
      header: 'Confirma horario?',
      message: '¿Estás seguro de aprobar este horario?',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar',
        severity: 'success',
      },
      accept: async () => {
        console.log('🔵 [APROBAR] Iniciando aprobación para ID:', id);

        const companyId = this.organizationService.getCurrentCompanyId();
        const params: any = { id: `eq.${id}` };

        // Agregar filtro por company_id para seguridad
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }

        console.log('🔵 [APROBAR] Params para PATCH:', params);
        console.log('🔵 [APROBAR] Company ID actual:', companyId);

        // Obtener información del horario ANTES de aprobarlo para auditoría
        const scheduleToApprove = this.shifts()?.find((s) => s.id === id);
        console.log('🔵 [APROBAR] Turno encontrado:', scheduleToApprove);

        const currentEmployeeId = this.store.currentEmployee()?.id;

        if (currentEmployeeId && scheduleToApprove) {
          const schedule = this.store.schedules
            .entities()
            .find((s) => s.id === scheduleToApprove.schedule_id);
          const employee = this.store.employees
            .entities()
            .find((e) => e.id === scheduleToApprove.employee_id);
          const branch = this.store.branches
            .entities()
            .find((b) => b.id === scheduleToApprove.branch_id);

          const startDateFormatted = format(
            toDate(scheduleToApprove.start_date, {
              timeZone: 'America/Panama',
            }),
            'dd/MM/yyyy'
          );
          const endDateFormatted = format(
            toDate(scheduleToApprove.end_date, {
              timeZone: 'America/Panama',
            }),
            'dd/MM/yyyy'
          );
          const isSingleDay = isSameDay(
            toDate(scheduleToApprove.start_date, {
              timeZone: 'America/Panama',
            }),
            toDate(scheduleToApprove.end_date, {
              timeZone: 'America/Panama',
            })
          );

          // Registrar auditoría ANTES de aprobar
          await this.auditService.logChange({
            employeeScheduleId: id,
            changedBy: currentEmployeeId,
            action: 'approved',
            oldStatus: scheduleToApprove.approved || false,
            newStatus: true,
            oldValue: {
              employee_id: scheduleToApprove.employee_id,
              employee_name: employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'Desconocido',
              schedule_id: scheduleToApprove.schedule_id,
              schedule_name: schedule?.name || 'Desconocido',
              branch_id: scheduleToApprove.branch_id,
              branch_name: branch?.name || 'Desconocido',
              start_date: scheduleToApprove.start_date,
              end_date: scheduleToApprove.end_date,
              start_date_formatted: startDateFormatted,
              end_date_formatted: endDateFormatted,
              is_single_day: isSingleDay,
              approved: scheduleToApprove.approved || false,
            },
            newValue: {
              employee_id: scheduleToApprove.employee_id,
              employee_name: employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'Desconocido',
              schedule_id: scheduleToApprove.schedule_id,
              schedule_name: schedule?.name || 'Desconocido',
              branch_id: scheduleToApprove.branch_id,
              branch_name: branch?.name || 'Desconocido',
              start_date: scheduleToApprove.start_date,
              end_date: scheduleToApprove.end_date,
              start_date_formatted: startDateFormatted,
              end_date_formatted: endDateFormatted,
              is_single_day: isSingleDay,
              approved: true,
            },
            comment: `Horario "${schedule?.name || 'Desconocido'
              }" aprobado para ${employee
                ? `${employee.first_name} ${employee.father_name}`
                : 'empleado'
              }${isSingleDay
                ? ` el día ${startDateFormatted}`
                : ` del ${startDateFormatted} al ${endDateFormatted}`
              }${branch ? ` en sucursal ${branch.name}` : ''}`,
          });
        }

        // Ahora aprobar el horario
        console.log('🔵 [APROBAR] Enviando PATCH...');
        this.http
          .patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            { approved: true },
            { params }
          )
          .pipe(
            catchError((error) => {
              console.error('🔴 [APROBAR] Error en PATCH:', error);
              console.error('🔴 [APROBAR] Error status:', error.status);
              console.error('🔴 [APROBAR] Error message:', error.message);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar el horario',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: (response) => {
              console.log('✅ [APROBAR] PATCH exitoso, respuesta:', response);
              console.log('✅ [APROBAR] Recargando schedulesResource...');

              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario aprobado correctamente',
              });

              this.schedulesResource.reload();
              console.log('✅ [APROBAR] Reload completado');
            },
          });
      },
    });
  }

  // ========== Bulk Selection Methods ==========
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
    const current = this.selectedSelectionKeys();
    const newSet = new Set(current);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    this.selectedSelectionKeys.set(newSet);
  }

  public isShiftSelected(shiftId: string | undefined): boolean {
    // Note: This method is less useful now with composite keys from parent perspective
    // preventing logic errors, we just return false or rely on the grid to check keys
    return false;
  }

  public onBulkApprove(): void {
    const keys = Array.from(this.selectedSelectionKeys());
    if (keys.length === 0) return;

    // Extract unique shift IDs from composite keys
    const shiftIds = new Set<string>();
    keys.forEach((key) => {
      const parts = key.split('|');
      if (parts.length > 0) {
        shiftIds.add(parts[0]);
      }
    });

    const uniqueIds = Array.from(shiftIds);
    if (uniqueIds.length === 0) return;

    // Si algún horario seleccionado tiene advertencia, no permitir aprobación en lote
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

    this.batchApproveSchedules(uniqueIds, keys.length);
  }

  public batchApproveSchedules(
    ids: string[],
    visualCount: number = ids.length
  ): void {
    if (ids.length === 0) return;

    this.confirm.confirm({
      header: 'Aprobar múltiples horarios?',
      message: `¿Estás seguro de aprobar ${visualCount} turno${visualCount > 1 ? 's' : ''
        } (correspondientes a ${ids.length} registro${ids.length > 1 ? 's' : ''
        } de horario)?`,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar todos',
        severity: 'success',
      },
      accept: async () => {
        console.log(
          '🔵 [BATCH APROBAR] Iniciando aprobación de',
          ids.length,
          'horarios'
        );

        const companyId = this.organizationService.getCurrentCompanyId();
        const currentEmployeeId = this.store.currentEmployee()?.id;

        // Registrar auditoría para cada cambio
        const shifts = this.shifts() ?? [];
        for (const id of ids) {
          const scheduleToApprove = shifts.find((s) => s.id === id);

          if (currentEmployeeId && scheduleToApprove) {
            const schedule = this.store.schedules
              .entities()
              .find((s) => s.id === scheduleToApprove.schedule_id);
            const employee = this.store.employees
              .entities()
              .find((e) => e.id === scheduleToApprove.employee_id);
            const branch = this.store.branches
              .entities()
              .find((b) => b.id === scheduleToApprove.branch_id);

            const startDateFormatted = format(
              toDate(scheduleToApprove.start_date, {
                timeZone: 'America/Panama',
              }),
              'dd/MM/yyyy'
            );

            await this.auditService.logChange({
              employeeScheduleId: id,
              changedBy: currentEmployeeId,
              action: 'approved',
              oldStatus: scheduleToApprove.approved || false,
              newStatus: true,
              oldValue: { approved: false },
              newValue: { approved: true },
              comment: `Aprobación masiva: "${schedule?.name || 'Desconocido'
                }" para ${employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'empleado'
                } (${startDateFormatted})`,
            });
          }
        }

        // Aprobar todos en batch evitando encoding de Angular en 'in.()'
        const url = this.apiUrl.build('rest/v1/employee_schedules');
        // Construir query string manualmente para asegurar formato PostgREST
        const queryParams = [];
        queryParams.push(`id=in.(${ids.join(',')})`);
        if (companyId) {
          queryParams.push(`company_id=eq.${companyId}`);
        }

        const fullUrl = `${url}?${queryParams.join('&')}`;

        this.http
          .patch(fullUrl, { approved: true })
          .pipe(
            catchError((error) => {
              console.error('🔴 [BATCH APROBAR] Error:', error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar los horarios',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              console.log('✅ [BATCH APROBAR] PATCH exitoso');
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `${ids.length} registro(s) aprobado(s) correctamente`,
              });
              this.cancelBulkSelection();
              this.schedulesResource.reload();
            },
          });
      },
    });
  }

  public async confirmEmployeeWeek(employee: any) {
    const pendingShifts = employee.days
      .filter((d: any) => d.shift && !d.shift.approved)
      .map((d: any) => d.shift);

    if (pendingShifts.length === 0) return;

    // Si algún horario de la semana tiene advertencia, no permitir aprobar toda la semana
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

    this.confirm.confirm({
      header: 'Confirmar semana?',
      message: `¿Estás seguro de aprobar todos los horarios (${pendingShifts.length}) de ${employee.first_name} para esta semana?`,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar todo',
        severity: 'success',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const currentEmployeeId = this.store.currentEmployee()?.id;
        const shiftIds = pendingShifts.map((s: any) => s.id);

        if (currentEmployeeId) {
          // Auditoría para cada turno
          for (const shiftToApprove of pendingShifts) {
            const schedule = this.store.schedules
              .entities()
              .find((s) => s.id === shiftToApprove.schedule_id);
            const employeeData = this.store.employees
              .entities()
              .find((e) => e.id === shiftToApprove.employee_id);
            const branch = this.store.branches
              .entities()
              .find((b) => b.id === shiftToApprove.branch_id);

            const startDateFormatted = format(
              toDate(shiftToApprove.start_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );
            const endDateFormatted = format(
              toDate(shiftToApprove.end_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );

            await this.auditService.logChange({
              employeeScheduleId: shiftToApprove.id,
              changedBy: currentEmployeeId,
              action: 'approved',
              oldStatus: false,
              newStatus: true,
              comment: `Aprobación masiva semanal: Horario "${schedule?.name || 'Desconocido'
                }" aprobado para ${employeeData
                  ? `${employeeData.first_name} ${employeeData.father_name}`
                  : 'empleado'
                } (${startDateFormatted} - ${endDateFormatted})`,
            });
          }
        }

        // Actualización masiva en Supabase
        const params: any = { id: `in.(${shiftIds.join(',')})` };
        if (companyId) params.company_id = `eq.${companyId}`;

        this.http
          .patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            { approved: true },
            { params }
          )
          .pipe(
            catchError((error) => {
              console.error('🔴 [APROBAR SEMANA] Error:', error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar los horarios',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Se han aprobado ${pendingShifts.length} horarios correctamente`,
              });
              this.schedulesResource.reload();
            },
          });
      },
    });
  }

  public openAddEmployeeDialog() {
    // Si es admin o HR, permitir seleccionar la sucursal
    const canSelectBranch = this.permissionsService.canSelectBranch();
    let targetBranch = this.store.currentBranch();

    // Si es gerente de tienda (no admin, no HR), debe tener sucursal asignada
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
      // Para Admin o HR, usar la sucursal del filtro si está seleccionada, sino undefined
      if (this.filterService.currentBranch()) {
        const branchId = this.filterService.currentBranch();
        targetBranch =
          this.store.branches.entities().find((b) => b.id === branchId) ||
          undefined;
      } else {
        targetBranch = undefined;
      }
    }

    this.dialog
      .open(AddEmployeeToBranchDialogComponent, {
        header: 'Añadir empleado a sucursal',
        width: '500px',
        data: {
          branchId: targetBranch?.id || null,
          branchName: targetBranch?.name || '',
          canSelectBranch, // Permitir seleccionar solo si es Admin o HR
        },
        modal: true,
        dismissableMask: true,
      })
      .onClose.subscribe((added) => {
        if (added) {
          // Recargar lista de empleados y recursos relacionados inmediatamente
          this.store.employees.reloadItems();
          this.schedulesResource.reload();
        }
      });
  }

  public openAuditHistoryDialog() {
    // Forzar recarga al abrir (mantener comportamiento anterior: siempre refresca)
    this.lastAuditHistoryQueryKey = null;
    this.loadAuditHistory();
    this.showAuditHistoryDialog.set(true);
  }

  private async loadAuditHistory() {
    this.isLoadingAuditHistory.set(true);
    try {
      const params = this.getAuditHistoryServerParams();
      const queryKey = JSON.stringify(params ?? {});
      if (this.lastAuditHistoryQueryKey === queryKey) {
        return;
      }
      this.lastAuditHistoryQueryKey = queryKey;

      const history = await firstValueFrom(
        this.auditService.getAllAuditHistory(params)
      );
      this.allAuditHistory.set(history || []);
    } catch (error) {
      console.error('Error cargando historial de auditoría:', error);
      this.allAuditHistory.set([]);
    } finally {
      this.isLoadingAuditHistory.set(false);
    }
  }

  private queueAuditHistoryReload() {
    if (this.auditReloadTimer) clearTimeout(this.auditReloadTimer);
    this.auditReloadTimer = setTimeout(() => {
      void this.loadAuditHistory();
    }, 250);
  }

  private getAuditHistoryServerParams():
    | Parameters<ScheduleAuditService['getAllAuditHistory']>[0]
    | undefined {
    const employeeId = this.selectedEmployeeFilter() || undefined;
    const action = (this.selectedActionFilter() || undefined) as
      | ScheduleAuditLog['action']
      | undefined;

    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    const range = this.selectedDateRange();
    if (range && range.length === 2 && range[0] && range[1]) {
      dateFrom = startOfDay(range[0]);
      dateTo = endOfDay(range[1]);
    }

    const params = { employeeId, dateFrom, dateTo, action };

    if (!employeeId && !dateFrom && !dateTo && !action) return undefined;
    return params;
  }

  // Computed para filtros activos
  public hasActiveAuditFilters = computed(() => {
    return (
      !!this.selectedEmployeeFilter() ||
      !!this.selectedDateRange() ||
      !!this.selectedActionFilter() ||
      !!this.auditSearchText().trim()
    );
  });

  public getActiveAuditFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedEmployeeFilter()) count++;
    if (this.selectedDateRange()) count++;
    if (this.selectedActionFilter()) count++;
    if (this.auditSearchText().trim()) count++;
    return count;
  });

  // Computed para historial filtrado
  public filteredAuditHistory = computed(() => {
    let filtered = [...this.allAuditHistory()];

    // Filtro por empleado
    if (this.selectedEmployeeFilter()) {
      filtered = filtered.filter(
        (log) =>
          log.employee_schedule?.employee_id === this.selectedEmployeeFilter()
      );
    }

    // Filtro por rango de fechas
    if (this.selectedDateRange() && this.selectedDateRange()!.length === 2) {
      const [start, end] = this.selectedDateRange()!;
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.changed_at);
        return logDate >= start && logDate <= end;
      });
    }

    // Filtro por acción
    if (this.selectedActionFilter()) {
      filtered = filtered.filter(
        (log) => log.action === this.selectedActionFilter()
      );
    }

    // Filtro por texto libre
    const searchText = this.auditSearchText().toLowerCase().trim();
    if (searchText) {
      filtered = filtered.filter((log) => {
        const employeeName =
          log.employee_schedule?.employee?.first_name +
          ' ' +
          log.employee_schedule?.employee?.father_name;
        const changedByName =
          log.changed_by_employee?.first_name +
          ' ' +
          log.changed_by_employee?.father_name;
        const comment = log.comment || '';
        return (
          employeeName?.toLowerCase().includes(searchText) ||
          changedByName?.toLowerCase().includes(searchText) ||
          comment.toLowerCase().includes(searchText) ||
          this.getAuditActionLabel(log.action)
            .toLowerCase()
            .includes(searchText)
        );
      });
    }

    return filtered;
  });

  // Historial filtrado (computed que se actualiza automáticamente)
  public auditHistoryComputed = computed(() => {
    return this.filteredAuditHistory();
  });

  public clearAuditFilters() {
    this.selectedEmployeeFilter.set(null);
    this.selectedDateRange.set(null);
    this.selectedActionFilter.set(null);
    this.auditSearchText.set('');
  }

  // Opciones para dropdown de acciones
  public auditActionOptions = [
    { label: 'Todas', value: null },
    { label: 'Creado', value: 'created' },
    { label: 'Editado', value: 'updated' },
    { label: 'Eliminado', value: 'deleted' },
    { label: 'Aprobado', value: 'approved' },
    { label: 'Rechazado', value: 'rejected' },
    { label: 'Dividido', value: 'split' },
    { label: 'Día eliminado de rango', value: 'split_range' },
  ];

  // Métodos para dialog específico
  public onViewSpecificAudit(event: { employeeId: string; date: Date }) {
    this.selectedAuditEmployeeId.set(event.employeeId);
    this.selectedAuditDate.set(event.date);
    this.loadSpecificAuditHistory(event.employeeId, event.date);
    this.showSpecificAuditDialog.set(true);
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

  public getEmployeeName(employeeId: string): string {
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === employeeId);
    return employee
      ? `${employee.first_name} ${employee.father_name}`
      : 'Empleado desconocido';
  }

  public getSpecificAuditDialogHeader = computed(() => {
    const employeeName = this.selectedAuditEmployeeId()
      ? this.getEmployeeName(this.selectedAuditEmployeeId()!)
      : '';
    const dateStr = this.selectedAuditDate()
      ? format(this.selectedAuditDate()!, 'dd/MM/yyyy')
      : '';
    return `Historial de Auditoría - ${employeeName} - ${dateStr}`;
  });

  // Métodos helper para mostrar información del historial
  public getAuditActionLabel(action: ScheduleAuditLog['action']): string {
    const labels = {
      created: 'Creado',
      updated: 'Actualizado',
      deleted: 'Eliminado',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      split: 'Dividido',
      split_range: 'Día eliminado de rango',
    };
    return labels[action] || action;
  }

  public getAuditActionIcon(action: ScheduleAuditLog['action']): string {
    const icons = {
      created: 'pi-plus-circle',
      updated: 'pi-pencil',
      deleted: 'pi-trash',
      approved: 'pi-check-circle',
      rejected: 'pi-times-circle',
      split: 'pi-arrows-split',
      split_range: 'pi-calendar-minus',
    };
    return icons[action] || 'pi-info-circle';
  }

  public getAuditActionColor(action: ScheduleAuditLog['action']): string {
    const colors = {
      created: 'text-green-400',
      updated: 'text-blue-400',
      deleted: 'text-red-400',
      approved: 'text-green-400',
      rejected: 'text-red-400',
      split: 'text-orange-400',
      split_range: 'text-yellow-400',
    };
    return colors[action] || 'text-gray-400';
  }
}
