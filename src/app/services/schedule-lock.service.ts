import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { startOfWeek, endOfWeek, isBefore } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

export interface ScheduleLockSettings {
  id: string;
  company_id: string;
  lock_day: number;          // 0=Sunday … 6=Saturday
  lock_hour: number;         // 0-23
  lock_minute: number;       // 0-59
  is_active: boolean;
  lock_cycle_weeks: number;  // how many weeks per cycle (default 2)
  reference_date: string;    // ISO date string — Sunday start of first locked period
}

/** Positions that are NEVER subject to the schedule lock. */
const EXEMPT_POSITION_KEYWORDS = ['peluquer', 'bañador', 'asistente de peluquer'];

const TIMEZONE = 'America/Panama';

@Injectable({ providedIn: 'root' })
export class ScheduleLockService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  private _settings = signal<ScheduleLockSettings | null>(null);
  private _loaded = signal(false);

  public settings = this._settings.asReadonly();
  public loaded = this._loaded.asReadonly();

  /** Returns true if a position name is exempt from the lock. */
  public isPositionExempt(positionName: string): boolean {
    const name = (positionName || '').toLowerCase();
    return EXEMPT_POSITION_KEYWORDS.some(k => name.includes(k));
  }

  /**
   * Load lock settings for current company.
   * Safe to call multiple times — re-tries if companyId wasn't available yet.
   */
  async loadSettings(): Promise<void> {
    if (this._loaded()) return;
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return; // companyId not ready yet — do NOT mark as loaded, allow retry
    await this.reloadSettings();
  }

  /** Force-reload settings from DB (used after toggling or explicit refresh). */
  async reloadSettings(): Promise<void> {
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return;

    try {
      const result = await firstValueFrom(
        this.http.get<ScheduleLockSettings[]>(`/api/lock-settings?company_id=${encodeURIComponent(companyId)}`)
      );
      const settings = result && result.length > 0 ? result[0] : null;
      this._settings.set(settings);
      console.info('[ScheduleLock] Settings loaded:', settings);
    } catch (error) {
      console.error('[ScheduleLock] Error loading settings:', error);
    } finally {
      this._loaded.set(true);
    }
  }

  /**
   * Returns the next lock deadline for a given week start date.
   * Useful for showing "Se bloquea el sábado X" in the UI.
   */
  getNextLockDeadline(weekStartDate: Date): Date | null {
    const settings = this._settings();
    if (!settings || !settings.is_active) return null;

    const refDate = new Date(settings.reference_date + 'T00:00:00');
    const cycleDays = (settings.lock_cycle_weeks ?? 2) * 7;

    const daysDiff = Math.floor((weekStartDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodIndex = daysDiff < 0 ? 0 : Math.floor(daysDiff / cycleDays);

    // Lock deadline for the NEXT period (current period + 1)
    const nextPeriodStart = new Date(refDate);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + (periodIndex + 1) * cycleDays);
    const deadline = new Date(nextPeriodStart);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(settings.lock_hour, settings.lock_minute, 0, 0);
    return deadline;
  }

  /**
   * Toggle the global lock on/off. Callers must validate auth before calling.
   */
  async toggleLock(active: boolean): Promise<void> {
    const settings = this._settings();
    if (!settings) return;
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return;
    // Use backend proxy so the PATCH goes through the service role key (bypasses RLS)
    await firstValueFrom(
      this.http.post('/api/lock-settings', {
        company_id: companyId,
        is_active: active,
        updated_at: new Date().toISOString(),
      })
    );
    // Re-fetch from DB to confirm the write and sync all signals
    await this.reloadSettings();
  }

  /**
   * Determines if a specific date is locked, taking the employee's position into account.
   *
   * Biweekly cycle logic:
   *   - `reference_date` is the Sunday that starts the FIRST locked period.
   *   - Periods are `lock_cycle_weeks` × 7 days long.
   *   - The lock for period N activates on the Saturday before period N starts (reference_date + N*cycle - 1 day).
   *   - If now >= that Saturday at lock_hour:lock_minute → period N is locked.
   *
   * @param date        The date whose lock status is being checked.
   * @param positionName Optional employee position. If exempt, always returns false.
   */
  isDateLockedForPosition(date: Date, positionName = ''): boolean {
    const settings = this._settings();
    if (!settings || !settings.is_active) return false;
    if (this.isPositionExempt(positionName)) return false;

    const now = new Date();

    // Dates before the reference period are never locked via the cycle rule
    const refDate = new Date(settings.reference_date + 'T00:00:00');
    const cycleDays = (settings.lock_cycle_weeks ?? 2) * 7;

    const daysDiff = Math.floor((date.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return false;

    const periodIndex = Math.floor(daysDiff / cycleDays);
    const periodStart = new Date(refDate);
    periodStart.setDate(periodStart.getDate() + periodIndex * cycleDays);

    // Lock deadline = Saturday before the period starts, at lock_hour:lock_minute
    const lockDeadline = new Date(periodStart);
    lockDeadline.setDate(lockDeadline.getDate() - 1);
    lockDeadline.setHours(settings.lock_hour, settings.lock_minute, 0, 0);

    return now >= lockDeadline;
  }

  /**
   * Convenience: check if a week is generally locked.
   * weekStartDate can be Sunday (weekStartsOn:0) or Monday — both handled.
   * Does NOT filter by position — used for banners and general UI.
   */
  isWeekLocked(weekStartDate: Date): boolean {
    const settings = this._settings();
    if (!settings) {
      console.warn('[ScheduleLock] isWeekLocked called but settings not loaded yet');
      return false;
    }
    if (!settings.is_active) {
      console.info('[ScheduleLock] Lock is disabled (is_active=false)');
      return false;
    }

    const now = new Date();

    // Past weeks are always locked — use Sunday-based week end (Sat) to match timetable display
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 0 });
    if (isBefore(weekEnd, now)) return true;

    // Use weekStartDate directly — reference_date is also a Sunday so cycle math aligns
    const result = this.isDateLockedForPosition(weekStartDate, '');
    console.info('[ScheduleLock] isWeekLocked:', { weekStartDate, result, ref: settings.reference_date });
    return result;
  }

  /**
   * Check if a specific date falls within a locked period (no position filter).
   */
  isDateLocked(date: Date): boolean {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return this.isWeekLocked(weekStart);
  }
}
