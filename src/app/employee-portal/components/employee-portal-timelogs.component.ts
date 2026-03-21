import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { CalendarComponent, CalendarMarkerData } from '../../calendar.component';
import { PanamaDatePipe } from '../../pipes/panama-date.pipe';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-timelogs',
  standalone: true,
  imports: [
    CommonModule,
    Button,
    TableModule,
    TooltipModule,
    CalendarComponent,
    PanamaDatePipe,
  ],
  styles: [`
    .portal-timelogs-panel {
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="portal-timelogs-panel rounded-2xl p-5">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-500/12 flex items-center justify-center ring-1 ring-amber-500/15">
            <i class="pi pi-clock text-amber-400 text-sm"></i>
          </div>
          <div>
            <span class="text-sm font-bold text-white tracking-tight">Calendario de Marcaciones</span>
            <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">
              {{ timelogViewMode === 'calendar' ? 'Vista calendario' : 'Vista tabla' }}
            </p>
          </div>
        </div>
        <p-button
          [icon]="timelogViewMode === 'calendar' ? 'pi pi-table' : 'pi pi-calendar'"
          [label]="timelogViewMode === 'calendar' ? 'Vista Tabla' : 'Vista Calendario'"
          [outlined]="true"
          severity="secondary"
          size="small"
          (onClick)="toggleView()"
          [pTooltip]="timelogViewMode === 'calendar' ? 'Cambiar a vista de tabla' : 'Cambiar a vista de calendario'"
          tooltipPosition="left"
        />
      </div>
      <div class="mt-4"></div>

      @if (isLoading) {
      <div class="flex items-center justify-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
      </div>
      } @else {
        @if (timelogViewMode === 'calendar') {
        <pt-calendar
          [markers]="timelogMarkers"
          [markerTpl]="timelogMarkerTemplate"
          [currentDateInput]="calendarMonth"
          (monthChange)="handleMonthChange($event)"
        />
        } @else {
        <div class="overflow-x-auto">
          <p-table
            [value]="monthTimelogs"
            [rows]="25"
            [rowsPerPageOptions]="[10, 25, 50, 100]"
            paginator
            paginatorDropdownAppendTo="body"
            showGridlines
            stripedRows
            styleClass="p-datatable-sm"
            [scrollable]="true"
            scrollHeight="'calc(100vh - 400px)'"
          >
            <ng-template #header>
              <tr>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Inicio Almuerzo</th>
                <th>Fin Almuerzo</th>
                <th>Salida</th>
                <th>Horas Trabajadas</th>
                <th>Estado</th>
              </tr>
            </ng-template>
            <ng-template #body let-log>
              <tr>
                <td class="font-semibold">
                  {{ log.day | panamaDate : 'fullDate' }}
                </td>
                <td>
                  @if (log.entry) {
                  <div class="flex items-center gap-2">
                    <i class="pi pi-sign-in text-green-400"></i>
                    <span>{{ log.entry.date | panamaDate : 'HH:mm' }}</span>
                    @if (log.entry.branch) {
                    <span class="text-xs text-gray-400">
                      ({{ log.entry.branch.short_name || log.entry.branch.name }})
                    </span>
                    }
                  </div>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td>
                  @if (log.lunch_start) {
                  <span>
                    {{ log.lunch_start.date | panamaDate : 'HH:mm' }}
                  </span>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td>
                  @if (log.lunch_end) {
                  <span>{{ log.lunch_end.date | panamaDate : 'HH:mm' }}</span>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td>
                  @if (log.exit) {
                  <div class="flex items-center gap-2">
                    <i class="pi pi-sign-out text-blue-400"></i>
                    <span>{{ log.exit.date | panamaDate : 'HH:mm' }}</span>
                  </div>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td>
                  @if (log.entry && log.exit) {
                  <span class="font-semibold text-white">
                    {{ calculateWorkedHours(
                      log.entry.date,
                      log.exit.date,
                      log.lunch_start?.date,
                      log.lunch_end?.date
                    ) }}
                  </span>
                  } @else {
                  <span class="text-gray-400">-</span>
                  }
                </td>
                <td>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    [class.text-green-300]="!!log.entry && !!log.exit"
                    [class.text-yellow-300]="!!log.entry && !log.exit"
                    [class.text-red-300]="!!log.delay"
                    [ngClass]="{
                      'bg-green-500/20': !!log.entry && !!log.exit,
                      'bg-yellow-500/20': !!log.entry && !log.exit,
                      'bg-red-500/20': !!log.delay
                    }"
                  >
                    @if (log.delay) {
                      Retraso
                    } @else if (log.entry && log.exit) {
                      Cumplido
                    } @else {
                      Incompleto
                    }
                  </span>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="7">
                  <div
                    class="flex flex-col items-center justify-center gap-4 py-8"
                  >
                    <i class="pi pi-calendar-times text-4xl text-gray-500"></i>
                    <p class="text-gray-400">No hay marcaciones para este mes</p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        }
      }

    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="px-4 py-4">
      <!-- Header with view toggle -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar-clock text-amber-400"></i>
          <span class="text-sm font-semibold text-white">Marcaciones</span>
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-gray-300"
          style="-webkit-tap-highlight-color: transparent;"
          (click)="toggleView()"
        >
          <i [class]="timelogViewMode === 'calendar' ? 'pi pi-list' : 'pi pi-calendar'" class="text-xs"></i>
          {{ timelogViewMode === 'calendar' ? 'Lista' : 'Calendario' }}
        </button>
      </div>

      @if (isLoading) {
      <div class="flex items-center justify-center py-12">
        <i class="pi pi-spin pi-spinner text-3xl text-amber-400"></i>
      </div>
      } @else {
        @if (timelogViewMode === 'calendar') {
        <pt-calendar
          [markers]="timelogMarkers"
          [markerTpl]="timelogMarkerTemplate"
          [currentDateInput]="calendarMonth"
          (monthChange)="handleMonthChange($event)"
        />
        } @else {
        <!-- Mobile card list -->
        <div class="flex flex-col gap-2.5">
          @if (monthTimelogs.length > 0) {
            @for (log of monthTimelogs; track log.day) {
            <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-white">{{ log.day | panamaDate : 'fullDate' }}</span>
                <span
                  class="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-green-500/20 text-green-300': !!log.entry && !!log.exit,
                    'bg-yellow-500/20 text-yellow-300': !!log.entry && !log.exit,
                    'bg-red-500/20 text-red-300': !!log.delay
                  }"
                >
                  @if (log.delay) { Retraso }
                  @else if (log.entry && log.exit) { Cumplido }
                  @else if (log.entry) { Incompleto }
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center gap-1.5">
                  <i class="pi pi-sign-in text-green-400 text-xs"></i>
                  <span class="text-xs text-gray-300">
                    @if (log.entry) { {{ log.entry.date | panamaDate : 'HH:mm' }} } @else { -- }
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <i class="pi pi-sign-out text-blue-400 text-xs"></i>
                  <span class="text-xs text-gray-300">
                    @if (log.exit) { {{ log.exit.date | panamaDate : 'HH:mm' }} } @else { -- }
                  </span>
                </div>
              </div>
              @if (log.entry && log.exit) {
              <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-700/30">
                <i class="pi pi-hourglass text-amber-400 text-xs"></i>
                <span class="text-xs font-semibold text-amber-300">
                  {{ calculateWorkedHours(log.entry.date, log.exit.date, log.lunch_start?.date, log.lunch_end?.date) }}
                </span>
              </div>
              }
            </div>
            }
          } @else {
            <div class="flex flex-col items-center justify-center gap-3 py-8">
              <i class="pi pi-calendar-times text-3xl text-gray-500"></i>
              <p class="text-gray-400 text-sm">No hay marcaciones para este mes</p>
            </div>
          }
        </div>
        }
      }
    </div>
    }

    <!-- Shared calendar marker template (outside @if/@else) -->
    <ng-template #timelogMarkerTemplate let-markers>
      <div class="flex flex-col gap-1.5 w-full h-full">
        @for (marker of markers; track marker.data.day) {
        @let log = marker.data;
        @let hasEntry = log?.entry;
        @let hasExit = log?.exit;
        @let hasLunchStart = log?.lunch_start;
        @let hasLunchEnd = log?.lunch_end;
        @let hasDelay = log?.delay && typeof log?.delay === 'number';
        @let workedHours = log?.entry && log?.exit ? calculateWorkedHours(log.entry.date, log.exit.date, log.lunch_start?.date, log.lunch_end?.date) : null;
        @let isComplete = hasEntry && hasExit;
        @let isIncomplete = hasEntry && !hasExit;
        <div
          class="flex flex-col gap-1 p-1.5 rounded-md shadow-sm border transition-all duration-200 w-full bg-gradient-to-br"
          [ngClass]="{'from-green-600/30 to-green-500/20 border-green-400': isComplete && !hasDelay, 'from-yellow-600/30 to-yellow-500/20 border-yellow-400': isIncomplete, 'from-red-600/30 to-red-500/20 border-red-400': hasDelay}"
        >
          <div class="flex items-center justify-end mb-0.5">
            <div class="flex items-center gap-0.5">
              @if (isComplete) { <span class="text-[8px] bg-green-500/50 text-white px-1 py-0.5 rounded font-semibold">✓</span> }
              @else if (isIncomplete) { <span class="text-[8px] bg-yellow-500/50 text-white px-1 py-0.5 rounded font-semibold">⚠</span> }
              @if (hasDelay) { <span class="text-[8px] bg-red-500/70 text-white px-1 py-0.5 rounded font-semibold">{{ log.delay }}m</span> }
            </div>
          </div>
          <div class="flex flex-col gap-1">
            @if (hasEntry) {
            <div class="flex items-center gap-1"><i class="pi pi-sign-in text-[9px] text-green-300"></i><span class="text-[10px] text-white font-semibold">{{ log.entry.date | panamaDate : 'HH:mm' }}</span></div>
            }
            @if (hasLunchStart || hasLunchEnd) {
            <div class="flex items-center gap-1"><i class="pi pi-clock text-[9px] text-amber-300"></i><span class="text-[10px] text-white">
              @if (hasLunchStart && hasLunchEnd) { {{ log.lunch_start.date | panamaDate : 'HH:mm' }}-{{ log.lunch_end.date | panamaDate : 'HH:mm' }} }
              @else if (hasLunchStart) { {{ log.lunch_start.date | panamaDate : 'HH:mm' }} }
              @else { {{ log.lunch_end.date | panamaDate : 'HH:mm' }} }
            </span></div>
            }
            @if (hasExit) {
            <div class="flex items-center gap-1"><i class="pi pi-sign-out text-[9px] text-blue-300"></i><span class="text-[10px] text-white font-semibold">{{ log.exit.date | panamaDate : 'HH:mm' }}</span></div>
            }
            @if (workedHours) {
            <div class="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-white/10"><i class="pi pi-hourglass text-[9px] text-amber-400"></i><span class="text-[9px] font-bold text-amber-300">{{ workedHours }}</span></div>
            }
          </div>
        </div>
        }
      </div>
    </ng-template>
  `,
})
export class EmployeePortalTimelogsComponent {
  protected device = inject(DeviceService);
  @Input() isLoading = false;
  @Input() timelogViewMode: 'calendar' | 'table' = 'table';
  @Output() viewModeChange = new EventEmitter<'calendar' | 'table'>();
  @Input() monthTimelogs: any[] = [];
  @Input() timelogMarkers: CalendarMarkerData[] = [];
  @Input() calendarMonth = new Date();
  @Input()
  calculateWorkedHours: (
    entry: Date,
    exit: Date,
    lunchStart?: Date,
    lunchEnd?: Date
  ) => string = () => '-';
  @Output() monthChange = new EventEmitter<Date>();

  public toggleView(): void {
    const next = this.timelogViewMode === 'calendar' ? 'table' : 'calendar';
    this.viewModeChange.emit(next);
  }

  public handleMonthChange(date: Date): void {
    this.monthChange.emit(date);
  }
}
