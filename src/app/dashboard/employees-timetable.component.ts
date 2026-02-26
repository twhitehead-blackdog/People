import { NgClass } from '@angular/common';
import { httpResource } from '@angular/common/http';
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
  endOfDay,
  format,
  isBefore,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { MenuItem, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch, ToggleSwitchChangeEvent } from 'primeng/toggleswitch';
import { firstValueFrom } from 'rxjs';
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
import { AuditHistoryDialogComponent } from './employees-timetable/components/audit-history-dialog/audit-history-dialog.component';
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

@Component({
  selector: 'pt-employees-timetable',
  providers: [
    DialogService,
    DynamicDialogRef,
    TimetablePermissionsService,
    TimetableFilterService,
    TimetableScheduleActionsService,
  ],
  imports: [
    Card,
    FormsModule,
    Button,
    NgClass,
    ToggleSwitch,
    Dialog,
    InputText,
    TimetableFiltersComponent,
    TimetableHeaderComponent,
    TimetableGridComponent,
    MonthWeekSelectorComponent,
    AuditHistoryDialogComponent,
    SpecificAuditDialogComponent,
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

    <pt-audit-history-dialog
      [(visible)]="showAuditHistoryDialog"
      [allHistory]="allAuditHistory()"
      [isLoading]="isLoadingAuditHistory()"
      [employeeOptions]="store.employees.employeesList()"
    />

    <pt-specific-audit-dialog
      [(visible)]="showSpecificAuditDialog"
      [header]="specificAuditDialogHeader()"
      [history]="specificAuditHistory()"
      [isLoading]="isLoadingSpecificAudit()"
    /> `,
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

  // Audit history
  public showAuditHistoryDialog = signal(false);
  public isLoadingAuditHistory = signal(false);
  public allAuditHistory = signal<ScheduleAuditLog[]>([]);

  // Specific audit dialog
  public showSpecificAuditDialog = signal(false);
  public selectedAuditEmployeeId = signal<string | null>(null);
  public selectedAuditDate = signal<Date | null>(null);
  public specificAuditHistory = signal<ScheduleAuditLog[]>([]);
  public isLoadingSpecificAudit = signal(false);

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
  private organizationService = inject(OrganizationService);
  public permissionsService = inject(TimetablePermissionsService);
  public filterService = inject(TimetableFilterService);
  public navigationService = inject(TimetableNavigationService);
  public injector = inject(Injector);
  private auditService = inject(ScheduleAuditService);
  private scheduleActions = inject(TimetableScheduleActionsService);
  private dialog = inject(DialogService);
  private message = inject(MessageService);

  public isHRDepartment = this.permissionsService.isHRDepartment;
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

  // ========== Schedule Resource ==========

  public schedulesResource = httpResource<EmployeeSchedule[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const startDate = format(this.start(), 'yyyy-MM-dd');
    const endDate = format(this.end(), 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/employee_schedules', {
        select:
          'id,employee_id,schedule_id,branch_id,start_date,end_date,approved,schedule:schedules(id,name,color,day_off,entry_time),branch:branches(id,name,short_name),employee:employees(id,company_id)',
        start_date: `lte.${endDate}`,
        end_date: `gte.${startDate}`,
        ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
      }),
      method: 'GET',
    };
  });

  // ========== Computed: Employee + Schedule Mapping ==========

  public currentEmployees = computed(() =>
    this.filterService.filteredEmployees().map((employee) => ({
      ...employee,
      days: this.days(),
    }))
  );

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
        return { ...day, shift, scheduleWarning };
      }),
    }));
  });

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
      label: 'Seleccionar mes y semana',
      icon: 'pi pi-calendar-plus',
      command: () => this.openMonthWeekSelector(),
    },
  ];

  // ========== Lifecycle ==========

  ngOnInit(): void {
    this.editionLocked.set(true);
    this.store.positions.fetchItems();

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
  }

  // ========== Navigation ==========

  public nextWeek() { this.navigationService.nextWeek(); }
  public previousWeek() { this.navigationService.previousWeek(); }
  public goToday() { this.navigationService.goToToday(); }

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
  }: {
    employee_id?: string;
    employee_schedule?: EmployeeSchedule;
    date?: Date;
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

    if (this.permissionsService.isStoreManager() && employee_schedule?.approved) {
      this.message.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail:
          'No puedes editar horarios que ya han sido aprobados. Contacta a un administrador o al departamento de RRHH.',
      });
      return;
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
      .onClose.subscribe(() => this.schedulesResource.reload());
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

    if (this.permissionsService.isStoreManager() && employee_schedule.approved) {
      this.message.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail:
          'No puedes eliminar horarios que ya han sido aprobados. Contacta a un administrador o al departamento de RRHH.',
      });
      return;
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

    this.dialog
      .open(AddEmployeeToBranchDialogComponent, {
        header: 'Añadir empleado a sucursal',
        width: '500px',
        data: {
          branchId: targetBranch?.id || null,
          branchName: targetBranch?.name || '',
          canSelectBranch,
        },
        modal: true,
        dismissableMask: true,
      })
      .onClose.subscribe((added) => {
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
    try {
      const history = await firstValueFrom(
        this.auditService.getAllAuditHistory()
      );
      this.allAuditHistory.set(history || []);
    } catch (error) {
      console.error('Error cargando historial de auditoría:', error);
      this.allAuditHistory.set([]);
    } finally {
      this.isLoadingAuditHistory.set(false);
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
