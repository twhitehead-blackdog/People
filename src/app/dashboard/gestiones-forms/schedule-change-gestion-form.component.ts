import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  format,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isToday as dateFnsIsToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Popover } from 'primeng/popover';
import { firstValueFrom } from 'rxjs';
import { colorVariants, Employee, Schedule } from '../../models';
import {
  ScheduleChangeRequestService,
  ScheduleChangeRequestType,
} from '../../services/schedule-change-request.service';
import { ScheduleLockService } from '../../services/schedule-lock.service';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { notifyBranchManagers } from '../../utils/manager-notification.utils';
import { EmployeeNotificationService } from '../../services/employee-notification.service';
import { resolveEmployeeScheduleForDate } from '../../utils/employee-schedule.utils';

interface DayColumn {
  date: Date;
  dateStr: string;
}

// Key: "employeeId|dateStr"
type ChangeKey = string;

interface ChangeEntry {
  employeeId: string;
  employeeName: string;
  dateStr: string;
  dayLabel: string;
  currentScheduleId: string | null;
  currentScheduleName: string | null;
  proposedScheduleId: string | null;
  proposedScheduleName: string | null;
  employeeScheduleId: string | null;
  action: ScheduleChangeRequestType;
}

@Component({
  selector: 'pt-schedule-change-gestion-form',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Textarea, Popover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Header con navegación de semana -->
      <div class="flex items-center justify-between bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar-clock text-rose-400"></i>
          <span class="text-sm font-semibold text-white">Semana</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="w-8 h-8 rounded-lg bg-neutral-700 border border-neutral-600 text-gray-300 flex items-center justify-center hover:bg-neutral-600 transition-colors"
            (click)="previousWeek()"
          >
            <i class="pi pi-chevron-left text-xs"></i>
          </button>
          <span class="text-sm text-gray-300 font-medium min-w-[160px] text-center">{{ weekLabel() }}</span>
          <button
            class="w-8 h-8 rounded-lg bg-neutral-700 border border-neutral-600 text-gray-300 flex items-center justify-center hover:bg-neutral-600 transition-colors"
            (click)="nextWeek()"
          >
            <i class="pi pi-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <!-- Lock status -->
      @if (!isCurrentWeekLocked()) {
        <div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
          <i class="pi pi-unlock text-green-400 flex-shrink-0"></i>
          <span class="text-sm text-green-300">
            Esta semana está abierta — puedes editar directamente en
            <button
              class="underline font-medium hover:text-green-200 transition-colors"
              (click)="navigateToTurnos()"
            >Turnos</button>.
          </span>
        </div>
      } @else {
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
          <i class="pi pi-lock text-amber-400 flex-shrink-0"></i>
          <span class="text-sm text-amber-300">
            Semana bloqueada ({{ blockedRangeLabel() }}) — selecciona solo los empleados/cargos aplicables y envía la solicitud.
            <span class="ml-2 text-green-200/80">Trabajar en: {{ workRangeLabel() }}</span>
          </span>
        </div>
      }

      <!-- Guidance / rules -->
      <div class="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-3">
        <div class="flex items-start gap-2">
          <i class="pi pi-info-circle text-cyan-300 text-sm mt-0.5"></i>
          <div class="text-xs text-gray-300 space-y-1">
            <div class="font-semibold text-white">Cómo usar “Cambio de Horario”</div>
            <div>- Haz click en una celda para marcar el cambio (crear/modificar/eliminar).</div>
            <div>- Los cargos no aplicables aparecen deshabilitados (no generan solicitud).</div>
            <div>- Antes de enviar: revisa la lista de cambios y escribe una razón clara.</div>
          </div>
        </div>
      </div>

      <!-- Grilla -->
      @if (loading()) {
        <div class="flex justify-center py-10">
          <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        </div>
      } @else {
        <!-- Desktop: tabla completa -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full" style="min-width: 50rem">
            <thead>
              <tr class="border-b border-neutral-700/50">
                <th class="text-left py-2 px-2 text-xs text-gray-500 font-medium min-w-[110px] sticky left-0 bg-neutral-900 z-10">Cargo</th>
                <th class="text-left py-2 px-2 text-xs text-gray-500 font-medium min-w-[140px]">Nombre</th>
                @for (day of days(); track day.dateStr) {
                  <th class="text-center py-2 px-1 min-w-[100px]">
                    <div class="flex flex-col items-center leading-tight">
                      <span class="text-xs font-bold uppercase" [class]="isToday(day.date) ? 'text-amber-400' : 'text-gray-400'">
                        {{ day.date | date : 'EEE' }}
                      </span>
                      <span class="text-[10px] text-gray-500">{{ day.date | date : 'd MMM' }}</span>
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (emp of employeeRows(); track emp.id) {
                <tr class="border-b border-neutral-800/40 hover:bg-neutral-800/20" [class.opacity-60]="isCurrentWeekLocked() && !emp.isEligible">
                  <td class="py-1.5 px-2 text-xs whitespace-nowrap sticky left-0 bg-neutral-900 z-10"
                      [class.text-gray-500]="isCurrentWeekLocked() && !emp.isEligible"
                      [class.text-gray-300]="!isCurrentWeekLocked() || emp.isEligible"
                  >
                    @if (isCurrentWeekLocked() && emp.isEligible) {
                      <i class="pi pi-lock text-amber-400 text-[10px] mr-1"></i>
                    }
                    {{ emp.position }}
                  </td>
                  <td class="py-1.5 px-2 text-xs text-white whitespace-nowrap">{{ emp.first_name }} {{ emp.father_name }}</td>
                  @for (day of days(); track day.dateStr) {
                    <td class="text-center py-1.5 px-1">
                      <ng-container *ngTemplateOutlet="cellTpl; context: { emp: emp, day: day }" />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile: cards por empleado -->
        <div class="md:hidden space-y-2">
          @for (emp of employeeRows(); track emp.id) {
            <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/40 overflow-hidden">
              <div class="px-3 py-2 bg-neutral-700/20 border-b border-neutral-700/30 flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span class="text-[10px] font-bold text-amber-400">{{ emp.first_name.charAt(0) }}{{ emp.father_name.charAt(0) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-[13px] font-semibold text-white m-0 truncate">{{ emp.first_name }} {{ emp.father_name }}</p>
                  <p class="text-[10px] m-0 truncate" [class.text-gray-500]="isCurrentWeekLocked() && !emp.isEligible" [class.text-amber-300]="isCurrentWeekLocked() && emp.isEligible" [class.text-gray-400]="!isCurrentWeekLocked()">
                    @if (isCurrentWeekLocked() && emp.isEligible) { <i class="pi pi-lock text-amber-400 text-[9px] mr-1"></i> }
                    {{ emp.position }}
                  </p>
                </div>
              </div>
              <div class="flex overflow-x-auto py-2 px-2 gap-1.5" style="-webkit-overflow-scrolling: touch; scrollbar-width: none;">
                @for (day of days(); track day.dateStr) {
                  <div class="flex-shrink-0 w-[62px] text-center">
                    <div class="text-[9px] text-gray-500 uppercase font-medium mb-0.5">{{ day.date | date : 'EEE' }}</div>
                    <div class="text-[11px] font-semibold mb-1" [class]="isToday(day.date) ? 'text-amber-400' : 'text-gray-400'">{{ day.date | date : 'd' }}</div>
                    <ng-container *ngTemplateOutlet="cellTpl; context: { emp: emp, day: day }" />
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Cambios marcados + razón por cambio -->
      @if (pendingChanges().length > 0) {
        <div class="bg-neutral-800/50 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-amber-400"></i>
            <span class="text-sm font-semibold text-white">{{ pendingChanges().length }} cambio(s) marcados</span>
          </div>
          <div class="space-y-3">
            @for (change of pendingChanges(); track change.employeeId + change.dateStr) {
              <div class="bg-neutral-900/40 rounded-lg p-2.5 space-y-1.5">
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-gray-300 font-medium w-32 flex-shrink-0 truncate">{{ change.employeeName }}</span>
                  <span class="text-gray-500 w-20 flex-shrink-0 capitalize">{{ change.dayLabel }}</span>
                  @if (change.action === 'create') {
                    <span class="text-green-400">+</span>
                    <span class="text-gray-300">{{ change.proposedScheduleName }}</span>
                  } @else if (change.action === 'delete') {
                    <span class="text-red-400">×</span>
                    <span class="text-gray-500 line-through">{{ change.currentScheduleName }}</span>
                  } @else {
                    <span class="text-gray-500 line-through">{{ change.currentScheduleName }}</span>
                    <i class="pi pi-arrow-right text-gray-600 text-[9px]"></i>
                    <span class="text-amber-400 font-medium">{{ change.proposedScheduleName }}</span>
                  }
                  <button class="ml-auto text-gray-600 hover:text-red-400 transition-colors" (click)="removeChange(change.employeeId, change.dateStr)">
                    <i class="pi pi-times text-[10px]"></i>
                  </button>
                </div>
                <div>
                  <label class="text-[10px] text-gray-500 mb-0.5 block">Razón <span class="text-red-400">*</span></label>
                  <textarea
                    pInputTextarea
                    [ngModel]="getChangeReason(change.employeeId, change.dateStr)"
                    (ngModelChange)="setChangeReason(change.employeeId, change.dateStr, $event)"
                    placeholder="Explica el motivo de este cambio..."
                    rows="1"
                    class="w-full text-xs"
                  ></textarea>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Botones -->
      <div class="flex justify-between pt-2">
        <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()" />
        @if (canSubmit()) {
          <p-button
            [label]="'Enviar ' + pendingChanges().length + ' solicitud(es)'"
            icon="pi pi-send"
            [loading]="submitting()"
            (onClick)="submitRequests()"
            severity="success"
          />
        }
      </div>
    </div>

    <!-- Cell template -->
    <ng-template #cellTpl let-emp="emp" let-day="day">
      @if (getScheduleForCell(emp.id, day.dateStr); as sch) {
        <div
          class="w-full flex gap-0.5 py-0.5 px-1 rounded-sm font-medium items-center justify-center text-[11px] transition-all duration-200 border shadow-sm overflow-hidden min-h-[24px] relative"
          [class]="getCellClasses(emp.id, day.dateStr, sch.schedule?.color)"
          [class.cursor-pointer]="canInteractEmployee(emp)"
          [class.cursor-not-allowed]="isCurrentWeekLocked() && !emp.isEligible"
          [class.opacity-60]="isCurrentWeekLocked() && !emp.isEligible"
          [class.hover:scale-105]="canInteractEmployee(emp)"
          [class.hover:shadow-md]="canInteractEmployee(emp)"
          [attr.title]="isCurrentWeekLocked() && !emp.isEligible ? 'Este cargo no requiere solicitud de cambio de horario.' : null"
          (click)="canInteractEmployee(emp) ? onCellClick($event, emp, day, sch) : null"
        >
          @if (hasChange(emp.id, day.dateStr)) {
            <i class="pi pi-pencil text-[7px] absolute -top-0.5 -right-0.5 bg-amber-500 text-black rounded-full w-3 h-3 flex items-center justify-center"></i>
          }
          <span class="truncate font-semibold leading-tight min-w-0">{{ sch.schedule?.name }}</span>
        </div>
      } @else {
        @if (isCurrentWeekLocked()) {
          <div
            class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed min-w-[40px] min-h-[24px] w-full cursor-pointer transition-all hover:border-amber-400 hover:text-amber-400"
            [class]="hasChange(emp.id, day.dateStr) ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-neutral-600 text-neutral-500'"
            [class.cursor-not-allowed]="!emp.isEligible"
            [class.opacity-60]="!emp.isEligible"
            [attr.title]="!emp.isEligible ? 'Este cargo no requiere solicitud de cambio de horario.' : null"
            (click)="emp.isEligible ? onEmptyCellClick($event, emp, day) : null"
          >
            @if (getChangeName(emp.id, day.dateStr); as name) {
              <span class="text-[9px] font-medium truncate">{{ name }}</span>
            } @else {
              <span>—</span>
            }
          </div>
        } @else {
          <div class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed border-neutral-600 text-neutral-500 min-w-[40px] min-h-[24px]">
            —
          </div>
        }
      }
    </ng-template>

    <!-- Popover para seleccionar horario -->
    <p-popover #schedulePopover>
      <div class="w-56">
        <span class="text-xs text-gray-400 block mb-2">{{ popoverLabel() }}</span>
        <div class="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
          @for (sch of scheduleOptions(); track sch.id) {
            <button
              class="text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 hover:bg-neutral-700/50"
              [class]="popoverSelectedId() === sch.id ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40' : 'text-gray-300'"
              (click)="selectSchedule(sch); schedulePopover.hide()"
            >
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" [class]="getColorDot(sch.color)"></div>
              <span class="truncate text-xs">{{ sch.name }}</span>
            </button>
          }
          @if (popoverHasCurrent()) {
            <div class="border-t border-neutral-700/50 mt-1 pt-1">
              <button
                class="text-left px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 w-full flex items-center gap-2"
                (click)="selectDelete(); schedulePopover.hide()"
              >
                <i class="pi pi-trash text-[10px]"></i> Eliminar horario
              </button>
            </div>
          }
          @if (hasChange(popoverEmployeeId(), popoverDateStr())) {
            <div class="border-t border-neutral-700/50 mt-1 pt-1">
              <button
                class="text-left px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-neutral-700/30 w-full flex items-center gap-2"
                (click)="removeChange(popoverEmployeeId(), popoverDateStr()); schedulePopover.hide()"
              >
                <i class="pi pi-undo text-[10px]"></i> Deshacer cambio
              </button>
            </div>
          }
        </div>
      </div>
    </p-popover>
  `,
})
export class ScheduleChangeGestionFormComponent implements OnInit {
  private changeRequestService = inject(ScheduleChangeRequestService);
  private scheduleLockService = inject(ScheduleLockService);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private router = inject(Router);
  private notificationService = inject(EmployeeNotificationService);

  @ViewChild('schedulePopover') schedulePopover!: Popover;

  // Inputs
  public branchEmployees = input.required<(Employee & { short_name?: string })[]>();
  public currentEmployee = input.required<Employee>();
  public schedules = input.required<Schedule[]>();
  public branchId = input<string | null>(null);

  // Outputs
  public back = output<void>();
  public requestCreated = output<void>();

  // State
  public currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  public loading = signal(false);
  public allSchedulesForWeek = signal<any[]>([]);
  public changes = signal<Map<ChangeKey, { scheduleId: string | null; action: ScheduleChangeRequestType }>>(new Map());
  public changeReasons = signal<Map<ChangeKey, string>>(new Map());
  public submitting = signal(false);

  // Popover state
  public popoverEmployeeId = signal('');
  public popoverDateStr = signal('');
  public popoverLabel = signal('');
  public popoverHasCurrent = signal(false);
  public popoverSelectedId = signal<string | null>(null);

  public colorVariants = colorVariants;

  ngOnInit(): void {
    this.scheduleLockService.loadSettings();
    this.loadWeekSchedules();
  }

  // Computeds
  public scheduleOptions = computed(() => this.schedules().filter(s => s.name));

  public isCurrentWeekLocked = computed(() =>
    this.scheduleLockService.isWeekLocked(this.currentWeekStart())
  );

  private lockCycleRanges = computed(() => {
    const settings = this.scheduleLockService.settings();
    const ws = this.currentWeekStart();
    if (!settings?.reference_date) {
      const we = addDays(ws, 6);
      return {
        blockedStart: ws,
        blockedEnd: we,
        workStart: addDays(we, 1),
        workEnd: addDays(we, 14),
      };
    }

    const refDate = new Date(`${settings.reference_date}T00:00:00`);
    const cycleDays = (settings.lock_cycle_weeks ?? 2) * 7;
    const daysDiff = Math.floor(
      (ws.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const periodIndex = daysDiff < 0 ? 0 : Math.floor(daysDiff / cycleDays);
    const blockedStart = addDays(refDate, periodIndex * cycleDays);
    const blockedEnd = addDays(blockedStart, cycleDays - 1);
    const workStart = addDays(blockedEnd, 1);
    const workEnd = addDays(workStart, cycleDays - 1);
    return { blockedStart, blockedEnd, workStart, workEnd };
  });

  public blockedRangeLabel = computed(() => {
    const r = this.lockCycleRanges();
    return `${format(r.blockedStart, 'dd MMM', { locale: es })} — ${format(
      r.blockedEnd,
      'dd MMM yyyy',
      { locale: es }
    )}`;
  });

  public workRangeLabel = computed(() => {
    const r = this.lockCycleRanges();
    return `${format(r.workStart, 'dd MMM', { locale: es })} — ${format(
      r.workEnd,
      'dd MMM yyyy',
      { locale: es }
    )}`;
  });

  public weekLabel = computed(() => {
    const ws = this.currentWeekStart();
    const we = addDays(ws, 6);
    return `${format(ws, 'dd MMM', { locale: es })} — ${format(we, 'dd MMM yyyy', { locale: es })}`;
  });

  public days = computed((): DayColumn[] => {
    const ws = this.currentWeekStart();
    return eachDayOfInterval({ start: ws, end: addDays(ws, 6) }).map(d => ({
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
    }));
  });

  public employeeRows = computed(() => {
    const refDate = this.currentWeekStart();
    return this.branchEmployees()
      .filter((e) => e.is_active)
      .map((e) => {
        const positionName = e.position?.name || 'Sin cargo';
        const isEligible =
          !this.scheduleLockService.isPositionExempt(positionName) &&
          this.scheduleLockService.isDateLockedForPosition(refDate, positionName);

        return {
          id: e.id,
          first_name: e.first_name,
          father_name: e.father_name,
          position: positionName,
          isEligible,
        };
      });
  });

  public canInteractEmployee = (emp: { isEligible: boolean }): boolean =>
    this.isCurrentWeekLocked() && emp.isEligible;

  public pendingChanges = computed((): ChangeEntry[] => {
    const changesMap = this.changes();
    const allSchedules = this.schedules();
    const employees = this.branchEmployees();
    const result: ChangeEntry[] = [];

    for (const [key, change] of changesMap) {
      const [employeeId, dateStr] = key.split('|');
      const emp = employees.find(e => e.id === employeeId);
      const currentSch = this.getScheduleForCell(employeeId, dateStr);
      const proposedSch = change.scheduleId ? allSchedules.find(s => s.id === change.scheduleId) : null;
      const dayDate = this.days().find(d => d.dateStr === dateStr)?.date;

      result.push({
        employeeId,
        employeeName: emp ? `${emp.first_name} ${emp.father_name}` : 'Desconocido',
        dateStr,
        dayLabel: dayDate ? format(dayDate, 'EEE dd', { locale: es }) : dateStr,
        currentScheduleId: currentSch?.schedule_id || null,
        currentScheduleName: currentSch?.schedule?.name || null,
        proposedScheduleId: proposedSch?.id || null,
        proposedScheduleName: proposedSch?.name || null,
        employeeScheduleId: currentSch?.id || null,
        action: change.action,
      });
    }
    return result.sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.dateStr.localeCompare(b.dateStr));
  });

  public canSubmit = computed(() => {
    const changes = this.pendingChanges();
    if (changes.length === 0) return false;
    const reasons = this.changeReasons();
    return changes.every(c => {
      const key = `${c.employeeId}|${c.dateStr}`;
      return (reasons.get(key) || '').trim().length > 0;
    });
  });

  // Navigation
  public previousWeek(): void {
    this.currentWeekStart.set(subWeeks(this.currentWeekStart(), 1));
    this.changes.set(new Map());
    this.changeReasons.set(new Map());
    this.loadWeekSchedules();
  }

  public nextWeek(): void {
    this.currentWeekStart.set(addWeeks(this.currentWeekStart(), 1));
    this.changes.set(new Map());
    this.changeReasons.set(new Map());
    this.loadWeekSchedules();
  }

  public navigateToTurnos(): void {
    this.router.navigate(['/dashboard/time-management/timetables']);
  }

  // Cell helpers
  public isToday(date: Date): boolean {
    return dateFnsIsToday(date);
  }

  public getScheduleForCell(employeeId: string, dateStr: string): any | null {
    return resolveEmployeeScheduleForDate(employeeId, dateStr, this.allSchedulesForWeek()) ?? null;
  }

  public hasChange(employeeId: string, dateStr: string): boolean {
    return this.changes().has(`${employeeId}|${dateStr}`);
  }

  public getChangeName(employeeId: string, dateStr: string): string {
    const change = this.changes().get(`${employeeId}|${dateStr}`);
    if (!change?.scheduleId) return '';
    return this.schedules().find(s => s.id === change.scheduleId)?.name || '';
  }

  public getCellClasses(employeeId: string, dateStr: string, color?: string): string {
    const base = color ? (this.colorVariants[color] || 'bg-neutral-700 text-gray-300') : 'bg-neutral-700 text-gray-300';
    if (this.hasChange(employeeId, dateStr)) {
      return base + ' ring-2 ring-amber-400 shadow-amber-500/30 border-amber-400/50';
    }
    return base + ' border-black/20';
  }

  public getColorDot(color?: string): string {
    if (!color) return 'bg-neutral-500';
    const map: Record<string, string> = {
      slate: 'bg-slate-400', yellow: 'bg-yellow-400', green: 'bg-green-400',
      sky: 'bg-sky-400', indigo: 'bg-indigo-400', red: 'bg-red-400',
      pink: 'bg-pink-400', orange: 'bg-orange-400', teal: 'bg-teal-400',
      cyan: 'bg-cyan-400', purple: 'bg-purple-400', lime: 'bg-lime-400',
      amber: 'bg-amber-400', emerald: 'bg-emerald-400', violet: 'bg-violet-400',
      fuchsia: 'bg-fuchsia-400', rose: 'bg-rose-400', blue: 'bg-blue-400',
    };
    return map[color] || 'bg-neutral-500';
  }

  // Click handlers
  public onCellClick(event: Event, emp: any, day: DayColumn, currentSchedule: any): void {
    event.stopPropagation();
    this.popoverEmployeeId.set(emp.id);
    this.popoverDateStr.set(day.dateStr);
    this.popoverLabel.set(`${emp.first_name} — ${format(day.date, 'EEEE dd/MM', { locale: es })}`);
    this.popoverHasCurrent.set(true);
    const existing = this.changes().get(`${emp.id}|${day.dateStr}`);
    this.popoverSelectedId.set(existing?.scheduleId || null);
    this.schedulePopover.toggle(event);
  }

  public onEmptyCellClick(event: Event, emp: any, day: DayColumn): void {
    event.stopPropagation();
    this.popoverEmployeeId.set(emp.id);
    this.popoverDateStr.set(day.dateStr);
    this.popoverLabel.set(`${emp.first_name} — ${format(day.date, 'EEEE dd/MM', { locale: es })}`);
    this.popoverHasCurrent.set(false);
    const existing = this.changes().get(`${emp.id}|${day.dateStr}`);
    this.popoverSelectedId.set(existing?.scheduleId || null);
    this.schedulePopover.toggle(event);
  }

  public selectSchedule(schedule: Schedule): void {
    const key = `${this.popoverEmployeeId()}|${this.popoverDateStr()}`;
    const currentSch = this.getScheduleForCell(this.popoverEmployeeId(), this.popoverDateStr());
    const newMap = new Map(this.changes());

    if (currentSch && schedule.id === currentSch.schedule_id) {
      newMap.delete(key);
    } else {
      const action: ScheduleChangeRequestType = currentSch ? 'update' : 'create';
      newMap.set(key, { scheduleId: schedule.id, action });
    }
    this.changes.set(newMap);
  }

  public selectDelete(): void {
    const key = `${this.popoverEmployeeId()}|${this.popoverDateStr()}`;
    const newMap = new Map(this.changes());
    newMap.set(key, { scheduleId: null, action: 'delete' });
    this.changes.set(newMap);
  }

  public removeChange(employeeId: string, dateStr: string): void {
    const key = `${employeeId}|${dateStr}`;
    const newMap = new Map(this.changes());
    newMap.delete(key);
    this.changes.set(newMap);
    const newReasons = new Map(this.changeReasons());
    newReasons.delete(key);
    this.changeReasons.set(newReasons);
  }

  public getChangeReason(employeeId: string, dateStr: string): string {
    return this.changeReasons().get(`${employeeId}|${dateStr}`) || '';
  }

  public setChangeReason(employeeId: string, dateStr: string, value: string): void {
    const newReasons = new Map(this.changeReasons());
    newReasons.set(`${employeeId}|${dateStr}`, value);
    this.changeReasons.set(newReasons);
  }

  // Submit
  public async submitRequests(): Promise<void> {
    if (!this.canSubmit()) return;
    this.submitting.set(true);

    const entries = this.pendingChanges();
    const requestedBy = this.currentEmployee().id;
    const branch = this.branchId() || this.currentEmployee().branch_id;

    const sentKeys = new Set<string>();
    try {
      const ok = window.confirm(
        `Vas a enviar ${entries.length} solicitud(es) para la semana ${this.weekLabel()}.\n\n` +
          `Revisa que cada cambio sea correcto y que la razón esté clara.\n\n¿Confirmas el envío?`
      );
      if (!ok) return;

      for (const entry of entries) {
        const key = `${entry.employeeId}|${entry.dateStr}`;
        const reason = this.changeReasons().get(key)?.trim() || '';
        await firstValueFrom(
          this.changeRequestService.createRequest({
            employee_id: entry.employeeId,
            branch_id: branch,
            schedule_date: entry.dateStr,
            employee_schedule_id: entry.employeeScheduleId,
            current_schedule_id: entry.currentScheduleId,
            proposed_schedule_id: entry.proposedScheduleId,
            request_type: entry.action,
            reason,
            requested_by: requestedBy,
          })
        );
        sentKeys.add(key);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitudes enviadas',
        detail: `Se enviaron ${entries.length} solicitud(es) de cambio para revisión.`,
      });

      const currentEmp = this.currentEmployee();
      this.notificationService.notifyNewRequest('schedule_change', `${currentEmp.first_name} ${currentEmp.father_name}`, {
        'Cantidad de solicitudes': `${entries.length}`,
        Semana: this.weekLabel(),
      });

      this.changes.set(new Map());
      this.changeReasons.set(new Map());
      this.requestCreated.emit();
    } catch (error) {
      console.error('Error submitting schedule change requests:', error);
      // Remove already-sent entries so a retry doesn't create duplicates
      if (sentKeys.size > 0) {
        const newChanges = new Map(this.changes());
        const newReasons = new Map(this.changeReasons());
        sentKeys.forEach((key) => {
          const [empId, dateStr] = key.split('|');
          newChanges.delete(`${empId}|${dateStr}`);
          newReasons.delete(key);
        });
        this.changes.set(newChanges);
        this.changeReasons.set(newReasons);
      }
      this.messageService.add({
        severity: 'error',
        summary: 'Error parcial',
        detail: `Se enviaron ${sentKeys.size} solicitud(es). Hubo un error con las restantes.`,
      });
    } finally {
      this.submitting.set(false);
    }
  }

  // Data loading
  private async loadWeekSchedules(): Promise<void> {
    this.loading.set(true);
    const ws = this.currentWeekStart();
    const we = addDays(ws, 6);
    const companyId = this.org.getCurrentCompanyId();
    const employeeIds = this.branchEmployees().map(e => e.id);

    if (employeeIds.length === 0) {
      this.allSchedulesForWeek.set([]);
      this.loading.set(false);
      return;
    }

    try {
      const url = this.apiUrl.build('rest/v1/employee_schedules', {
        employee_id: `in.(${employeeIds.join(',')})`,
        start_date: `lte.${format(we, 'yyyy-MM-dd')}`,
        end_date: `gte.${format(ws, 'yyyy-MM-dd')}`,
        select: 'id,employee_id,schedule_id,branch_id,start_date,end_date,approved,schedule:schedules(id,name,color,day_off,entry_time)',
        ...(companyId ? { company_id: `eq.${companyId}` } : {}),
      });
      const result = await firstValueFrom(this.http.get<any[]>(url));
      this.allSchedulesForWeek.set(result || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.allSchedulesForWeek.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
