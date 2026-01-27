import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import {
  colorVariants,
  getScheduleColorInlineStyle as getColorStyle,
  Schedule,
} from '../models';
import { TimePipe } from '../pipes/time.pipe';
import { SchedulesStore } from '../stores/schedules.store';
import { DashboardStore } from '../stores/dashboard.store';
import { SchedulesFormComponent } from './schedules-form.component';
import { ScheduleConfigurationDialogComponent } from './schedule-configuration-dialog.component';

@Component({
  selector: 'pt-schedules',
  imports: [Card, TableModule, Button, TimePipe, NgClass, NgStyle, Tooltip],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
    <ng-template #title>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="m-0">Horarios</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Listado de horarios y turnos disponibles
          </p>
        </div>
        <div class="flex gap-2">
          @if(dashboardStore.isAdmin()) {
          <p-button
            label="Nuevo"
            icon="pi pi-plus-circle"
            (onClick)="editSchedule()"
            rounded
          />
          }
        </div>
      </div>
    </ng-template>
    <p-table
      [value]="schedules()"
      [rows]="10"
      [rowsPerPageOptions]="[10, 20, 50]"
      sortField="entry_time"
      paginator
      paginatorDropdownAppendTo="body"
    >
      <ng-template #header>
        <tr>
          <th pSortableColumn="name">Nombre<p-sortIcon field="name" /></th>
          <th>Color</th>
          <th pSortableColumn="entry_time">
            Inicio<p-sortIcon field="entry_time" />
          </th>
          <th pSortableColumn="lunch_start_time">
            Inicio de almuerzo<p-sortIcon field="lunch_start_time" />
          </th>
          <th pSortableColumn="lunch_end_time">
            Fin de almuerzo<p-sortIcon field="lunch_end_time" />
          </th>
          <th pSortableColumn="exit_time">
            Fin<p-sortIcon field="exit_time" />
          </th>
          <th pSortableColumn="minutes_tolerance">
            Tolerancia<p-sortIcon field="minutes_tolerance" />
          </th>
          <th>Libre</th>
          <th></th>
        </tr>
      </ng-template>
      <ng-template #body let-schedule>
        <tr>
          <td>{{ schedule.name }}</td>
          <td>
            <span
              class="rounded-full h-7 w-7 flex items-center justify-center ring-2 ring-neutral-700 hover:ring-amber-400/50 transition-all"
              [ngClass]="colorVariants[schedule.color] || ''"
              [ngStyle]="
                !colorVariants[schedule.color]
                  ? getScheduleColorInlineStyle(schedule.color)
                  : null
              "
              ><i class="pi pi-check text-xs"></i
            ></span>
          </td>
          <td>{{ schedule.entry_time | time }}</td>
          <td>{{ schedule.lunch_start_time | time }}</td>
          <td>{{ schedule.lunch_end_time | time }}</td>
          <td>{{ schedule.exit_time | time }}</td>
          <td>{{ schedule.minutes_tolerance }} min.</td>
          <td class="text-center">
            @if(schedule.day_off) {
            <i class="pi pi-check-circle text-green-400 text-lg"></i>
            }@else {
            <i class="pi pi-times-circle text-red-400 text-lg"></i>
            }
          </td>
          <td>
            <div class="flex gap-2 items-center">
              @if(dashboardStore.isAdmin()) {
              <p-button
                severity="info"
                icon="pi pi-cog"
                text
                rounded
                pTooltip="Configurar reglas"
                tooltipPosition="top"
                (onClick)="openConfiguration(schedule)"
              />
              }
              <p-button
                severity="success"
                icon="pi pi-pen-to-square"
                text
                rounded
                (onClick)="editSchedule(schedule)"
              />
              <p-button severity="danger" icon="pi pi-trash" text rounded />
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent {
  public store = inject(SchedulesStore);
  public dashboardStore = inject(DashboardStore);
  public message = inject(MessageService);
  public schedules = computed(() => [...this.store.entities()]);

  public dialogService = inject(DialogService);
  private ref = inject(DynamicDialogRef);
  colorVariants = colorVariants;
  colors = Object.entries(colorVariants).map(([key, value]) => ({
    key,
    value,
  }));

  getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  editSchedule(schedule?: Schedule) {
    // Verificar permisos antes de abrir el formulario
    if (!this.dashboardStore.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden crear o editar horarios base.',
      });
      return;
    }

    this.ref = this.dialogService.open(SchedulesFormComponent, {
      header: 'Editar horario',
      modal: true,
      data: {
        schedule,
      },
    });
  }

  openConfiguration(schedule: Schedule) {
    // Verificar permisos antes de abrir el modal de configuración
    if (!this.dashboardStore.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden configurar reglas de horarios.',
      });
      return;
    }

    this.ref = this.dialogService.open(ScheduleConfigurationDialogComponent, {
      header: `Configurar: ${schedule.name}`,
      modal: true,
      width: '500px',
      data: {
        schedule,
      },
    });
  }
}
