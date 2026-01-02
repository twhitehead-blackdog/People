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
  endOfDay,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  subDays,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { Popover } from 'primeng/popover';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitch, ToggleSwitchChangeEvent } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { catchError, EMPTY, forkJoin } from 'rxjs';
import { v4 } from 'uuid';
import { colorVariants, EmployeeSchedule } from '../models';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { AddEmployeeToBranchDialogComponent } from './add-employee-to-branch-dialog.component';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';
import { MonthWeekSelectorComponent } from './employees-timetable/components/month-week-selector/month-week-selector.component';
import { ShiftCellComponent } from './employees-timetable/components/shift-cell/shift-cell.component';
import { TimetableFiltersComponent } from './employees-timetable/components/timetable-filters/timetable-filters.component';
import { TimetableGridComponent } from './employees-timetable/components/timetable-grid/timetable-grid.component';
import { TimetableHeaderComponent } from './employees-timetable/components/timetable-header/timetable-header.component';
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
    Select,
    Card,
    FormsModule,
    TableModule,
    Menu,
    Button,
    DatePipe,
    NgClass,
    Tooltip,
    Popover,
    ToggleSwitch,
    Dialog,
    InputText,
    TimetableFiltersComponent,
    TimetableHeaderComponent,
    ShiftCellComponent,
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
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 w-full">
            <pt-timetable-header
              [currentWeekLabel]="currentWeek()"
              [menuItems]="menuItems"
            />
            @if(permissionsService.canAddEmployees()) {
            <p-button
              label="¿No aparece un empleado?"
              icon="pi pi-user-plus"
              severity="help"
              outlined
              rounded
              size="small"
              class="w-full lg:w-auto"
              (onClick)="openAddEmployeeDialog()"
            />
            }
          </div>
        </pt-timetable-filters>
      </div>

      <pt-timetable-grid
        [employees]="employeeSchedulesList()"
        [days]="days()"
        [canManageSchedules]="store.canManageSchedules()"
        [canApproveSchedules]="permissionsService.canApproveSchedules()"
        (editShift)="editSchedule($event)"
        (deleteShift)="deleteSchedule($event.shift, $event.date)"
        (approveShift)="approveSchedule($event)"
        (addShift)="editSchedule($event)"
      />
    </p-card>
    <p-dialog
      header="Desbloquear edicion"
      modal
      [(visible)]="unlockModal"
      [closable]="false"
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
  private http = inject(HttpClient);
  private confirm = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  public permissionsService = inject(TimetablePermissionsService);
  public filterService = inject(TimetableFilterService);
  public navigationService = inject(TimetableNavigationService);
  public injector = inject(Injector);

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
    if (code.value === process.env['ENV_UNLOCK_CODE']) {
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

    // Construir URL manualmente para filtrar a través de employee.company_id
    let url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules?select=*,schedule:schedules(*),branch:branches(id, name, short_name),employee:employees(id,company_id)`;
    url += `&start_date=lte.${endDate}`;
    url += `&end_date=gte.${startDate}`;

    // Filtrar a través de employees.company_id (funciona incluso si employee_schedules no tiene company_id)
    if (companyId) {
      url += `&employee.company_id=eq.${companyId}`;
    }

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

  public employeeSchedulesList = computed(() =>
    this.currentEmployees().map((employee) => ({
      id: employee.id,
      first_name: employee.first_name,
      father_name: employee.father_name,
      position: employee.position
        ? { name: employee.position.name }
        : { name: '' },
      days: employee.days.map((day) => ({
        ...day,
        shift: this.shifts()?.find(
          (shift) =>
            shift.employee_id === employee.id &&
            isWithinInterval(day.date, {
              start: startOfDay(
                toDate(shift.start_date, { timeZone: 'America/Panama' })
              ),
              end: endOfDay(
                toDate(shift.end_date, { timeZone: 'America/Panama' })
              ),
            })
        ),
      })),
    }))
  );

  ngOnInit(): void {
    this.editionLocked.set(true);
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
      accept: () => {
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

        this.http
          .delete(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { params }
          )
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
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
          this.http.delete(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { params }
          )
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
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
          this.http.delete(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { params }
          )
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
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
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
        next: () => {
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
      accept: () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const params: any = { id: `eq.${id}` };

        // Agregar filtro por company_id para seguridad
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }

        this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { approved: true },
            { params }
          )
          .pipe(
            catchError((error) => {
              console.error(error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar el horario',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario aprobado correctamente',
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
          this.store.employees.fetchItems();
          this.schedulesResource.reload();
        }
      });
  }
}
