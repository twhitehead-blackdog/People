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
import { isManagerPosition } from './services/schedule-manager-rules';

@Component({
  selector: 'pt-schedules',
  imports: [Card, TableModule, Button, TimePipe, NgClass, NgStyle],
  providers: [DynamicDialogRef, DialogService],
  template: `
  @if (isMobile()) {
  <!-- ===== MOBILE ===== -->
  <div class="flex flex-col min-h-[60vh]">
    <div class="mobile-section-header">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span class="mobile-section-header__title">Horarios</span>
        <span class="mobile-section-header__count">{{ schedules().length }}</span>
      </div>
      @if(dashboardStore.isAdmin() && !isBlockedManager()) {
      <button class="mobile-fab" style="position:relative;bottom:auto;right:auto;width:2.25rem;height:2.25rem;font-size:0.8rem;" (click)="editSchedule()" aria-label="Nuevo">
        <i class="pi pi-plus"></i>
      </button>
      }
    </div>
    <main class="flex-1 overflow-y-auto px-3 py-3">
      @if (schedules().length === 0) {
        <div class="mobile-empty-state">
          <i class="pi pi-calendar mobile-empty-state__icon"></i>
          <p class="mobile-empty-state__title">No hay horarios</p>
          <p class="mobile-empty-state__desc">Crea uno desde el botón superior</p>
        </div>
      } @else {
        <div class="mobile-card-list pb-4">
          @for (schedule of schedules(); track schedule.id) {
            <div class="mobile-card-item" (click)="dashboardStore.isAdmin() && !isBlockedManager() ? editSchedule(schedule) : null">
              <div style="display:flex;align-items:center;gap:0.6rem;flex:1;min-width:0;">
                <span
                  class="rounded-full h-8 w-8 flex items-center justify-center ring-2 ring-neutral-700 shrink-0"
                  [ngClass]="colorVariants[schedule.color || ''] || ''"
                  [ngStyle]="!colorVariants[schedule.color || ''] ? getScheduleColorInlineStyle(schedule.color ?? '') : null"
                >
                  @if(schedule.day_off) {
                    <i class="pi pi-moon text-[10px]"></i>
                  }
                </span>
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ schedule.name }}</div>
                  <div class="mobile-card-item__subtitle">
                    @if(schedule.day_off) {
                      Día libre
                    } @else {
                      {{ $any(schedule.entry_time) | time }} — {{ $any(schedule.exit_time) | time }}
                      <span style="color:rgba(255,255,255,0.25);margin:0 3px;">·</span>
                      Toler. {{ schedule.minutes_tolerance }}min
                    }
                  </div>
                </div>
              </div>
              @if(dashboardStore.isAdmin() && !isBlockedManager()) {
              <i class="pi pi-chevron-right text-gray-600 flex-shrink-0 text-xs"></i>
              }
            </div>
          }
        </div>
      }
    </main>
  </div>
  } @else {
  <!-- ===== DESKTOP ===== -->
  <p-card>
    <ng-template #title>
      <div class="flex items-center justify-between w-full gap-3">
        <div>
          <h2 class="text-xl font-semibold m-0">Horarios</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">Listado de horarios y turnos disponibles</p>
        </div>
        <div class="flex gap-2">
          @if(dashboardStore.isAdmin() && !isBlockedManager()) {
          <p-button label="Nuevo" icon="pi pi-plus-circle" (onClick)="editSchedule()" rounded size="small" />
          }
        </div>
      </div>
    </ng-template>
    <div class="overflow-x-auto">
      <p-table
        [value]="schedules()"
        [rows]="10"
        [rowsPerPageOptions]="[5, 10, 20, 50]"
        sortField="entry_time"
        paginator
        paginatorDropdownAppendTo="body"
        [scrollable]="true"
        scrollHeight="calc(100vh - 350px)"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="name" class="min-w-[120px]">Nombre<p-sortIcon field="name" /></th>
            <th class="min-w-[60px]">Color</th>
            <th pSortableColumn="entry_time" class="min-w-[80px]">Inicio<p-sortIcon field="entry_time" /></th>
            <th pSortableColumn="lunch_start_time" class="min-w-[100px]">Inicio Alm.<p-sortIcon field="lunch_start_time" /></th>
            <th pSortableColumn="lunch_end_time" class="min-w-[100px]">Fin Alm.<p-sortIcon field="lunch_end_time" /></th>
            <th pSortableColumn="exit_time" class="min-w-[80px]">Fin<p-sortIcon field="exit_time" /></th>
            <th pSortableColumn="minutes_tolerance" class="min-w-[90px]">Toler.<p-sortIcon field="minutes_tolerance" /></th>
            <th class="min-w-[60px]">Libre</th>
            <th class="min-w-[100px]"></th>
          </tr>
        </ng-template>
        <ng-template #body let-schedule>
          <tr>
            <td class="font-medium">{{ schedule.name }}</td>
            <td>
              <span class="rounded-full h-7 w-7 flex items-center justify-center ring-2 ring-neutral-700 hover:ring-amber-400/50 transition-all"
                [ngClass]="colorVariants[schedule.color || ''] || ''"
                [ngStyle]="!colorVariants[schedule.color || ''] ? getScheduleColorInlineStyle(schedule.color ?? '') : null"
              ><i class="pi pi-check text-xs"></i></span>
            </td>
            <td>{{ $any(schedule.entry_time) | time }}</td>
            <td>{{ $any(schedule.lunch_start_time) | time }}</td>
            <td>{{ $any(schedule.lunch_end_time) | time }}</td>
            <td>{{ $any(schedule.exit_time) | time }}</td>
            <td>{{ schedule.minutes_tolerance }} min.</td>
            <td class="text-center">
              @if(schedule.day_off) {
              <i class="pi pi-check-circle text-green-400 text-lg"></i>
              } @else {
              <i class="pi pi-times-circle text-red-400 text-lg"></i>
              }
            </td>
            <td>
              @if(dashboardStore.isAdmin() && !isBlockedManager()) {
              <div class="flex gap-1 items-center">
                <p-button severity="success" icon="pi pi-pen-to-square" text rounded size="small" (onClick)="editSchedule(schedule)" />
                <p-button severity="danger" icon="pi pi-trash" text rounded size="small" />
              </div>
              }
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  </p-card>
  }`,
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

  /** Gerentes y Sub Gerentes nunca pueden crear/editar horarios base, sin importar permisos. */
  isBlockedManager(): boolean {
    return isManagerPosition(this.dashboardStore.currentEmployee()?.position_id);
  }

  editSchedule(schedule?: Schedule) {
    if (this.isBlockedManager()) {
      this.message.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail: 'Gerentes y Sub Gerentes no pueden crear ni editar horarios base.',
      });
      return;
    }
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
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
      data: {
        schedule,
      },
    });
  }
}
