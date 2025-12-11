import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditLog } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private http = inject(HttpClient);
  private readonly supabaseUrl = process.env['ENV_SUPABASE_URL'] ?? '';
  private readonly supabaseKey = process.env['ENV_SUPABASE_API_KEY'] ?? '';

  /**
   * Registra una acción en el log de auditoría
   */
  public logAction(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete' | 'status_change' | 'other',
    options?: {
      userId?: string;
      userEmail?: string;
      changes?: Record<string, { old?: any; new?: any }>;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Observable<AuditLog | null> {
    const auditLog: Partial<AuditLog> = {
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: options?.userId,
      user_email: options?.userEmail,
      changes: options?.changes,
      metadata: options?.metadata,
      ip_address: options?.ipAddress || this.getClientIP(),
      user_agent: options?.userAgent || this.getUserAgent(),
    };

    // Si no hay configuración, solo loguear (modo desarrollo)
    if (!this.supabaseUrl) {
      console.log('📝 [AuditService] Log de auditoría:', auditLog);
      return of(null);
    }

    const url = `${this.supabaseUrl}/rest/v1/audit_logs`;
    return this.http
      .post<AuditLog>(
        url,
        {
          ...auditLog,
          // Supabase JSONB acepta objetos JavaScript directamente, no strings JSON
          changes: auditLog.changes || null,
          metadata: auditLog.metadata || null,
        },
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      )
      .pipe(
        tap((log) => {
          console.log('✅ [AuditService] Log registrado:', log.id);
        }),
        catchError((error) => {
          console.error('❌ [AuditService] Error al registrar log:', error);
          // No fallar la operación principal si el log falla
          return of(null);
        })
      );
  }

  /**
   * Obtiene la IP del cliente (básico, puede mejorarse)
   */
  private getClientIP(): string {
    // En producción, esto debería obtenerse del servidor
    // Por ahora, retornamos una IP simulada o vacía
    return '';
  }

  /**
   * Obtiene el User Agent del navegador
   */
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
    return '';
  }

  /**
   * Calcula los cambios entre dos objetos
   */
  public calculateChanges<T extends Record<string, any>>(
    oldEntity: T,
    newEntity: T
  ): Record<string, { old?: any; new?: any }> {
    const changes: Record<string, { old?: any; new?: any }> = {};
    const allKeys = new Set([...Object.keys(oldEntity), ...Object.keys(newEntity)]);

    allKeys.forEach((key) => {
      const oldValue = oldEntity[key];
      const newValue = newEntity[key];

      // Comparar valores (considerando undefined y null)
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue !== undefined ? oldValue : null,
          new: newValue !== undefined ? newValue : null,
        };
      }
    });

    return changes;
  }
}

