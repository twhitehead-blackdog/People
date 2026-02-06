import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import {
  colorVariants,
  getScheduleColorInlineStyle as getColorStyle,
  Schedule,
} from '../models';
import { TimePipe } from '../pipes/time.pipe';
import { SchedulesStore } from '../stores/schedules.store';
import { DashboardStore } from '../stores/dashboard.store';
import { SchedulesFormComponent } from './schedules-form.component';

@Component({
  selector: 'pt-schedules',
  imports: [Card, TableModule, Button, TimePipe, NgClass, NgStyle],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
    <ng-template #title>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
        <div>
          <h2 class="text-lg sm:text-xl font-semibold m-0">Horarios</h2>
          <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
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
            size="small"
          />
          }
        </div>
      </div>
    </ng-template>
    <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <p-table
        [value]="schedules()"
        [rows]="isMobile() ? 5 : 10"
        [rowsPerPageOptions]="[5, 10, 20, 50]"
        sortField="entry_time"
        paginator
        paginatorDropdownAppendTo="body"
        responsiveLayout="scroll"
        [scrollable]="true"
        scrollHeight="calc(100vh - 350px)"
        styleClass="min-w-[900px] md:min-w-full"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="name" class="min-w-[120px]">Nombre<p-sortIcon field="name" /></th>
            <th class="min-w-[60px]">Color</th>
            <th pSortableColumn="entry_time" class="min-w-[80px]">
              Inicio<p-sortIcon field="entry_time" />
            </th>
            <th pSortableColumn="lunch_start_time" class="min-w-[100px] hidden sm:table-cell">
              Inicio Alm.<p-sortIcon field="lunch_start_time" />
            </th>
            <th pSortableColumn="lunch_end_time" class="min-w-[100px] hidden sm:table-cell">
              Fin Alm.<p-sortIcon field="lunch_end_time" />
            </th>
            <th pSortableColumn="exit_time" class="min-w-[80px]">
              Fin<p-sortIcon field="exit_time" />
            </th>
            <th pSortableColumn="minutes_tolerance" class="min-w-[90px]">
              Toler.<p-sortIcon field="minutes_tolerance" />
            </th>
            <th class="min-w-[60px]">Libre</th>
            <th class="min-w-[100px]"></th>
          </tr>
        </ng-template>
        <ng-template #body let-schedule>
          <tr>
            <td class="font-medium">{{ schedule.name }}</td>
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
            <td class="hidden sm:table-cell">{{ schedule.lunch_start_time | time }}</td>
            <td class="hidden sm:table-cell">{{ schedule.lunch_end_time | time }}</td>
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
              <div class="flex gap-1 items-center">
                <p-button
                  severity="success"
                  icon="pi pi-pen-to-square"
                  text
                  rounded
                  size="small"
                  (onClick)="editSchedule(schedule)"
                />
                <p-button severity="danger" icon="pi pi-trash" text rounded size="small" />
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent {
  // Mobile detection
  public isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

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
}
