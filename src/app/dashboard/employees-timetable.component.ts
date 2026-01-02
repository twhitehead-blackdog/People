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
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getWeek,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
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

@Component({
  selector: 'pt-employees-timetable',
  providers: [DialogService, DynamicDialogRef],
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
      <p-table
        [value]="employeeSchedulesList()"
        paginator
        [rows]="10"
        [tableStyle]="{ 'min-width': '50rem' }"
        [rowsPerPageOptions]="[10, 20, 50]"
        paginatorDropdownAppendTo="body"
      >
        <ng-template #caption>
          <div class="flex lg:flex-row flex-col gap-2 mb-2">
            <input
              pInputText
              type="text"
              [(ngModel)]="employeeSearch"
              placeholder="Buscar empleado por nombre..."
              class="w-full lg:w-auto flex-1 text-sm"
            />
            <p-select
              fluid
              [(ngModel)]="currentBranch"
              [options]="store.branches.entities()"
              [disabled]="disableBranch()"
              appendTo="body"
              optionValue="id"
              placeholder="TODAS LAS SUCURSALES"
              filter
              showClear
              optionLabel="name"
              optionValue="id"
              class="w-full lg:w-auto flex-1 text-sm"
            />
            <p-select
              fluid
              [(ngModel)]="currentPosition"
              [options]="store.positions.entities()"
              appendTo="body"
              placeholder="TODOS LOS PUESTOS"
              filter
              showClear
              optionLabel="name"
              optionValue="id"
              class="w-full lg:w-auto flex-1 text-sm"
            />
            <div class="flex w-full lg:w-auto">
              <p-menu
                #menu
                [model]="menuItems"
                [popup]="true"
                appendTo="body"
              />
              <p-button
                (click)="menu.toggle($event)"
                [label]="currentWeek()"
                icon="pi pi-calendar"
                rounded
                severity="secondary"
                outlined
                size="small"
                class="w-full lg:w-auto whitespace-nowrap text-sm"
              />
            </div>
            @if(store.isAdmin() || (store.isScheduleAdmin() && currentBranch())
            || (isHRDepartment() && currentBranch())) {
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
        </ng-template>
        <ng-template #header>
          <tr>
            <th pFrozenColumn>Nombre</th>
            <th>Cargo</th>
            @for(days of days(); track days){
            <th class="text-center min-w-[100px] max-w-[100px]">
              <div class="flex flex-col items-center gap-0 leading-[1.1]">
                <span class="text-xs font-bold uppercase">{{
                  days.date | date : 'EEE'
                }}</span>
                <span class="text-[10px]">{{
                  days.date | date : 'd MMM'
                }}</span>
              </div>
            </th>
            }
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr>
            <td pFrozenColumn>{{ item.first_name }} {{ item.father_name }}</td>
            <td>{{ item.position.name }}</td>
            @for(day of item.days; track day.date){
            <td class="text-center">
              @if(day.shift) {
              <div
                class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm"
                [class]="colorVariants[day.shift.schedule?.color]"
                [ngClass]="{
                  'opacity-60 hover:opacity-100': !day.shift.approved,
                  'ring-1 ring-amber-400/70 shadow-md': day.shift.approved
                }"
                [pTooltip]="tooltipContent"
                tooltipPosition="top"
                (click)="options.toggle($event)"
              >
                <span class="truncate max-w-[65px] font-semibold leading-tight">
                  {{ day.shift.schedule.name }}
                </span>
                @if(day.shift.approved) {
                <i
                  class="pi pi-check-circle text-green-400 text-[9px] ml-0.5 flex-shrink-0"
                ></i>
                } @else {
                <i
                  class="pi pi-exclamation-circle text-yellow-200 text-[9px] ml-0.5 animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                ></i>
                }
              </div>
              <ng-template #tooltipContent>
                <div class="flex flex-col gap-1">
                  <div>
                    Horario:
                    <span class="font-bold">{{
                      day.shift.schedule?.name
                    }}</span>
                  </div>
                  @if(!day.shift.schedule?.day_off) {
                  <div>
                    Sucursal:
                    <span class="font-bold">{{ day.shift.branch?.name }}</span>
                  </div>
                  } @if(day.shift.approved) {
                  <span class="font-bold">Aprobado por RRHH</span>
                  } @else {
                  <span class="italic">Pendiente por aprobacion</span>
                  }
                </div>
              </ng-template>
              <p-popover #options>
                <div>
                  <span class="font-medium block mb-2">Opciones</span>
                  <ul class="list-non flex flex-col">
                    @if(store.canManageSchedules()) {
                    <li
                      class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                      (click)="
                        editSchedule({
                          employee_schedule: day.shift,
                          date: day.date
                        })
                      "
                    >
                      <i class="pi pi-pencil text-primary-600"></i>
                      Editar
                    </li>
                    <li
                      class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                      (click)="deleteSchedule(day.shift, day.date)"
                    >
                      <i class="pi pi-trash text-red-700"></i>
                      Eliminar
                    </li>
                    }
                    @if(store.isScheduleApprover()) {
                    <li
                      class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                      (click)="approveSchedule(day.shift.id)"
                    >
                      <i class="pi pi-check-circle text-green-700"></i>
                      Aprobar
                    </li>
                    }
                  </ul>
                </div>
              </p-popover>
              } @else {
              @if(store.canManageSchedules()) {
              <p-button
                icon="pi pi-plus"
                outlined
                size="small"
                severity="secondary"
                (onClick)="
                  editSchedule({ employee_id: item.id, date: day.date })
                "
                class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
              />
              }
              }
            </td>
            }
          </tr>
        </ng-template>
      </p-table>
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
    
    <p-dialog
      [visible]="monthWeekSelectorVisible()"
      (visibleChange)="monthWeekSelectorVisible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      header="Seleccionar Mes y Semana"
      [style]="{ width: '90vw', maxWidth: '650px', minHeight: '400px' }"
      [styleClass]="'month-week-selector-dialog'"
      (onHide)="monthWeekSelectorVisible.set(false)"
    >
      <div class="flex flex-col gap-5 py-2">
        <div class="flex flex-col gap-3">
          <label class="text-sm font-semibold text-gray-200">Mes:</label>
          <p-select
            [options]="getMonthOptions()"
            [ngModel]="selectedMonthOption()"
            (ngModelChange)="onMonthChange($event)"
            optionLabel="label"
            [styleClass]="'w-full month-select'"
            appendTo="body"
          />
        </div>
        <div class="flex flex-col gap-3">
          <label class="text-sm font-semibold text-gray-200">Semana del mes:</label>
          <p-select
            [options]="weekOptions()"
            [ngModel]="selectedWeek()"
            (ngModelChange)="selectedWeek.set($event)"
            optionLabel="label"
            optionValue="value"
            [styleClass]="'w-full week-select'"
            appendTo="body"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button
            label="Cancelar"
            (click)="monthWeekSelectorVisible.set(false)"
            rounded
            severity="secondary"
          />
          <p-button
            label="Ir a semana"
            (click)="goToSelectedWeek()"
            rounded
          />
        </div>
      </div>
    </p-dialog> `,
  styles: `
    ::ng-deep .month-week-selector-dialog .p-dialog-content {
      padding: 1.5rem !important;
      min-height: 300px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select {
      width: 100% !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-trigger {
      min-height: 44px !important;
      padding: 0.625rem 0.75rem !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-panel {
      width: 100% !important;
      max-height: 300px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-items-wrapper {
      max-height: 280px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper {
      max-height: 320px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(107, 114, 128, 0.5) transparent !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar {
      width: 8px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar-track {
      background: transparent !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar-thumb {
      background-color: rgba(107, 114, 128, 0.5) !important;
      border-radius: 4px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item {
      padding: 0.875rem 1rem !important;
      font-size: 0.95rem !important;
      min-height: 44px !important;
      display: flex !important;
      align-items: center !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item:hover {
      background-color: rgba(107, 114, 128, 0.2) !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item.p-highlight {
      background-color: rgba(251, 191, 36, 0.2) !important;
      color: #fbbf24 !important;
    }
  `,
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
    value: new Date()
  });
  public selectedWeek = signal<number>(1);
  public currentDate = signal(new Date());
  public disableBranch = signal(true);
  private http = inject(HttpClient);
  private confirm = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  public injector = inject(Injector);

  public isHRDepartment = computed(() => {
    const currentEmp = this.store.currentEmployee();
    const deptName = currentEmp?.department?.name?.toLowerCase() || '';
    return (
      deptName.includes('recursos humanos') ||
      deptName.includes('rrhh') ||
      deptName.includes('hr')
    );
  });

  public start = computed(() => {
    // Usar startOfWeek con weekStartsOn: 0 para que comience en domingo
    return startOfWeek(this.currentDate(), { weekStartsOn: 0 });
  });
  public end = computed(() => {
    // Usar endOfWeek con weekStartsOn: 0 para que termine en sábado
    return endOfWeek(this.currentDate(), { weekStartsOn: 0 });
  });
  currentWeek = computed(
    () =>
      format(this.start(), 'dd/MM/yyyy') +
      ' - ' +
      format(this.end(), 'dd/MM/yyyy')
  );

  public colorVariants = colorVariants;

  days = computed(() => {
    {
      let current = this.start();
      const dayList: { date: Date; day: number; shift: any }[] = [];
      // Iterar exactamente 7 días (domingo a sábado) para asegurar que se incluyan todos los días
      for (let i = 0; i < 7; i++) {
        dayList.push({
          date: current,
          day: getDate(current),
          shift: undefined,
        });
        current = addDays(current, 1);
      }

      return dayList;
    }
  });

  weekOptions = computed(() => {
    const weeks = this.getWeeksInMonth(this.selectedMonth());
    return weeks.map(w => ({ label: 'Semana ' + w, value: w }));
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

  public currentBranch = model<string>();
  public currentPosition = model<string>();
  public employeeSearch = model<string>('');
  private dialog = inject(DialogService);
  private message = inject(MessageService);
  public currentEmployees = computed(() => {
    const employees = this.store.employees
      .employeesList()
      .filter((employee) => employee.is_active);

    // Si es gerente de tienda (schedule_admin pero no admin), filtrar estrictamente por su sucursal
    const isManager = this.store.isScheduleAdmin() && !this.store.isAdmin();
    const managerBranchId = isManager ? this.store.currentBranch()?.id : null;

    return employees
      .filter((employee) => {
        // Si es gerente, solo mostrar empleados de su sucursal
        if (isManager && managerBranchId) {
          if (employee.branch_id !== managerBranchId) {
            return false;
          }
        }

        // Filtro por búsqueda de nombre
        const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
        const matchesSearch =
          !searchTerm ||
          `${employee.first_name} ${employee.father_name}`
            .toLowerCase()
            .includes(searchTerm) ||
          employee.first_name.toLowerCase().includes(searchTerm) ||
          employee.father_name.toLowerCase().includes(searchTerm);

        // Filtro por sucursal (selector manual)
        const matchesBranch =
          !this.currentBranch() || employee.branch_id === this.currentBranch();

        // Filtro por puesto
        const matchesPosition =
          !this.currentPosition() ||
          employee.position_id === this.currentPosition();

        return matchesSearch && matchesBranch && matchesPosition;
      })
      .map(
        ({
          id,
          first_name,
          father_name,
          branch,
          branch_id,
          position_id,
          position,
        }) => ({
          id,
          first_name,
          father_name,
          branch,
          branch_id,
          position,
          position_id,
        })
      )
      .map((employee) => ({
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
      ...employee,
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
        if (this.store.isAdmin()) {
          this.disableBranch.set(false);
          return;
        }
        // Si es schedule_admin (gerente de tienda) pero no admin, forzar su sucursal
        if (this.store.isScheduleAdmin() && !this.store.isAdmin()) {
          const managerBranch = this.store.currentBranch()?.id;
          if (managerBranch) {
            this.currentBranch.set(managerBranch);
            this.disableBranch.set(true); // Bloquear cambio de sucursal
          }
        } else {
          // Para otros usuarios no-admin, también filtrar por sucursal
          this.currentBranch.set(this.store.currentBranch()?.id);
        }
      },
      { injector: this.injector }
    );
  }

  public nextWeek() {
    this.currentDate.update((value) => addWeeks(value, 1));
  }

  public previousWeek() {
    this.currentDate.update((value) => subWeeks(value, 1));
  }

  public goToday() {
    this.currentDate.set(new Date());
  }

  public openMonthWeekSelector() {
    const today = new Date();
    const monthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedMonth.set(monthDate);
    const options = this.getMonthOptions();
    const currentOption = options.find(opt => 
      opt.value.getFullYear() === monthDate.getFullYear() &&
      opt.value.getMonth() === monthDate.getMonth()
    ) || options[options.length - 1];
    this.selectedMonthOption.set(currentOption);
    this.selectedWeek.set(this.getCurrentWeekOfMonth(today));
    this.monthWeekSelectorVisible.set(true);
  }

  public getWeeksInMonth(month: Date): number[] {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const weeks: number[] = [];
    
    // Calcular la primera semana que incluye días del mes
    let currentDate = startOfWeek(start, { weekStartsOn: 0 });
    let weekNumber = 1;
    const maxWeeks = 6; // Un mes puede tener máximo 6 semanas
    
    // Iterar hasta cubrir todo el mes o hasta 6 semanas
    while (weekNumber <= maxWeeks && currentDate <= end) {
      // Verificar si esta semana tiene al menos un día del mes
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (weekEnd >= start && currentDate <= end) {
        weeks.push(weekNumber);
      }
      currentDate = addWeeks(currentDate, 1);
      weekNumber++;
    }
    
    return weeks.length > 0 ? weeks : [1]; // Al menos una semana
  }

  public getCurrentWeekOfMonth(date: Date): number {
    const monthStart = startOfMonth(date);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const dateWeekStart = startOfWeek(date, { weekStartsOn: 0 });
    const diffInWeeks = Math.floor(
      (dateWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return diffInWeeks + 1;
  }

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
    
    // Calcular la fecha de inicio de la semana seleccionada
    const monthStart = startOfMonth(month);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const targetWeekStart = addWeeks(firstWeekStart, weekNumber - 1);
    
    // Asegurarse de que la semana esté dentro del mes
    const monthEnd = endOfMonth(month);
    if (targetWeekStart > monthEnd) {
      // Si la semana está fuera del mes, usar el último día del mes
      this.currentDate.set(monthEnd);
    } else {
      this.currentDate.set(targetWeekStart);
    }
    
    this.monthWeekSelectorVisible.set(false);
  }

  public getMonthOptions(): { label: string; value: Date }[] {
    const options: { label: string; value: Date }[] = [];
    const today = new Date();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Agregar los últimos 12 meses y los próximos 3 meses
    for (let i = -12; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = monthNames[date.getMonth()];
      options.push({
        label: `${monthName} ${date.getFullYear()}`,
        value: date,
      });
    }
    
    return options;
  }

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
        detail: 'No tienes permisos para editar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden editar horarios.',
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
          branch: this.currentBranch(),
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
        detail: 'No tienes permisos para eliminar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden eliminar horarios.',
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
          const startDateObj = toDate(employee_schedule.start_date, { timeZone: 'America/Panama' });
          const endDateObj = toDate(employee_schedule.end_date, { timeZone: 'America/Panama' });
          const dateObj = toDate(date, { timeZone: 'America/Panama' });
          const isSingleDay = isSameDay(startDateObj, endDateObj);
          const dateIsInRange = dateObj >= startDateObj && dateObj <= endDateObj;

          // Si es un rango de múltiples días y la fecha está en el rango, dividir
          if (!isSingleDay && dateIsInRange) {
            this.deleteSingleDayFromRange(employee_schedule, dateObj, companyId);
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
    const startDateObj = toDate(schedule.start_date, { timeZone: 'America/Panama' });
    const endDateObj = toDate(schedule.end_date, { timeZone: 'America/Panama' });
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
    const isAdminOrHR = this.store.isAdmin() || this.isHRDepartment();
    let targetBranch = this.store.currentBranch();

    // Si es gerente de tienda (no admin, no HR), debe tener sucursal asignada
    if (!isAdminOrHR) {
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
      if (this.currentBranch()) {
        const branchId = this.currentBranch();
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
          canSelectBranch: isAdminOrHR, // Permitir seleccionar solo si es Admin o HR
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
