import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';

/**
 * Super-admin impersonation: permite a Tristan ver la app como si fuera otro empleado.
 *
 * - Solo UI: los queries siguen yendo con el JWT real (las RLS no se afectan).
 * - Auto-expira a los 30 minutos.
 * - Cada sesión queda registrada en super_admin_impersonation_log.
 * - Mantiene lista de "recientes" en localStorage.
 */
const STORAGE_KEY = 'super_admin_impersonation_v2';
const RECENT_KEY = 'super_admin_impersonation_recent_v1';
const SUPER_ADMIN_EMPLOYEE_ID = '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8'; // Tristan Whitehead
const SUPER_ADMIN_EMAILS = ['mercadeo@blackdogpanama.com', 'tristan1021@gmail.com'];
const TTL_MS = 30 * 60 * 1000; // 30 minutos

interface ImpersonationState {
  employeeId: string;
  startedAt: number;
  logId?: string;
}

@Injectable({ providedIn: 'root' })
export class ImpersonationService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  private readonly _state = signal<ImpersonationState | null>(this.loadFromStorage());

  public impersonatedEmployeeId = computed(() => this._state()?.employeeId ?? null);
  public isImpersonating = computed(() => this._state() !== null);
  public startedAt = computed(() => this._state()?.startedAt ?? null);
  public ttlMs = TTL_MS;

  public isSuperAdmin(realEmpId: string | null | undefined, realEmail: string | null | undefined): boolean {
    if (realEmpId && realEmpId === SUPER_ADMIN_EMPLOYEE_ID) return true;
    if (realEmail && SUPER_ADMIN_EMAILS.includes(realEmail.toLowerCase())) return true;
    return false;
  }

  public async startImpersonation(employeeId: string, realEmployeeId: string): Promise<void> {
    const startedAt = Date.now();
    const state: ImpersonationState = { employeeId, startedAt };

    // Registrar en DB (best-effort)
    try {
      const rows = await firstValueFrom(
        this.http.post<Array<{ id: string }>>(
          this.apiUrl.build('rest/v1/super_admin_impersonation_log'),
          {
            real_employee_id: realEmployeeId,
            impersonated_employee_id: employeeId,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          },
          { headers: { Prefer: 'return=representation' } }
        )
      );
      const logId = Array.isArray(rows) ? rows[0]?.id : (rows as any)?.id;
      if (logId) state.logId = logId;
    } catch (e) {
      console.warn('[Impersonation] No se pudo registrar inicio:', e);
    }

    this._state.set(state);
    this.persistState(state);
    this.addToRecent(employeeId);
  }

  public async stopImpersonation(): Promise<void> {
    const current = this._state();
    if (!current) return;

    // Cerrar registro (best-effort)
    if (current.logId) {
      try {
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/super_admin_impersonation_log', { id: `eq.${current.logId}` }),
            { ended_at: new Date().toISOString() },
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      } catch (e) {
        console.warn('[Impersonation] No se pudo cerrar registro:', e);
      }
    }

    this._state.set(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  /** Lista de últimos empleados emulados (máx 5). */
  public recentImpersonations(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }

  private addToRecent(employeeId: string): void {
    const existing = this.recentImpersonations().filter((id) => id !== employeeId);
    const next = [employeeId, ...existing].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }

  private loadFromStorage(): ImpersonationState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ImpersonationState;
      if (!parsed?.employeeId || !parsed?.startedAt) return null;
      // Expirado
      if (Date.now() - parsed.startedAt > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  }

  private persistState(state: ImpersonationState): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  /** Llamado por el componente cada minuto para detectar expiración. */
  public checkExpiration(): boolean {
    const s = this._state();
    if (!s) return false;
    if (Date.now() - s.startedAt > TTL_MS) {
      this.stopImpersonation();
      return true;
    }
    return false;
  }
}
