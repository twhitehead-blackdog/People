import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { DashboardStore } from '../stores/dashboard.store';
import { AccessSchedule, Employee } from '../models';

/**
 * Verifica si la hora actual (en la zona horaria del horario configurado)
 * cae dentro del horario de acceso del empleado.
 *
 * Si el empleado no tiene `access_schedule` o `enabled=false`, siempre permite.
 * Se actualiza cada 30s para reaccionar al expirar el horario sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class AccessScheduleService {
  private store = inject(DashboardStore);

  private now = signal<Date>(new Date());

  constructor() {
    // Tick cada 30s para revalidar
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(new Date()));
  }

  /** Schedule activo del usuario logueado (o null si no aplica). */
  readonly currentSchedule = computed<AccessSchedule | null>(() => {
    const emp = this.store.currentEmployee();
    return this.parseSchedule(emp);
  });

  /** ¿La hora actual está dentro del horario permitido? */
  readonly isWithinSchedule = computed<boolean>(() => {
    const schedule = this.currentSchedule();
    if (!schedule || !schedule.enabled) return true;
    return this.isNowInside(schedule, this.now());
  });

  /** ¿Hay restricción configurada y está fuera de horario? */
  readonly isOutOfHours = computed<boolean>(() => {
    const schedule = this.currentSchedule();
    if (!schedule || !schedule.enabled) return false;
    return !this.isWithinSchedule();
  });

  /** Modo de la restricción ('block' o 'readonly'). */
  readonly mode = computed<'block' | 'readonly' | null>(() => {
    const s = this.currentSchedule();
    return s?.enabled ? s.mode : null;
  });

  /** Texto descriptivo del horario para mostrar al usuario. */
  readonly scheduleSummary = computed(() => {
    const s = this.currentSchedule();
    if (!s || !s.enabled) return '';
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const days = s.days.map((d) => dayNames[d]).join(', ');
    return `${days} de ${s.start} a ${s.end} (${s.timezone})`;
  });

  private parseSchedule(employee: Employee | null | undefined): AccessSchedule | null {
    if (!employee?.access_schedule) return null;
    try {
      const parsed: AccessSchedule =
        typeof employee.access_schedule === 'string'
          ? JSON.parse(employee.access_schedule)
          : (employee.access_schedule as AccessSchedule);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private isNowInside(schedule: AccessSchedule, now: Date): boolean {
    const tz = schedule.timezone || 'America/Panama';
    // Obtiene día y hora local en la zona horaria del schedule
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dow = weekdayMap[weekdayShort] ?? -1;
    if (!schedule.days.includes(dow)) return false;

    const nowMinutes = hour * 60 + minute;
    const startMinutes = this.toMinutes(schedule.start);
    const endMinutes = this.toMinutes(schedule.end);
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  }
}
