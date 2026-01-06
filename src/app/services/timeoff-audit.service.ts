import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface TimeoffAuditLog {
  id: string;
  timeoff_id: string;
  changed_by: string;
  changed_at: string;
  action: 'created' | 'status_changed' | 'approved' | 'rejected' | 'registered' | 'updated';
  old_status?: string;
  new_status?: string;
  old_value?: any;
  new_value?: any;
  comment?: string;
  ip_address?: string;
  user_agent?: string;
  changed_by_employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TimeoffAuditService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  /**
   * Registrar un cambio en el historial de auditoría
   */
  async logChange(params: {
    timeoffId: string;
    changedBy: string; // ID del empleado que realiza el cambio
    action: TimeoffAuditLog['action'];
    oldStatus?: string;
    newStatus?: string;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  }): Promise<void> {
    if (!params.changedBy) {
      console.warn('No se proporcionó el ID del empleado para auditoría');
      return;
    }

    const auditData = {
      timeoff_id: params.timeoffId,
      changed_by: params.changedBy,
      action: params.action,
      old_status: params.oldStatus || null,
      new_status: params.newStatus || null,
      old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      comment: params.comment || null,
      ip_address: await this.getClientIP(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/timeoff_audit_log'),
          auditData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
          }
        )
      );
    } catch (error) {
      // Error silencioso para no interrumpir el flujo principal
      console.error('Error registrando auditoría:', error);
    }
  }

  /**
   * Obtener historial de cambios de una solicitud
   */
  getAuditHistory(timeoffId: string): Observable<TimeoffAuditLog[]> {
    return this.http.get<TimeoffAuditLog[]>(
      this.apiUrl.build('rest/v1/timeoff_audit_log', {
        timeoff_id: `eq.${timeoffId}`,
        select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email)`,
        order: 'changed_at.desc',
      }),
      {}
    );
  }

  /**
   * Obtener IP del cliente (simplificado)
   * En producción, esto podría usar un servicio externo o capturarse del servidor
   */
  private async getClientIP(): Promise<string> {
    try {
      // Intentar obtener IP de un servicio externo
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

