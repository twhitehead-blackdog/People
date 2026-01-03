import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { CalendarComponent, CalendarMarkerData } from '../../calendar.component';
import { PanamaDatePipe } from '../../pipes/panama-date.pipe';

@Component({
  selector: 'pt-employee-portal-timelogs',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    Button,
    TableModule,
    TooltipModule,
    CalendarComponent,
    PanamaDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-clock text-amber-400"></i>
            <span>Calendario de Marcaciones</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              [icon]="timelogViewMode === 'calendar' ? 'pi pi-table' : 'pi pi-calendar'"
              [label]="
                timelogViewMode === 'calendar' ? 'Vista Tabla' : 'Vista Calendario'
              "
              [outlined]="true"
              severity="secondary"
              size="small"
              (onClick)="toggleView()"
              [pTooltip]="
                timelogViewMode === 'calendar'
                  ? 'Cambiar a vista de tabla'
                  : 'Cambiar a vista de calendario'
              "
              tooltipPosition="left"
            />
          </div>
        </div>
      </ng-template>
      <ng-template #subtitle>
        {{
          timelogViewMode === 'calendar'
            ? 'Visualiza tus marcaciones en formato calendario'
            : 'Visualiza tus marcaciones en formato tabla'
        }}
      </ng-template>

      <div class="mt-2"></div>

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
                    [class.bg-green-500/20]="!!log.entry && !!log.exit"
                    [class.text-green-300]="!!log.entry && !!log.exit"
                    [class.bg-yellow-500/20]="!!log.entry && !log.exit"
                    [class.text-yellow-300]="!!log.entry && !log.exit"
                    [class.bg-red-500/20]="!!log.delay"
                    [class.text-red-300]="!!log.delay"
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

      <ng-template #timelogMarkerTemplate let-markers>
        <div class="flex flex-col gap-1.5 w-full h-full">
          @for (marker of markers; track marker.data.day) {
          @let log = marker.data;
          @let hasEntry = log?.entry;
          @let hasExit = log?.exit;
          @let hasLunchStart = log?.lunch_start;
          @let hasLunchEnd = log?.lunch_end;
          @let hasDelay = log?.delay && typeof log?.delay === 'number';
          @let workedHours =
            log?.entry && log?.exit
              ? calculateWorkedHours(
                  log.entry.date,
                  log.exit.date,
                  log.lunch_start?.date,
                  log.lunch_end?.date
                )
              : null;
          @let isComplete = hasEntry && hasExit;
          @let isIncomplete = hasEntry && !hasExit;

          <div
            class="flex flex-col gap-1 p-1.5 rounded-md shadow-sm border transition-all duration-200 w-full"
            [class.bg-gradient-to-br]="true"
            [class.from-green-600/30]="isComplete && !hasDelay"
            [class.to-green-500/20]="isComplete && !hasDelay"
            [class.from-yellow-600/30]="isIncomplete"
            [class.to-yellow-500/20]="isIncomplete"
            [class.from-red-600/30]="hasDelay"
            [class.to-red-500/20]="hasDelay"
            [class.border-green-400]="isComplete && !hasDelay"
            [class.border-yellow-400]="isIncomplete"
            [class.border-red-400]="hasDelay"
          >
            <div class="flex items-center justify-end mb-0.5">
              <div class="flex items-center gap-0.5">
                @if (isComplete) {
                <span
                  class="text-[8px] bg-green-500/50 text-white px-1 py-0.5 rounded font-semibold"
                >
                  ✓
                </span>
                } @else if (isIncomplete) {
                <span
                  class="text-[8px] bg-yellow-500/50 text-white px-1 py-0.5 rounded font-semibold"
                >
                  ⚠
                </span>
                }
                @if (hasDelay) {
                <span
                  class="text-[8px] bg-red-500/70 text-white px-1 py-0.5 rounded font-semibold"
                >
                  {{ log.delay }}m
                </span>
                }
              </div>
            </div>

            <div class="flex flex-col gap-1">
              @if (hasEntry) {
              <div class="flex items-center gap-1">
                <i class="pi pi-sign-in text-[9px] text-green-300"></i>
                <span class="text-[10px] text-white font-semibold">
                  {{ log.entry.date | panamaDate : 'HH:mm' }}
                </span>
              </div>
              }

              @if (hasLunchStart || hasLunchEnd) {
              <div class="flex items-center gap-1">
                <i class="pi pi-clock text-[9px] text-amber-300"></i>
                <span class="text-[10px] text-white">
                  @if (hasLunchStart && hasLunchEnd) {
                  {{ log.lunch_start.date | panamaDate : 'HH:mm' }}-
                  {{ log.lunch_end.date | panamaDate : 'HH:mm' }}
                  } @else if (hasLunchStart) {
                  {{ log.lunch_start.date | panamaDate : 'HH:mm' }}
                  } @else {
                  {{ log.lunch_end.date | panamaDate : 'HH:mm' }}
                  }
                </span>
              </div>
              }

              @if (hasExit) {
              <div class="flex items-center gap-1">
                <i class="pi pi-sign-out text-[9px] text-blue-300"></i>
                <span class="text-[10px] text-white font-semibold">
                  {{ log.exit.date | panamaDate : 'HH:mm' }}
                </span>
              </div>
              }

              @if (workedHours) {
              <div
                class="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-white/10"
              >
                <i class="pi pi-hourglass text-[9px] text-amber-400"></i>
                <span class="text-[9px] font-bold text-amber-300">{{ workedHours }}</span>
              </div>
              }
            </div>
          </div>
          }
        </div>
      </ng-template>
    </p-card>
  `,
})
export class EmployeePortalTimelogsComponent {
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
