import { DatePipe, NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  colorVariants,
  Employee,
  getScheduleColorInlineStyle,
} from '../../../../models';

@Component({
  selector: 'pt-branch-manager-timelogs-tab',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    NgStyle,
    FormsModule,
    Avatar,
    Button,
    DatePicker,
    Select,
    TableModule,
    Tag,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 md:space-y-5">
      <!-- Filtros y acciones -->
      <div
        class="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl"
      >
        <div class="flex gap-2 md:gap-3 items-center flex-wrap w-full md:w-auto">
          <div class="relative w-full sm:w-auto">
            <i
              class="pi pi-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
            ></i>
            <p-select
              [options]="branchEmployees()"
              optionLabel="short_name"
              optionValue="id"
              [(ngModel)]="selectedEmployeeId"
              placeholder="Filtrar por empleado"
              showClear
              filter
              appendTo="body"
              styleClass="w-full sm:w-64 pl-8"
            />
          </div>
          <div class="relative w-full sm:w-auto">
            <p-datepicker
              [(ngModel)]="selectedDate"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Fecha"
              appendTo="body"
              (onSelect)="refresh.emit()"
              styleClass="rounded-xl w-full sm:w-auto"
            />
          </div>
        </div>
        <p-button
          icon="pi pi-refresh"
          [label]="isMobile() ? undefined : 'Actualizar'"
          [outlined]="true"
          severity="secondary"
          (onClick)="refresh.emit()"
          [loading]="isLoading()"
          styleClass="rounded-xl w-full md:w-auto"
        />
      </div>

      <!-- Estadísticas del día -->
      @if (todayStats().totalEmployees > 0) {
      <div class="flex flex-wrap gap-2 md:gap-3 pb-2 md:pb-4">
        <div
          class="flex items-center gap-2 md:gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-emerald-500/20"
        >
          <div
            class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
          >
            <i class="pi pi-check text-emerald-400 text-xs md:text-sm"></i>
          </div>
          <div>
            <span class="text-base md:text-lg font-bold text-emerald-400">{{
              todayStats().onTime
            }}</span>
            <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">A tiempo</span>
          </div>
        </div>
        <div
          class="flex items-center gap-2 md:gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-rose-500/20"
        >
          <div
            class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0"
          >
            <i class="pi pi-clock text-rose-400 text-xs md:text-sm"></i>
          </div>
          <div>
            <span class="text-base md:text-lg font-bold text-rose-400">{{
              todayStats().delayed
            }}</span>
            <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Retrasos</span>
          </div>
        </div>
        <div
          class="flex items-center gap-2 md:gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-amber-500/20"
        >
          <div
            class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"
          >
            <i
              class="pi pi-exclamation-triangle text-amber-400 text-xs md:text-sm"
            ></i>
          </div>
          <div>
            <span class="text-base md:text-lg font-bold text-amber-400">{{
              todayStats().missing
            }}</span>
            <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Sin marcar</span>
          </div>
        </div>
        <div
          class="flex items-center gap-2 md:gap-2.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-orange-500/20"
        >
          <div
            class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0"
          >
            <i class="pi pi-stopwatch text-orange-400 text-xs md:text-sm"></i>
          </div>
          <div>
            <span class="text-base md:text-lg font-bold text-orange-400">{{
              todayStats().lunchExceeded
            }}</span>
            <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Almuerzo</span>
          </div>
        </div>
        <div
          class="flex items-center gap-2 md:gap-2.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-violet-500/20"
        >
          <div
            class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0"
          >
            <i class="pi pi-sign-out text-violet-400 text-xs md:text-sm"></i>
          </div>
          <div>
            <span class="text-base md:text-lg font-bold text-violet-400">{{
              todayStats().earlyExit
            }}</span>
            <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline"
              >Salida temp.</span
            >
          </div>
        </div>
      </div>
      }

      <!-- Mobile card view -->
      @if (isMobile()) {
        @if (isLoading()) {
          <div class="mobile-card-list">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="mobile-card-item" style="pointer-events: none">
                <div class="mobile-card-item__avatar" style="background: rgba(255,255,255,0.05); animation: pulse 1.5s infinite"></div>
                <div class="mobile-card-item__body">
                  <div style="height: 0.875rem; width: 60%; background: rgba(255,255,255,0.05); border-radius: 0.25rem; animation: pulse 1.5s infinite"></div>
                  <div style="height: 0.75rem; width: 40%; background: rgba(255,255,255,0.05); border-radius: 0.25rem; margin-top: 0.375rem; animation: pulse 1.5s infinite"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredTimelogs().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-clock mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay marcaciones</p>
            <p class="mobile-empty-state__desc">No se encontraron registros para esta fecha</p>
          </div>
        } @else {
          <div class="mobile-section-header">
            <span class="mobile-section-header__title">Marcaciones del día</span>
            <span class="mobile-section-header__count">{{ filteredTimelogs().length }}</span>
          </div>
          <div class="mobile-card-list">
            @for (log of filteredTimelogs(); track log.employee?.id || $index) {
              <div
                class="mobile-card-item"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
                [ngClass]="{
                  'border-l-3 border-l-red-500': log.is_delayed || log.is_missing || log.lunch_exceeded || log.is_early_exit,
                  'border-l-3 border-l-emerald-500': !log.is_delayed && !log.is_missing && !log.lunch_exceeded && !log.is_early_exit && log.entry_time
                }"
              >
                <!-- Avatar -->
                <p-avatar
                  [label]="getEmployeeInitials(log.employee)"
                  shape="circle"
                  styleClass="bg-blue-600 flex-shrink-0"
                  [style]="{ width: '2.75rem', height: '2.75rem' }"
                />

                <!-- Body -->
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">
                    {{ log.employee?.first_name }} {{ log.employee?.father_name }}
                  </div>

                  <!-- Schedule -->
                  <div class="mobile-card-item__subtitle">
                    @if (log.schedule?.name) {
                      <span
                        class="rounded text-[0.625rem] px-1.5 py-px font-semibold inline-flex items-center"
                        [ngClass]="
                          log.schedule?.color && colorVariants[log.schedule.color]
                            ? colorVariants[log.schedule.color]
                            : 'bg-neutral-700 text-gray-300'
                        "
                        [ngStyle]="
                          log.schedule?.color && !colorVariants[log.schedule.color]
                            ? getScheduleStyle(log.schedule.color)
                            : null
                        "
                      >{{ log.schedule.name }}</span>
                    } @else {
                      <span class="text-gray-500 text-[0.625rem]">Sin horario</span>
                    }
                  </div>

                  <!-- Time row -->
                  <div class="flex items-center gap-3 mt-1.5 text-xs">
                    <!-- Entry -->
                    <div class="flex items-center gap-1">
                      <i class="pi pi-sign-in text-[0.625rem] text-gray-500"></i>
                      @if (log.entry_time) {
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_delayed,
                            'text-emerald-400': !log.is_delayed
                          }"
                        >{{ log.entry_time | date : 'hh:mm a' }}</span>
                      } @else {
                        <span class="text-gray-500">--:--</span>
                      }
                    </div>

                    <span class="text-gray-600">|</span>

                    <!-- Exit -->
                    <div class="flex items-center gap-1">
                      <i class="pi pi-sign-out text-[0.625rem] text-gray-500"></i>
                      @if (log.exit_time) {
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_early_exit,
                            'text-purple-400': !log.is_early_exit
                          }"
                        >{{ log.exit_time | date : 'hh:mm a' }}</span>
                      } @else {
                        <span class="text-gray-500">--:--</span>
                      }
                    </div>

                    <!-- Lunch (collapsed) -->
                    @if (log.lunch_start_time || log.lunch_end_time) {
                      <span class="text-gray-600">|</span>
                      <div class="flex items-center gap-1">
                        <i class="pi pi-stopwatch text-[0.625rem] text-gray-500"></i>
                        <span [ngClass]="{'text-red-400 font-semibold': log.lunch_exceeded, 'text-gray-400': !log.lunch_exceeded}">
                          {{ log.lunch_start_time ? (log.lunch_start_time | date : 'hh:mm') : '--' }}
                          -
                          {{ log.lunch_end_time ? (log.lunch_end_time | date : 'hh:mm') : '--' }}
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Status tags -->
                  <div class="mobile-card-item__meta">
                    @if (log.is_delayed) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--danger">Retraso</span>
                    } @else if (log.is_missing && !log.is_day_off) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--warning">Sin marcar</span>
                    } @else if (log.lunch_exceeded) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--danger">Almuerzo excedido</span>
                    } @else if (log.is_early_exit) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--danger">Salida temprana</span>
                    } @else if (log.entry_time) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--success">A tiempo</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
      <!-- Desktop table view -->
      <p-table
        [value]="filteredTimelogs()"
        [loading]="isLoading()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10, 25, 50]"
        styleClass="p-datatable-sm"
        [scrollable]="true"
        scrollHeight="600px"
        responsiveLayout="scroll"
      >
        <ng-template #header>
          <tr class="bg-white/5">
            <th
              style="min-width: 200px"
              class="font-semibold text-gray-300"
            >
              Empleado
            </th>
            <th
              style="min-width: 140px"
              class="font-semibold text-gray-300"
            >
              Horario
            </th>
            <th
              style="min-width: 140px"
              class="font-semibold text-gray-300"
            >
              Entrada
            </th>
            <th
              style="min-width: 140px"
              class="font-semibold text-gray-300"
            >
              Inicio Almuerzo
            </th>
            <th
              style="min-width: 140px"
              class="font-semibold text-gray-300"
            >
              Fin Almuerzo
            </th>
            <th
              style="min-width: 140px"
              class="font-semibold text-gray-300"
            >
              Salida
            </th>
            <th
              style="min-width: 150px"
              class="font-semibold text-gray-300"
            >
              Estado
            </th>
          </tr>
        </ng-template>
        <ng-template #body let-log>
          <tr
            [ngClass]="{
              'bg-red-50/5':
                log.is_delayed ||
                log.is_missing ||
                log.lunch_exceeded ||
                log.is_early_exit,
              'bg-green-50/5':
                !log.is_delayed &&
                !log.is_missing &&
                !log.lunch_exceeded &&
                !log.is_early_exit &&
                log.entry_time
            }"
          >
            <td>
              <div class="flex items-center gap-3">
                <p-avatar
                  [label]="getEmployeeInitials(log.employee)"
                  shape="circle"
                  styleClass="bg-blue-600"
                />
                <span class="font-semibold">
                  {{ log.employee?.first_name }}
                  {{ log.employee?.father_name }}
                </span>
              </div>
            </td>
            <td>
              @if (log.schedule?.name) {
              <span
                class="rounded text-xs px-2 py-0.5 font-semibold inline-flex items-center justify-center gap-1"
                [ngClass]="
                  log.schedule?.color &&
                  colorVariants[log.schedule.color]
                    ? colorVariants[log.schedule.color]
                    : 'bg-neutral-700 text-gray-300'
                "
                [ngStyle]="
                  log.schedule?.color &&
                  !colorVariants[log.schedule.color]
                    ? getScheduleStyle(log.schedule.color)
                    : null
                "
              >
                {{ log.schedule.name }}
              </span>
              } @else {
              <span
                class="rounded text-xs px-2 py-0.5 bg-neutral-600 text-gray-400"
              >
                Sin horario
              </span>
              }
            </td>
            <td>
              @if (log.entry_time) {
              <div class="flex items-center gap-2">
                @if (log.entry_branch) {
                <p-avatar
                  shape="circle"
                  [label]="log.entry_branch.short_name"
                  [pTooltip]="log.entry_branch.name"
                  tooltipPosition="top"
                  styleClass="text-xs"
                  size="normal"
                />
                }
                <span
                  [ngClass]="{
                    'text-red-400 font-semibold': log.is_delayed,
                    'text-green-400': !log.is_delayed
                  }"
                >
                  {{ log.entry_time | date : 'hh:mm a' }}
                </span>
              </div>
              } @else {
              <span class="text-gray-500 flex items-center gap-2">
                <i class="pi pi-times"></i>
                Sin entrada
              </span>
              }
            </td>
            <td>
              @if (log.lunch_start_time) {
              <div class="flex items-center gap-2">
                @if (log.lunch_start_branch) {
                <p-avatar
                  shape="circle"
                  [label]="log.lunch_start_branch.short_name"
                  [pTooltip]="log.lunch_start_branch.name"
                  tooltipPosition="top"
                  styleClass="text-xs"
                  size="normal"
                />
                }
                <span>{{
                  log.lunch_start_time | date : 'hh:mm a'
                }}</span>
              </div>
              } @else {
              <span class="text-gray-500">-</span>
              }
            </td>
            <td>
              @if (log.lunch_end_time) {
              <div class="flex items-center gap-2">
                @if (log.lunch_end_branch) {
                <p-avatar
                  shape="circle"
                  [label]="log.lunch_end_branch.short_name"
                  [pTooltip]="log.lunch_end_branch.name"
                  tooltipPosition="top"
                  styleClass="text-xs"
                  size="normal"
                />
                }
                <span
                  [ngClass]="{
                    'text-red-400 font-semibold': log.lunch_exceeded
                  }"
                >
                  {{ log.lunch_end_time | date : 'hh:mm a' }}
                </span>
              </div>
              } @else {
              <span class="text-gray-500">-</span>
              }
            </td>
            <td>
              @if (log.exit_time) {
              <div class="flex items-center gap-2">
                @if (log.exit_branch) {
                <p-avatar
                  shape="circle"
                  [label]="log.exit_branch.short_name"
                  [pTooltip]="log.exit_branch.name"
                  tooltipPosition="top"
                  styleClass="text-xs"
                  size="normal"
                />
                }
                <span
                  [ngClass]="{
                    'text-red-400 font-semibold': log.is_early_exit,
                    'text-purple-400': !log.is_early_exit
                  }"
                >
                  {{ log.exit_time | date : 'hh:mm a' }}
                </span>
              </div>
              } @else {
              <span class="text-gray-500 flex items-center gap-2">
                <i class="pi pi-times"></i>
                Sin salida
              </span>
              }
            </td>
            <td>
              <div class="flex gap-1 flex-wrap">
                @if (log.is_delayed) {
                <p-tag
                  value="Retraso"
                  severity="danger"
                  icon="pi pi-clock"
                  styleClass="text-xs"
                />
                } @else if (log.is_missing && !log.is_day_off) {
                <p-tag
                  value="Sin marcar"
                  severity="warn"
                  icon="pi pi-exclamation-triangle"
                  styleClass="text-xs"
                />
                } @else if (log.lunch_exceeded) {
                <p-tag
                  value="Almuerzo excedido"
                  severity="danger"
                  icon="pi pi-clock"
                  styleClass="text-xs"
                />
                } @else if (log.is_early_exit) {
                <p-tag
                  value="Salida temprana"
                  severity="danger"
                  icon="pi pi-arrow-down"
                  styleClass="text-xs"
                />
                } @else if (log.entry_time) {
                <p-tag
                  value="A tiempo"
                  severity="success"
                  icon="pi pi-check"
                  styleClass="text-xs"
                />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="7" class="text-center py-16">
              <div class="flex flex-col items-center gap-4">
                <div
                  class="w-20 h-20 rounded-2xl bg-gray-500/10 flex items-center justify-center"
                >
                  <i class="pi pi-clock text-3xl text-gray-500"></i>
                </div>
                <div>
                  <p class="text-gray-300 text-lg font-medium mb-1">
                    No hay marcaciones
                  </p>
                  <p class="text-gray-500 text-sm">
                    No se encontraron registros para esta fecha
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
      }
    </div>
  `,
})
export class BranchManagerTimelogsTabComponent {
  // Inputs
  public filteredTimelogs = input.required<any[]>();
  public todayStats = input.required<{
    totalEmployees: number;
    onTime: number;
    delayed: number;
    missing: number;
    lunchExceeded: number;
    earlyExit: number;
  }>();
  public isLoading = input<boolean>(false);
  public branchEmployees = input.required<any[]>();
  public isMobile = input<boolean>(false);

  // Two-way bindings
  public selectedDate = model.required<Date>();
  public selectedEmployeeId = model<string | null>(null);

  // Outputs
  public refresh = output<void>();

  // Local references
  public colorVariants = colorVariants;

  public getScheduleStyle(color: string | undefined | null) {
    return getScheduleColorInlineStyle(color);
  }

  public getEmployeeInitials(
    employee?: Employee | { first_name?: string; father_name?: string }
  ): string {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }
}
