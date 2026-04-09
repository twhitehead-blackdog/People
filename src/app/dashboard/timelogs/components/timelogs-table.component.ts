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
  ],
  template: `
    <!-- Mobile card view -->
    <div class="md:hidden">
      @if (isLoading) {
        <div class="flex justify-center py-8"><i class="pi pi-spin pi-spinner text-xl text-amber-400"></i></div>
      } @else if (logs().length === 0) {
        <div class="mobile-empty-state">
          <i class="pi pi-clock mobile-empty-state__icon"></i>
          <p class="mobile-empty-state__title">Sin marcaciones</p>
          <p class="mobile-empty-state__desc">Ajusta los filtros o fechas</p>
        </div>
      } @else {
        <div class="mobile-card-list pb-2">
          @for (log of logs(); track $index) {
            <div class="mobile-card-item" style="flex-direction:column;align-items:stretch;gap:0.4rem;padding:0.6rem 0.75rem;">
              <!-- Row 1: Employee + Day -->
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:0.35rem;min-width:0;flex:1;">
                  <span class="text-[10px] font-mono text-gray-500">{{ log.employee.employee_number }}</span>
                  <span class="mobile-card-item__title" style="font-size:0.75rem;">{{ log.employee.first_name }} {{ log.employee.father_name }}</span>
                </div>
                <span class="text-[10px] text-gray-500 shrink-0">{{ log.day | panamaDate : 'shortDate' }}</span>
              </div>
              <!-- Row 2: Schedule + Alert -->
              <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;">
                <span class="rounded text-[10px] px-1.5 py-0.5 font-semibold"
                  [ngClass]="log.schedule?.schedule?.color && colorVariants[log.schedule!.schedule!.color!] ? colorVariants[log.schedule!.schedule!.color!] : 'bg-neutral-700 text-gray-400'"
                  [ngStyle]="log.schedule?.schedule?.color && !colorVariants[log.schedule!.schedule!.color!] ? getScheduleColorInlineStyle(log.schedule!.schedule!.color!) : null"
                >{{ log?.schedule?.schedule?.name || 'Sin horario' }}</span>
                @if (log.alert) {
                  <span class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                    [ngClass]="{'bg-red-500/20 text-red-400': log.alert === 'Falta' || log.alert === 'Aus. Injustificada', 'bg-yellow-500/20 text-yellow-400': log.alert === 'Feriado' || log.alert === 'Día Libre', 'bg-blue-500/20 text-blue-400': log.alert === 'Permiso' || log.alert === 'Justificada', 'bg-pink-500/20 text-pink-400': log.alert === 'Cert. Médico', 'bg-amber-500/20 text-amber-400': true}"
                  >{{ log.alert }}</span>
                }
              </div>
              <!-- Row 3: Entry/Exit times + Hours -->
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;gap:0.75rem;align-items:center;">
                  <div class="flex flex-col items-center">
                    <span class="text-[8px] text-gray-600 uppercase">Ent</span>
                    <span class="text-[11px] font-semibold" [ngClass]="log.delay ? 'text-red-400' : 'text-green-400'">{{ log.entry?.date | panamaDate : 'hh:mm a' }}</span>
                  </div>
                  @if (log.lunch_start) {
                  <div class="flex flex-col items-center">
                    <span class="text-[8px] text-gray-600 uppercase">Alm</span>
                    <span class="text-[11px] text-gray-400">{{ log.lunch_start?.date | panamaDate : 'hh:mm' }}-{{ log.lunch_end?.date | panamaDate : 'hh:mm' }}</span>
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
              <!-- Row 4: Tags (delay, lunch exceeded, overtime) -->
              @if (log.delay || log.lunchExceeded || log.overtimeHours) {
              <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
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
    <div class="hidden md:block overflow-x-auto">
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
                  {{ log.employee.first_name }} {{ log.employee.father_name }}
                  <p-tag
                    *ngIf="log.scheduleError"
                    value="Error de Horario"
                    severity="danger"
                    icon="pi pi-exclamation-triangle"
                    [pTooltip]="
                      log.alert +
                      ': El empleado trabajó pero está marcado como feriado/día libre. No hay horario válido para estas marcaciones. El gerente debe corregir la configuración.'
                    "
                    tooltipPosition="top"
                    [style]="{
                      'min-width': maxEmployeeTagWidth,
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                    styleClass="ml-2"
                  ></p-tag>
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
            <td>{{ log.day | panamaDate : 'mediumDate' }}</td>
            <td>
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
                {{ log?.schedule?.schedule?.name || 'Sin horario' }}
                <i
                  *ngIf="log.schedule && log.schedule.approved === false"
                  class="pi pi-exclamation-circle text-yellow-200 text-[10px] animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                ></i>
                <i
                  *ngIf="log.schedule && log.schedule.approved === true"
                  class="pi pi-check-circle text-green-400 text-[10px] flex-shrink-0"
                ></i>
              </span>
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
                    'text-red-500 font-semibold': log.delay
                  }"
                  >{{ log.entry?.date | panamaDate : 'hh:mm a' }}</span
                >
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
          <tr>
            <td colspan="9">
              <div class="flex flex-col items-center justify-center gap-4">
                <p>No se encontraron registros</p>
                <p-button
                  label="Limpiar"
                  icon="pi pi-refresh"
                  (click)="employeeId.set('')"
                />
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsTableComponent {
  // Mobile detection
  public isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  @Input() public logs!: Signal<DayLog[]>;
  @Input() public isLoading = false;
  @Input() public delayToleranceMinutes!: WritableSignal<number>;
  @Input() public employeeId!: WritableSignal<string | undefined>;
  @Input() public maxEmployeeTagWidth!: string;
  @Input() public maxScheduleBadgeWidth!: string;
  @Input() public maxDelayTagWidth!: string;
  @Input() public maxLunchTagWidth!: string;
  @Input() public maxExitTagWidth!: string;
  @Input() public maxHoursTagWidth!: string;
  @Input() public isAdmin = false;

  // Output for overtime action button click
  public overtimeAction = output<DayLog>();

  public colorVariants = colorVariants;
  public alertSeverity = getAlertSeverity;
  public alertIcon = getAlertIcon;
  public alertTooltip = getAlertTooltip;
  public formatHours = formatHours;

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
