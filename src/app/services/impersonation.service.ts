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
  employee?: any; // objeto completo del empleado emulado (sobrevive reload sin depender de entities)
}

@Injectable({ providedIn: 'root' })
export class ImpersonationService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  private readonly _state = signal<ImpersonationState | null>(this.loadFromStorage());

  public impersonatedEmployeeId = computed(() => this._state()?.employeeId ?? null);
  /** Objeto completo del empleado emulado (con position, permisos, etc.). */
  public impersonatedEmployee = computed(() => this._state()?.employee ?? null);
  public isImpersonating = computed(() => this._state() !== null);
  public startedAt = computed(() => this._state()?.startedAt ?? null);
  public ttlMs = TTL_MS;

  public isSuperAdmin(realEmpId: string | null | undefined, realEmail: string | null | undefined): boolean {
    if (realEmpId && realEmpId === SUPER_ADMIN_EMPLOYEE_ID) return true;
    if (realEmail && SUPER_ADMIN_EMAILS.includes(realEmail.toLowerCase())) return true;
    return false;
  }

  public async startImpersonation(employeeOrId: string | { id: string; [k: string]: any }, realEmployeeId: string | null): Promise<void> {
    const startedAt = Date.now();
    const employeeId = typeof employeeOrId === 'string' ? employeeOrId : employeeOrId.id;
    // Sanitizar a un objeto PLANO y serializable. Las entidades de NgRx/realtime
    // pueden tener referencias no serializables que rompen JSON.stringify y hacen
    // que persistState falle en silencio (la impersonación no sobrevivía el reload).
    const employeeObj = this.sanitizeEmployee(employeeOrId);
    const state: ImpersonationState = { employeeId, startedAt, employee: employeeObj };

    // Registrar en DB (best-effort)
    try {
      const rows = await firstValueFrom(
        this.http.post<Array<{ id: string }>>(
          this.apiUrl.build('rest/v1/super_admin_impersonation_log'),
          {
            real_employee_id: realEmployeeId ?? null,
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

  /** Devuelve un objeto plano serializable con los campos necesarios para emular. */
  private sanitizeEmployee(empInput: string | { id: string; [k: string]: any }): any {
    if (typeof empInput === 'string' || !empInput) return null;
    const emp: any = empInput;
    try {
      const p = emp.position
        ? {
            id: emp.position.id, name: emp.position.name,
            admin: emp.position.admin, schedule_admin: emp.position.schedule_admin,
            schedule_approver: emp.position.schedule_approver,
            dashboard_access: emp.position.dashboard_access, default_view: emp.position.default_view,
          }
        : null;
      const b = emp.branch ? { id: emp.branch.id, name: emp.branch.name, short_name: emp.branch.short_name, zone: emp.branch.zone } : null;
      const d = emp.department ? { id: emp.department.id, name: emp.department.name } : null;
      return {
        id: emp.id, employee_number: emp.employee_number,
        first_name: emp.first_name, middle_name: emp.middle_name,
        father_name: emp.father_name, mother_name: emp.mother_name,
        full_name: emp.full_name, short_name: emp.short_name,
        work_email: emp.work_email, email: emp.email,
        company_id: emp.company_id, branch_id: emp.branch_id, department_id: emp.department_id,
        position_id: emp.position_id, is_active: emp.is_active,
        has_portal_access: emp.has_portal_access, account_approved: emp.account_approved,
        frontend_permissions_override: emp.frontend_permissions_override ?? null,
        legacy_permissions_override: emp.legacy_permissions_override ?? null,
        position: p, branch: b, department: d,
      };
    } catch {
      return { id: emp.id };
    }
  }

  private persistState(state: ImpersonationState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Fallback: persistir sin el objeto employee (al menos el id sobrevive)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ employeeId: state.employeeId, startedAt: state.startedAt, logId: state.logId }));
      } catch {}
    }
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
