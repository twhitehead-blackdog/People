import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

export interface ScheduleAuditLog {
  id: string;
  employee_schedule_id: string;
  changed_by: string;
  changed_at: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'split' | 'split_range';
  old_status?: boolean;
  new_status?: boolean;
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
  employee_schedule?: {
    employee_id: string;
    start_date: string;
    end_date: string;
    employee?: {
      id: string;
      first_name: string;
      father_name: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class ScheduleAuditService {
  private http = inject(HttpClient);

  /**
   * Registrar un cambio en el historial de auditoría de horarios
   */
  async logChange(params: {
    employeeScheduleId: string | null; // Puede ser null si el horario ya fue eliminado
    changedBy: string; // ID del empleado que realiza el cambio
    action: ScheduleAuditLog['action'];
    oldStatus?: boolean;
    newStatus?: boolean;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  }): Promise<void> {
    if (!params.changedBy) {
      console.warn('No se proporcionó el ID del empleado para auditoría');
      return;
    }

    // Validar que tenemos al menos el ID del horario o información en oldValue/newValue
    if (!params.employeeScheduleId && !params.oldValue && !params.newValue) {
      console.warn('No se proporcionó información suficiente para auditoría:', params);
      return;
    }

    const auditData: any = {
      employee_schedule_id: params.employeeScheduleId || null, // Permitir NULL
      changed_by: params.changedBy,
      action: params.action,
      old_status: params.oldStatus !== undefined ? params.oldStatus : null,
      new_status: params.newStatus !== undefined ? params.newStatus : null,
      old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      comment: params.comment || null,
      ip_address: await this.getClientIP(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/schedule_audit_log`,
          auditData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
          }
        )
      );
      console.log('✅ Auditoría registrada correctamente:', {
        action: params.action,
        employeeScheduleId: params.employeeScheduleId,
        changedBy: params.changedBy,
      });
    } catch (error: any) {
      // Log detallado del error para debugging
      console.error('❌ Error registrando auditoría de horario:', {
        error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorBody: error?.error,
        auditData,
        action: params.action,
        employeeScheduleId: params.employeeScheduleId,
      });
      // Re-lanzar el error para que el código que llama pueda manejarlo si es necesario
      // pero no interrumpir el flujo principal si no es crítico
    }
  }

  /**
   * Obtener historial de cambios de un horario
   */
  getAuditHistory(employeeScheduleId: string): Observable<ScheduleAuditLog[]> {
    return this.http.get<ScheduleAuditLog[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/schedule_audit_log`,
      {
        params: {
          employee_schedule_id: `eq.${employeeScheduleId}`,
          select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email)`,
          order: 'changed_at.desc',
        },
      }
    );
  }

  /**
   * Obtener historial de auditoría por empleado (todos sus horarios)
   */
  getAuditHistoryByEmployee(employeeId: string): Observable<ScheduleAuditLog[]> {
    return this.http.get<ScheduleAuditLog[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/schedule_audit_log`,
      {
        params: {
          select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email),employee_schedule:employee_schedules(employee_id,start_date,end_date,employee:employees(id,first_name,father_name))`,
          'employee_schedule.employee_id': `eq.${employeeId}`,
          order: 'changed_at.desc',
        },
      }
    );
  }

  /**
   * Obtener historial de auditoría por empleado y fecha específica
   */
  getAuditHistoryByEmployeeAndDate(employeeId: string, date: Date): Observable<ScheduleAuditLog[]> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return this.http.get<ScheduleAuditLog[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/schedule_audit_log`,
      {
        params: {
          select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email),employee_schedule:employee_schedules(employee_id,start_date,end_date,employee:employees(id,first_name,father_name))`,
          'employee_schedule.employee_id': `eq.${employeeId}`,
          'employee_schedule.start_date': `lte.${dateStr}`,
          'employee_schedule.end_date': `gte.${dateStr}`,
          order: 'changed_at.desc',
        },
      }
    );
  }

  /**
   * Obtener todo el historial de auditoría con relaciones completas
   */
  getAllAuditHistory(): Observable<ScheduleAuditLog[]> {
    return this.http.get<ScheduleAuditLog[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/schedule_audit_log`,
      {
        params: {
          select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email),employee_schedule:employee_schedules(employee_id,start_date,end_date,employee:employees(id,first_name,father_name))`,
          order: 'changed_at.desc',
        },
      }
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