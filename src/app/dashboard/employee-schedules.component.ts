import { NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { eachDayOfInterval } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Popover } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';
import { catchError, EMPTY } from 'rxjs';
import { CalendarComponent } from '../calendar.component';
import { colorVariants, EmployeeSchedule } from '../models';
import { TimePipe } from '../pipes/time.pipe';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';
@Component({
  selector: 'pt-employee-schedules',
  imports: [Button, CalendarComponent, Popover, Tooltip, TimePipe, NgClass],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <pt-calendar
      [markers]="employeeSchedules() ?? []"
      [markerTpl]="markerTpl"
    />
    <p-button
      class="fixed bottom-24 right-12"
      label="Nuevo"
      icon="pi pi-plus-circle"
      (onClick)="editSchedule({ employee_id: employeeId() })"
    />
    <ng-template #markerTpl let-data>
      <div class="flex items-center justify-center">
        <ul class="flex flex-col gap-1 w-full">
          @for(marker of data; track marker){
          <li
            class="flex text-sm font-semibold rounded px-2 py-1 items-center cursor-pointer w-full"
            [ngClass]="colorVariants[marker.data.schedule.color]"
            [pTooltip]="tooltipContent"
            tooltipPosition="top"
            (click)="options.toggle($event)"
          >
            {{ marker.data.schedule.name }}
          </li>
          <ng-template #tooltipContent>
            <div class="flex flex-col gap-1">
              <div>
                Entrada:
                <span class="font-bold">{{
                  marker.data.schedule.entry_time | time
                }}</span>
              </div>
              <div>
                Salida:
                <span class="font-bold">{{
                  marker.data.schedule.exit_time | time
                }}</span>
              </div>
              <div>
                Sucursal:
                <span class="font-bold">{{
                  marker.data.branch?.short_name
                }}</span>
              </div>
            </div>
          </ng-template>
          <p-popover #options>
            <div>
              <span class="font-medium block mb-2">Opciones</span>
              <ul class="list-non flex flex-col">
                <li
                  class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                  (click)="editSchedule({ employee_schedule: marker.data })"
                >
                  <i class="pi pi-pencil text-green-600"></i>
                  Editar
                </li>
                <li
                  class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                  (click)="deleteSchedule(marker.data.id)"
                >
                  <i class="pi pi-trash text-red-700"></i>
                  Eliminar
                </li>
              </ul>
            </div>
          </p-popover>
          }
        </ul>
      </div>
    </ng-template>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeSchedulesComponent {
  public employeeId = input.required<string>();
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private confirm = inject(ConfirmationService);

  public employeeSchedules = computed(() =>
    this.resourceSchedules
      .value()
      ?.map((data) =>
        eachDayOfInterval({
          start: toDate(data.start_date, { timeZone: 'America/Panama' }),
          end: toDate(data.end_date, { timeZone: 'America/Panama' }),
        }).map((date) => ({ date, data }))
      )
      .flat()
  );
  private dialog = inject(DialogService);
  public colorVariants = colorVariants;

  private resourceSchedules = httpResource<EmployeeSchedule[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
    params: {
      select: '*,schedule:schedules(*),branch:branches(*)',
      employee_id: `eq.${this.employeeId()}`,
    },
  }));

  public editSchedule({
    employee_id,
    employee_schedule,
  }: {
    employee_id?: string;
    employee_schedule?: EmployeeSchedule;
  } = {}): void {
    this.dialog
      .open(EmployeeSchedulesFormComponent, {
        header: 'Editar horario',
        data: { employee_id, employee_schedule },
        width: '40%',
      })
      .onClose.subscribe(() => {
        this.resourceSchedules.reload();
      });
  }

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
              this.resourceSchedules.reload();
            },
          });
      },
    });
  }
}
