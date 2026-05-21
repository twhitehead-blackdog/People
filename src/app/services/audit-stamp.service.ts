import { Injectable, signal } from '@angular/core';

/**
 * Mantiene el ID del empleado actual para que el HTTP interceptor
 * pueda estampar `last_modified_by` en escrituras auditadas.
 */
@Injectable({ providedIn: 'root' })
export class AuditStampService {
  public currentEmployeeId = signal<string | null>(null);

  public setEmployee(id: string | null | undefined): void {
    this.currentEmployeeId.set(id ?? null);
    try {
      if (id) localStorage.setItem('audit_user_id', id);
      else localStorage.removeItem('audit_user_id');
    } catch {}
  }

  public getId(): string | null {
    const v = this.currentEmployeeId();
    if (v) return v;
    try { return localStorage.getItem('audit_user_id'); } catch { return null; }
  }
}
