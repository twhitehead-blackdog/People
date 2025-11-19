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
  format,
  getDate,
  isBefore,
  isMonday,
  isWeekend,
  isWithinInterval,
  nextMonday,
  nextSunday,
  previousMonday,
  startOfDay,
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
import { catchError, EMPTY } from 'rxjs';
import { colorVariants, EmployeeSchedule } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
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
                    <li
                      class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                      (click)="editSchedule({ employee_schedule: day.shift })"
                    >
                      <i class="pi pi-pencil text-primary-600"></i>
                      Editar
                    </li>
                    <li
                      class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                      (click)="deleteSchedule(day.shift.id)"
                    >
                      <i class="pi pi-trash text-red-700"></i>
                      Eliminar
                    </li>
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
    </p-dialog> `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesTimetableComponent implements OnInit {
  public store = inject(DashboardStore);
  public editionLocked = model<boolean>();
  public unlockModal = signal(false);
  public currentDate = signal(new Date());
  public disableBranch = signal(true);
  private http = inject(HttpClient);
  private confirm = inject(ConfirmationService);
  public injector = inject(Injector);
  public start = computed(() => {
    if (isMonday(this.currentDate())) {
      return startOfDay(this.currentDate());
    }
    if (isWeekend(this.currentDate())) {
      return startOfDay(nextMonday(this.currentDate()));
    }

    return startOfDay(previousMonday(this.currentDate()));
  });
  public end = computed(() => endOfDay(nextSunday(this.start())));
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
      while (isBefore(current, this.end())) {
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
  ];

  public currentBranch = model<string>();
  public currentPosition = model<string>();
  private dialog = inject(DialogService);
  private message = inject(MessageService);
  public currentEmployees = computed(() =>
    this.store.employees
      .employeesList()
      .filter((employee) => employee.is_active)
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
      .filter((employee) => {
        return (
          (!this.currentBranch() ||
            employee.branch_id === this.currentBranch()) &&
          (!this.currentPosition() ||
            employee.position_id === this.currentPosition())
        );
      })
      .map((employee) => ({
        ...employee,
        days: this.days(),
      }))
  );

  public schedulesResource = httpResource<EmployeeSchedule[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
    method: 'GET',
    params: {
      select: '*,schedule:schedules(*), branch:branches(id, name, short_name)',
      start_date: `lte.${format(this.end(), 'yyyy-MM-dd')}`,
      end_date: `gte.${format(this.start(), 'yyyy-MM-dd')}`,
    },
  }));

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
        this.currentBranch.set(this.store.currentBranch()?.id);
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

  public editSchedule({
    employee_id,
    employee_schedule,
    date,
  }: {
    employee_id?: string;
    employee_schedule?: EmployeeSchedule;
    date?: Date;
  } = {}): void {
    this.dialog
      .open(EmployeeSchedulesFormComponent, {
        header: 'Editar horario',
        data: {
          employee_id,
          employee_schedule,
          date,
          branch: this.currentBranch(),
        },
        modal: true,
      })
      .onClose.subscribe(() => {
        this.schedulesResource.reload();
      });
  }

  public isPast = (date: Date) => isBefore(date, new Date());

  deleteSchedule(id: string) {
    this.confirm.confirm({
      header: 'Eliminar horario',
      message: '¿Estás seguro de eliminar este horario?',
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
        this.http
          .delete(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            {
              params: { id: `eq.${id}` },
            }
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
        this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { approved: true, approved_at: new Date() },
            { params: { id: `eq.${id}` } }
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
}
