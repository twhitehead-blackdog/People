import { CommonModule, NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  colorVariants,
  DayLog,
  EmployeeScheduleData,
  getScheduleColorInlineStyle as getColorStyle,
  OvertimeStatus,
} from '../../../models';
import { PanamaDatePipe } from '../../../pipes/panama-date.pipe';
import {
  formatHours,
  getAlertIcon,
  getAlertSeverity,
  getAlertTooltip,
} from '../utils/alert.utils';
import { TimelogPhotoDialogComponent } from './timelog-photo-dialog.component';

@Component({
  selector: 'pt-timelogs-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    Tag,
    Avatar,
    Button,
    TooltipModule,
    NgClass,
    NgStyle,
    PanamaDatePipe,
    TimelogPhotoDialogComponent,
  ],
  template: `
    <!-- Mobile card view -->
    <div class="md:hidden">
      @if (isInitialLoading) {
        <!-- Skeleton placeholders durante la primera carga -->
        <div class="flex flex-col gap-2 px-2 pt-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="rounded-lg bg-neutral-800/40 animate-pulse h-20"></div>
          }
        </div>
      } @else if (isLoading) {
        <div class="flex flex-col items-center justify-center py-12 gap-3">
          <i class="pi pi-spin pi-spinner text-2xl text-amber-400"></i>
          <span class="text-sm text-gray-400">Cargando marcaciones…</span>
        </div>
      } @else if (logs().length === 0) {
        <div class="mobile-empty-state">
          <i class="pi pi-search mobile-empty-state__icon"></i>
          <p class="mobile-empty-state__title">Sin marcaciones</p>
          <p class="mobile-empty-state__desc">
            Ajusta los filtros o limpia para ver todo el período.
          </p>
          <p-button
            label="Limpiar filtros"
            icon="pi pi-filter-slash"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="clearFiltersRequested.emit()"
            styleClass="mt-3"
          />
        </div>
      } @else {
        <div class="mobile-card-list pb-2">
          @for (log of logs(); track (log.employee?.id ?? '_') + ':' + log.day) {
            <div class="mobile-card-item" style="flex-direction:column;align-items:stretch;gap:0.4rem;padding:0.6rem 0.75rem;">
              <!-- Row 1: Employee + Day -->
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:0.35rem;min-width:0;flex:1;">
                  <span class="text-[10px] font-mono text-gray-500">{{ log.employee.employee_number }}</span>
                  <button
                    type="button"
                    class="mobile-card-item__title hover:text-amber-300 transition-colors"
                    style="font-size:0.75rem;text-align:left;background:none;border:0;padding:0;color:inherit;"
                    (click)="employeeClicked.emit(log.employee.id)"
                  >{{ log.employee.first_name }} {{ log.employee.father_name }}</button>
                </div>
                <button
                  type="button"
                  class="text-[10px] text-gray-500 shrink-0 hover:text-amber-300 transition-colors"
                  style="background:none;border:0;padding:0;cursor:pointer;"
                  (click)="dayClicked.emit(log)"
                >{{ log.day | panamaDate : 'shortDate' }}</button>
              </div>
              <!-- Row 2: Schedule + Alert -->
              <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;">
                @if (log.scheduleError) {
                  <span class="rounded text-[10px] px-1.5 py-0.5 font-semibold inline-flex items-center gap-1 ring-1 ring-red-500/60"
                    [ngClass]="getScheduleColor(log) && colorVariants[getScheduleColor(log)!] ? colorVariants[getScheduleColor(log)!] : 'bg-neutral-700 text-gray-300'"
                    [ngStyle]="getScheduleColor(log) && !colorVariants[getScheduleColor(log)!] ? getScheduleColorInlineStyle(getScheduleColor(log)!) : null"
                  >
                    {{ log.schedule?.schedule?.name || 'Sin horario' }}
                    <i class="pi pi-exclamation-triangle text-red-400 text-[9px]"></i>
                  </span>
                } @else if (!log.schedule) {
                  <span class="rounded text-[10px] px-1.5 py-0.5 font-semibold bg-red-500/20 text-red-400 inline-flex items-center gap-1">
                    <i class="pi pi-exclamation-triangle text-[9px]"></i>
                    Sin horario
                  </span>
                } @else {
                  <span class="rounded text-[10px] px-1.5 py-0.5 font-semibold"
                    [ngClass]="getScheduleColor(log) && colorVariants[getScheduleColor(log)!] ? colorVariants[getScheduleColor(log)!] : 'bg-neutral-700 text-gray-400'"
                    [ngStyle]="getScheduleColor(log) && !colorVariants[getScheduleColor(log)!] ? getScheduleColorInlineStyle(getScheduleColor(log)!) : null"
                  >{{ log.schedule!.schedule!.name }}</span>
                  @if (log.alert) {
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      [ngClass]="{'bg-red-500/20 text-red-400': log.alert === 'Falta' || log.alert === 'Aus. Injustificada', 'bg-yellow-500/20 text-yellow-400': log.alert === 'Feriado' || log.alert === 'Día Libre', 'bg-blue-500/20 text-blue-400': log.alert === 'Permiso' || log.alert === 'Justificada', 'bg-pink-500/20 text-pink-400': log.alert === 'Cert. Médico', 'bg-amber-500/20 text-amber-400': true}"
                    >{{ log.alert }}</span>
                  }
                }
              </div>
              <!-- Row 3: Entry/Exit times + Hours -->
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;gap:0.75rem;align-items:center;">
                  <div class="flex flex-col items-center">
                    <span class="text-[8px] text-gray-600 uppercase">Ent</span>
                    <span class="text-[11px] font-semibold" [ngClass]="log.delay ? 'text-red-400' : log.withinTolerance ? 'text-sky-400' : 'text-green-400'" [pTooltip]="log.withinTolerance ? 'Dentro de tolerancia' : undefined">{{ log.entry?.date | panamaDate : 'hh:mm a' }}</span>
                  </div>
                  @if (log.lunch_start) {
                  <div class="flex flex-col items-center">
                    <span class="text-[8px] text-gray-600 uppercase">Alm</span>
                    <span class="text-[11px] text-gray-400">{{ log.lunch_start.date | panamaDate : 'hh:mm' }}-{{ log.lunch_end?.date | panamaDate : 'hh:mm' }}</span>
                  </div>
                  }
                  <div class="flex flex-col items-center">
                    <span class="text-[8px] text-gray-600 uppercase">Sal</span>
                    <span class="text-[11px] font-semibold" [ngClass]="log.earlyExit ? 'text-red-400' : 'text-white'">{{ log.exit?.date | panamaDate : 'hh:mm a' }}</span>
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[8px] text-gray-600 uppercase">Horas</span>
                  <span class="text-xs font-bold" [ngClass]="(log.totalHours ?? 0) >= (log.requiredHours ?? 8) ? 'text-green-400' : (log.totalHours ?? 0) > 0 ? 'text-amber-400' : 'text-gray-600'">{{ log.totalHours ? formatHours(log.totalHours) : '-' }}</span>
                </div>
              </div>
              <!-- Row 4: Tags (delay, lunch exceeded, overtime, shift mismatch) -->
              @if (log.delay || log.lunchExceeded || log.overtimeHours || log.shiftMismatch) {
              <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
                @if (log.shiftMismatch) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full" [pTooltip]="'Turno asignado: ' + log.expectedScheduleName" tooltipPosition="top">⚠ Turno incorrecto</span>
                }
                @if (log.delay) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full">Retraso {{ log.delay }}min</span>
                }
                @if (log.lunchExceeded && log.lunchMinutes) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded-full">Almuerzo +{{ log.lunchMinutes - 60 }}min</span>
                }
                @if (log.overtimeHours) {
                  <span class="text-[9px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400 rounded-full">Extra {{ log.overtimeHours }}</span>
                }
              </div>
              }
            </div>
          }
        </div>
      }
    </div>
    <!-- Desktop table view -->
    <div class="hidden md:block overflow-x-auto" [class.timelogs-compact]="density === 'compact'">
      <p-table
        [value]="logs()"
        [rows]="isMobile() ? 10 : 25"
        [rowsPerPageOptions]="[10, 25, 50, 100, 200]"
        paginator
        paginatorDropdownAppendTo="body"
        showGridlines
        stripedRows
        [loading]="isLoading"
        [scrollable]="true"
        [scrollHeight]="isMobile() ? 'calc(100dvh - 350px)' : 'calc(100dvh - 400px)'"
        styleClass="min-w-[1200px] md:min-w-full"
        responsiveLayout="scroll"
        [rowTrackBy]="trackDayLog"
      >
        <ng-template #header>
          <tr>
            <th class="min-w-[180px]">Empleado</th>
            <th class="min-w-[120px]">Día</th>
            <th class="min-w-[120px]">Horario</th>
            <th class="min-w-[140px]">Entrada</th>
            <th class="min-w-[140px]">Inicio Alm.</th>
            <th class="min-w-[140px]">Fin Alm.</th>
            <th class="min-w-[120px]">Salida</th>
            <th class="min-w-[120px]">Horas</th>
            <th class="min-w-[100px]">Extras</th>
          </tr>
        </ng-template>
        <ng-template #body let-log>
          <tr
            [ngClass]="{
              'bg-amber-50/10': log.alert,
              'bg-red-50/10': log.scheduleError
            }"
          >
            <td>
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span
                    *ngIf="log.employee.employee_number"
                    class="text-xs text-gray-400 font-mono"
                    >{{ log.employee.employee_number }}</span
                  >
                  <button
                    type="button"
                    class="text-left hover:text-amber-300 hover:underline transition-colors"
                    [pTooltip]="'Click para filtrar solo ' + log.employee.first_name + ' ' + log.employee.father_name"
                    tooltipPosition="top"
                    (click)="employeeClicked.emit(log.employee.id)"
                  >{{ log.employee.first_name }} {{ log.employee.father_name }}</button>
                  <p-tag
                    *ngIf="!log.scheduleError && log.alert"
                    [value]="log.alert"
                    [severity]="alertSeverity(log.alert)"
                    [icon]="alertIcon(log.alert)"
                    [pTooltip]="alertTooltip(log.alert)"
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxEmployeeTagWidth,
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  ></p-tag>
                </div>
              </div>
            </td>
            <td>
              <button
                type="button"
                class="hover:text-amber-300 hover:underline transition-colors"
                style="background:none;border:0;padding:0;color:inherit;cursor:pointer;"
                [pTooltip]="'Ver detalle completo del día'"
                tooltipPosition="top"
                (click)="dayClicked.emit(log)"
              >{{ log.day | panamaDate : 'mediumDate' }}</button>
            </td>
            <td>
              <span
                *ngIf="log.scheduleError; else scheduleCell"
                class="relative rounded text-sm px-2 py-1 font-semibold inline-flex items-center justify-center gap-1 ring-1 ring-red-500/60"
                [ngClass]="
                  log.schedule?.schedule?.color && colorVariants[log.schedule!.schedule!.color!]
                    ? colorVariants[log.schedule!.schedule!.color!]
                    : 'bg-neutral-700 text-gray-300'
                "
                [ngStyle]="
                  log.schedule?.schedule?.color && !colorVariants[log.schedule!.schedule!.color!]
                    ? getScheduleColorInlineStyle(log.schedule!.schedule!.color!)
                    : null
                "
                [style]="{
                  'min-width': maxScheduleBadgeWidth,
                  'text-align': 'center'
                }"
                [pTooltip]="
                  (log.alert ? log.alert + ': ' : '') +
                  'El empleado trabajó pero está marcado como feriado/día libre. El gerente debe corregir la configuración.'
                "
                tooltipPosition="top"
              >
                {{ log.schedule?.schedule?.name || 'Sin horario' }}
                <i class="pi pi-exclamation-triangle text-red-400 text-[10px] flex-shrink-0"></i>
              </span>
              <ng-template #scheduleCell>
                <span
                  *ngIf="!log.schedule; else scheduleCellAssigned"
                  class="rounded text-sm px-2 py-1 font-semibold inline-flex items-center justify-center gap-1 bg-red-500/20 text-red-400"
                  [style]="{
                    'min-width': maxScheduleBadgeWidth,
                    'text-align': 'center'
                  }"
                  [pTooltip]="'No hay horario asignado para este empleado en este día. El gerente debe asignar un horario en Turnos.'"
                  tooltipPosition="top"
                >
                  <i class="pi pi-exclamation-triangle text-[10px] flex-shrink-0"></i>
                  Sin horario
                </span>
              </ng-template>
              <ng-template #scheduleCellAssigned>
                <span
                  class="rounded text-sm px-2 py-1 font-semibold inline-flex items-center justify-center gap-1"
                  [ngClass]="
                    (log.schedule?.schedule?.color &&
                    colorVariants[log.schedule.schedule.color]
                      ? colorVariants[log.schedule.schedule.color]
                      : '') +
                    (log.schedule && log.schedule.approved === false
                      ? ' opacity-60'
                      : '')
                  "
                  [ngStyle]="
                    log.schedule?.schedule?.color &&
                    !colorVariants[log.schedule.schedule.color]
                      ? getScheduleColorInlineStyle(log.schedule.schedule.color)
                      : null
                  "
                  [style]="{
                    'min-width': maxScheduleBadgeWidth,
                    'text-align': 'center'
                  }"
                  [pTooltip]="scheduleTooltip(log.schedule)"
                  tooltipPosition="top"
                >
                  {{ log.schedule!.schedule!.name }}
                  <i
                    *ngIf="log.schedule && log.schedule.approved === false"
                    class="pi pi-exclamation-circle text-yellow-200 text-[10px] animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                  ></i>
                  <i
                    *ngIf="log.schedule && log.schedule.approved === true"
                    class="pi pi-check-circle text-green-400 text-[10px] flex-shrink-0"
                  ></i>
                </span>
              </ng-template>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <p-avatar
                  *ngIf="log.entry"
                  class="cursor-pointer"
                  shape="circle"
                  [label]="log.entry?.branch.short_name"
                  [pTooltip]="log.entry?.branch.name"
                  tooltipPosition="top"
                ></p-avatar>
                <span
                  [ngClass]="{
                    'text-red-500 font-semibold': log.delay,
                    'text-sky-500 font-semibold': !log.delay && log.withinTolerance
                  }"
                  [pTooltip]="log.withinTolerance ? 'Dentro de tolerancia' : undefined"
                  >{{ log.entry?.date | panamaDate : 'hh:mm a' }}</span
                >
                <i *ngIf="log.entry?.is_manual"
                   class="pi pi-pencil text-amber-400 text-[11px] ml-1"
                   [pTooltip]="'Manual: ' + (log.entry?.manual_reason ?? 'sin motivo')"
                   tooltipPosition="top"></i>
                <i *ngIf="log.entry?.invalid_ip"
                   class="pi pi-exclamation-triangle text-orange-400 text-[11px] ml-1"
                   [pTooltip]="'IP inválida: ' + (log.entry?.ip ?? '—')"
                   tooltipPosition="top"></i>
                <button *ngIf="hasPhoto(log.entry)"
                   type="button"
                   class="tl-photo-btn"
                   (click)="openPhoto(log.entry?.id, 'Entrada', log.employee.first_name + ' ' + log.employee.father_name)"
                   pTooltip="Ver foto de la marcación"
                   tooltipPosition="top">
                  <i class="pi pi-camera"></i>
                </button>
                <p-tag
                  *ngIf="log.delay"
                  [value]="'Retraso de ' + log.delay + ' min'"
                  severity="danger"
                  icon="pi pi-clock"
                  [pTooltip]="
                    'El empleado llegó ' +
                    log.delay +
                    ' minutos después de la tolerancia permitida (' +
                    delayToleranceMinutes() +
                    ' min)'
                  "
                  tooltipPosition="top"
                  [style]="{
                    'min-width': maxDelayTagWidth,
                    display: 'inline-block',
                    'text-align': 'center'
                  }"
                  styleClass="ml-2"
                ></p-tag>
                <p-tag
                  *ngIf="log.shiftMismatch"
                  value="Turno incorrecto"
                  severity="warn"
                  icon="pi pi-exclamation-triangle"
                  [pTooltip]="'Marcó fuera del turno asignado: ' + log.expectedScheduleName + '. La entrada no coincide con el horario (diferencia > 2h).'"
                  tooltipPosition="top"
                  styleClass="ml-2"
                ></p-tag>
              </div>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <p-avatar
                  *ngIf="log.lunch_start"
                  class="cursor-pointer"
                  shape="circle"
                  [label]="log.lunch_start?.branch.short_name"
                  [pTooltip]="log.lunch_start?.branch.name"
                  tooltipPosition="top"
                ></p-avatar>
                {{ log.lunch_start?.date | panamaDate : 'hh:mm a' }}
                <i *ngIf="log.lunch_start?.is_manual"
                   class="pi pi-pencil text-amber-400 text-[11px] ml-1"
                   [pTooltip]="'Manual: ' + (log.lunch_start?.manual_reason ?? 'sin motivo')"></i>
                <i *ngIf="log.lunch_start?.invalid_ip"
                   class="pi pi-exclamation-triangle text-orange-400 text-[11px] ml-1"
                   [pTooltip]="'IP inválida: ' + (log.lunch_start?.ip ?? '—')"></i>
                <button *ngIf="hasPhoto(log.lunch_start)"
                   type="button"
                   class="tl-photo-btn"
                   (click)="openPhoto(log.lunch_start?.id, 'Inicio almuerzo', log.employee.first_name + ' ' + log.employee.father_name)"
                   pTooltip="Ver foto de la marcación"
                   tooltipPosition="top">
                  <i class="pi pi-camera"></i>
                </button>
              </div>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <p-avatar
                  *ngIf="log.lunch_end"
                  class="cursor-pointer"
                  shape="circle"
                  [label]="log.lunch_end?.branch.short_name"
                  [pTooltip]="log.lunch_end?.branch.name"
                  tooltipPosition="top"
                ></p-avatar>
                <span
                  [ngClass]="{
                    'text-red-500 font-semibold': log.lunchExceeded
                  }"
                  >{{ log.lunch_end?.date | panamaDate : 'hh:mm a' }}</span
                >
                <i *ngIf="log.lunch_end?.is_manual"
                   class="pi pi-pencil text-amber-400 text-[11px] ml-1"
                   [pTooltip]="'Manual: ' + (log.lunch_end?.manual_reason ?? 'sin motivo')"></i>
                <i *ngIf="log.lunch_end?.invalid_ip"
                   class="pi pi-exclamation-triangle text-orange-400 text-[11px] ml-1"
                   [pTooltip]="'IP inválida: ' + (log.lunch_end?.ip ?? '—')"></i>
                <button *ngIf="hasPhoto(log.lunch_end)"
                   type="button"
                   class="tl-photo-btn"
                   (click)="openPhoto(log.lunch_end?.id, 'Fin almuerzo', log.employee.first_name + ' ' + log.employee.father_name)"
                   pTooltip="Ver foto de la marcación"
                   tooltipPosition="top">
                  <i class="pi pi-camera"></i>
                </button>
                <p-tag
                  *ngIf="log.lunchExceeded && log.lunchMinutes"
                  [value]="'Almuerzo +' + (log.lunchMinutes - 60) + ' min'"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                  [pTooltip]="
                    'El tiempo de almuerzo excede los 60 minutos permitidos por ' +
                    (log.lunchMinutes - 60) +
                    ' minutos'
                  "
                  tooltipPosition="top"
                  [style]="{
                    'min-width': maxLunchTagWidth,
                    display: 'inline-block',
                    'text-align': 'center'
                  }"
                  styleClass="ml-2"
                ></p-tag>
              </div>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <p-avatar
                  *ngIf="log.exit"
                  shape="circle"
                  [label]="log.exit?.branch.short_name"
                  [pTooltip]="log.exit?.branch.name"
                  tooltipPosition="top"
                ></p-avatar>
                <span
                  [ngClass]="{
                    'text-red-500 font-semibold': log.earlyExit
                  }"
                  >{{ log.exit?.date | panamaDate : 'hh:mm a' }}</span
                >
                <i *ngIf="log.exit?.is_manual"
                   class="pi pi-pencil text-amber-400 text-[11px] ml-1"
                   [pTooltip]="'Manual: ' + (log.exit?.manual_reason ?? 'sin motivo')"
                   tooltipPosition="top"></i>
                <i *ngIf="log.exit?.invalid_ip"
                   class="pi pi-exclamation-triangle text-orange-400 text-[11px] ml-1"
                   [pTooltip]="'IP inválida: ' + (log.exit?.ip ?? '—')"
                   tooltipPosition="top"></i>
                <button *ngIf="hasPhoto(log.exit)"
                   type="button"
                   class="tl-photo-btn"
                   (click)="openPhoto(log.exit?.id, 'Salida', log.employee.first_name + ' ' + log.employee.father_name)"
                   pTooltip="Ver foto de la marcación"
                   tooltipPosition="top">
                  <i class="pi pi-camera"></i>
                </button>
                <p-tag
                  *ngIf="log.earlyExit"
                  value="Salida temprana"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                  [pTooltip]="
                    'El empleado salió antes del horario laboral establecido'
                  "
                  tooltipPosition="top"
                  [style]="{
                    'min-width': maxExitTagWidth,
                    display: 'inline-block',
                    'text-align': 'center'
                  }"
                  styleClass="ml-2"
                ></p-tag>
                <p-tag
                  *ngIf="log.compensatoryHours"
                  [value]="'Compensatorio ' + log.compensatoryHours + 'h'"
                  severity="info"
                  icon="pi pi-clock"
                  [pTooltip]="
                    'Compensatorio por horas aprobado: ' +
                    log.compensatoryHours +
                    ' hora(s). Salida permitida ' +
                    log.compensatoryHours +
                    'h antes del horario.'
                  "
                  tooltipPosition="top"
                  styleClass="ml-2"
                ></p-tag>
              </div>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <span
                  [ngClass]="{
                    'text-red-500 font-semibold': log.insufficientHours,
                    'text-green-500 font-semibold':
                      !log.insufficientHours && log.totalHours
                  }"
                >
                  {{ log.totalHours ? formatHours(log.totalHours) : '-' }}
                </span>
                <p-tag
                  *ngIf="log.insufficientHours"
                  value="Horas insuficientes"
                  severity="danger"
                  icon="pi pi-clock"
                  [pTooltip]="
                    'El empleado no cumplió las horas de trabajo requeridas según su horario (sin contar el tiempo de almuerzo)'
                  "
                  tooltipPosition="top"
                  [style]="{
                    'min-width': maxHoursTagWidth,
                    display: 'inline-block',
                    'text-align': 'center'
                  }"
                  styleClass="ml-2"
                ></p-tag>
              </div>
            </td>
            <td>
              <div class="flex gap-2 items-center">
                <span [ngClass]="getOvertimeValueClass(log)">
                  {{ log.overtimeHours ? formatHours(log.overtimeHours) : '-' }}
                </span>
                <!-- Overtime Action Button (Admin only, when overtime > 0) -->
                @if (canShowOvertimeButton(log)) {
                <p-button
                  [icon]="getOvertimeStatusIcon(log)"
                  [severity]="getOvertimeStatusSeverity(log)"
                  (onClick)="onOvertimeAction(log)"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  [pTooltip]="getOvertimeTooltip(log)"
                  tooltipPosition="top"
                />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          @if (isInitialLoading || isLoading) {
            <tr>
              <td colspan="9" class="!py-12">
                <div class="flex flex-col items-center justify-center gap-3 text-center">
                  <i class="pi pi-spin pi-spinner text-3xl text-amber-400"></i>
                  <p class="text-base font-semibold text-gray-200 m-0">
                    Cargando marcaciones…
                  </p>
                  <p class="text-sm text-gray-500 m-0 max-w-md">
                    Procesando logs, horarios, permisos y horas extras del período seleccionado.
                  </p>
                </div>
              </td>
            </tr>
          } @else {
            <tr>
              <td colspan="9" class="!py-12">
                <div class="flex flex-col items-center justify-center gap-3 text-center">
                  <div class="w-16 h-16 rounded-full bg-neutral-800/60 flex items-center justify-center">
                    <i class="pi pi-search text-2xl text-gray-500"></i>
                  </div>
                  <div class="flex flex-col gap-1">
                    <p class="text-base font-semibold text-gray-200 m-0">
                      Sin marcaciones para los filtros actuales
                    </p>
                    <p class="text-sm text-gray-500 m-0 max-w-md">
                      Prueba ampliar el rango de fechas, quitar la sucursal
                      seleccionada o limpiar los filtros para ver todas las
                      marcaciones del período.
                    </p>
                  </div>
                  <p-button
                    label="Limpiar filtros"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    [outlined]="true"
                    (onClick)="clearFiltersRequested.emit()"
                    styleClass="mt-2"
                  />
                </div>
              </td>
            </tr>
          }
        </ng-template>
      </p-table>
    </div>

    <!-- Dialogo de foto de marcación facial -->
    <pt-timelog-photo-dialog
      [(visible)]="photoDialogVisible"
      [timelogId]="selectedTimelogIdForPhoto()"
      [title]="photoDialogTitle()"
      (closed)="onPhotoDialogClosed()"
    />
  `,
  styles: [`
    .tl-photo-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-left: 4px;
      padding: 0;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.32);
      color: #60a5fa;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tl-photo-btn:hover {
      background: rgba(59, 130, 246, 0.22);
      transform: translateY(-1px);
    }
    .tl-photo-btn i { font-size: 11px; }

    /* Densidad compacta: reduce padding de celdas, fuente ligeramente menor.
       Permite ver ~50% más filas por pantalla sin cambiar el layout. */
    :host ::ng-deep .timelogs-compact .p-datatable .p-datatable-thead > tr > th,
    :host ::ng-deep .timelogs-compact .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.35rem 0.5rem !important;
      font-size: 0.8rem;
    }
    :host ::ng-deep .timelogs-compact .p-datatable .p-avatar {
      width: 1.4rem !important;
      height: 1.4rem !important;
      font-size: 0.7rem;
    }
    :host ::ng-deep .timelogs-compact .p-datatable .p-tag {
      padding: 0.15rem 0.4rem !important;
      font-size: 0.7rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsTableComponent {
  // Mobile detection
  public isMobile = signal(window.innerWidth < 768);

  // ─── Photo dialog (marcación facial) ───────────────────────
  public photoDialogVisible = signal(false);
  public selectedTimelogIdForPhoto = signal<string | null>(null);
  public photoDialogTitle = signal('Foto de marcación');

  /** Muestra el modal con la foto de un punch específico (entry/exit/lunch). */
  public openPhoto(timelogId: string | undefined, label: string, employeeName?: string): void {
    if (!timelogId) return;
    this.selectedTimelogIdForPhoto.set(timelogId);
    this.photoDialogTitle.set(employeeName ? `${employeeName} — ${label}` : `Foto: ${label}`);
    this.photoDialogVisible.set(true);
  }

  public onPhotoDialogClosed(): void {
    this.selectedTimelogIdForPhoto.set(null);
  }

  /** Helper: ¿este punch tiene foto disponible? (auth_method === 'face') */
  public hasPhoto(punch: any | undefined): boolean {
    return !!punch && punch.auth_method === 'face';
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  @Input() public logs!: Signal<DayLog[]>;
  @Input() public isLoading = false;
  /** True solo en la primera carga (cuando no hay datos aún). Activa
   *  skeleton/placeholder en vez del empty state. */
  @Input() public isInitialLoading = false;
  @Input() public delayToleranceMinutes!: WritableSignal<number>;
  @Input() public employeeId!: WritableSignal<string | undefined>;
  @Input() public maxEmployeeTagWidth!: string;
  @Input() public maxScheduleBadgeWidth!: string;
  @Input() public maxDelayTagWidth!: string;
  @Input() public maxLunchTagWidth!: string;
  @Input() public maxExitTagWidth!: string;
  @Input() public maxHoursTagWidth!: string;
  @Input() public isAdmin = false;
  /** Densidad visual de la tabla. 'compact' reduce el padding de las celdas. */
  @Input() public density: 'normal' | 'compact' = 'normal';

  // Output for overtime action button click
  public overtimeAction = output<DayLog>();
  /** Emitido cuando el usuario hace clic en "Limpiar filtros" desde el empty state. */
  public clearFiltersRequested = output<void>();
  /** Emitido cuando el usuario hace clic en el nombre de un empleado. El padre
   *  lo setea como filtro. */
  public employeeClicked = output<string | undefined>();
  /** Emitido cuando el usuario hace clic en el día → abre drill-down modal. */
  public dayClicked = output<DayLog>();

  public colorVariants = colorVariants;
  public alertSeverity = getAlertSeverity;
  public alertIcon = getAlertIcon;
  public alertTooltip = getAlertTooltip;
  public formatHours = formatHours;

  /**
   * Track-by para `p-table` y `@for` mobile: identidad estable
   * `${empId}:${day}`. Antes la mobile usaba `$index` que reciclaba mal las
   * cards al filtrar; ahora cada fila mantiene su DOM si su DayLog persiste.
   */
  public trackDayLog = (_: number, log: DayLog): string =>
    `${log.employee?.id ?? '_'}:${log.day}`;

  public scheduleTooltip(
    schedule: EmployeeScheduleData | undefined
  ): string | undefined {
    if (schedule && schedule.approved === false) {
      return 'Horario pendiente de aprobación';
    }
    return undefined;
  }

  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }

  /** Helper para evitar warnings NG8107 en templates con cadenas opcionales largas. */
  public getScheduleColor(log: DayLog): string | undefined {
    return log.schedule?.schedule?.color ?? undefined;
  }

  // Overtime button visibility - only for admins when overtime > 0
  public canShowOvertimeButton(log: DayLog): boolean {
    return this.isAdmin && !!log.overtimeHours && log.overtimeHours > 0;
  }

  // Get overtime status from record or default to pending
  private getOvertimeStatus(log: DayLog): OvertimeStatus {
    return log.overtimeRecord?.status ?? 'pending';
  }

  // Icon based on overtime status
  public getOvertimeStatusIcon(log: DayLog): string {
    const status = this.getOvertimeStatus(log);
    switch (status) {
      case 'confirmed':
        return 'pi pi-check-circle';
      case 'rejected':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-clock';
    }
  }

  // Severity based on overtime status
  public getOvertimeStatusSeverity(
    log: DayLog
  ): 'success' | 'danger' | 'warn' | 'secondary' {
    const status = this.getOvertimeStatus(log);
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warn';
    }
  }

  // Tooltip based on overtime status
  public getOvertimeTooltip(log: DayLog): string {
    const status = this.getOvertimeStatus(log);
    switch (status) {
      case 'confirmed':
        return 'Horas extras confirmadas - Click para ver detalles';
      case 'rejected':
        return 'Horas extras rechazadas - Click para ver detalles';
      default:
        return 'Horas extras pendientes de revisión - Click para confirmar';
    }
  }

  // Value styling based on overtime status
  public getOvertimeValueClass(log: DayLog): Record<string, boolean> {
    const status = this.getOvertimeStatus(log);
    const hasOvertime = !!(log.overtimeHours && log.overtimeHours > 0);

    return {
      'text-green-500 font-semibold': hasOvertime && status === 'confirmed',
      'text-amber-400 font-semibold': hasOvertime && status === 'pending',
      'text-red-400 line-through': hasOvertime && status === 'rejected',
      'text-gray-400': !hasOvertime,
    };
  }

  // Emit overtime action for parent to handle
  public onOvertimeAction(log: DayLog): void {
    this.overtimeAction.emit(log);
  }
}
