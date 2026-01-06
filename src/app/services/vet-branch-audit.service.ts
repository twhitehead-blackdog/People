import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface VetBranchAuditLog {
  id: string;
  vet_branch_assignment_id: string;
  changed_by: string;
  changed_at: string;
  action: 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned';
  old_branch_id?: string;
  new_branch_id?: string;
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
  vet_branch_assignment?: {
    employee_id: string;
    branch_id: string;
    date: string;
    employee?: {
      id: string;
      first_name: string;
      father_name: string;
    };
    branch?: {
      id: string;
      name: string;
      short_name: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class VetBranchAuditService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  /**
   * Registrar un cambio en el historial de auditoría de asignaciones veterinarias
   */
  async logChange(params: {
    vetBranchAssignmentId: string | null; // Puede ser null si la asignación ya fue eliminada
    changedBy: string; // ID del empleado que realiza el cambio
    action: VetBranchAuditLog['action'];
    oldBranchId?: string;
    newBranchId?: string;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  }): Promise<void> {
    if (!params.changedBy) {
      console.warn('No se proporcionó el ID del empleado para auditoría');
      return;
    }

    // Validar que tenemos al menos el ID de la asignación o información en oldValue/newValue
    if (!params.vetBranchAssignmentId && !params.oldValue && !params.newValue) {
      console.warn(
        'No se proporcionó información suficiente para auditoría:',
        params
      );
      return;
    }

    const auditData: any = {
      vet_branch_assignment_id: params.vetBranchAssignmentId || null, // Permitir NULL
      changed_by: params.changedBy,
      action: params.action,
      old_branch_id: params.oldBranchId || null,
      new_branch_id: params.newBranchId || null,
      old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      comment: params.comment || null,
      ip_address: await this.getClientIP(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/vet_branch_audit_log'),
          auditData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
          }
        )
      );
      console.log('[VetBranchAudit] Cambio registrado:', params.action);
    } catch (error) {
      console.error('[VetBranchAudit] Error registrando cambio:', error);
      // No lanzamos el error para no romper el flujo principal
    }
  }

  /**
   * Obtener historial de auditoría completo
   */
  getAllAuditHistory(params: {
    employeeId?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    actions?: VetBranchAuditLog['action'][];
    limit?: number;
    offset?: number;
  } = {}): Observable<VetBranchAuditLog[]> {
    const queryParams: Record<string, string> = {
      select: `*,changed_by_employee(id,first_name,father_name,work_email),vet_branch_assignment(employee_id,branch_id,date,employee(id,first_name,father_name),branch(id,name,short_name))`,
      order: 'changed_at.desc',
    };

    if (params.employeeId) {
      queryParams['vet_branch_assignment.employee_id'] = `eq.${params.employeeId}`;
    }

    if (params.branchId) {
      queryParams['vet_branch_assignment.branch_id'] = `eq.${params.branchId}`;
    }

    if (params.dateFrom) {
      queryParams['vet_branch_assignment.date'] = `gte.${params.dateFrom}`;
    }

    if (params.dateTo) {
      queryParams['vet_branch_assignment.date'] = `lte.${params.dateTo}`;
    }

    if (params.actions && params.actions.length > 0) {
      queryParams['action'] = `in.(${params.actions.join(',')})`;
    }

    if (params.limit) {
      queryParams['limit'] = params.limit.toString();
    }

    if (params.offset) {
      queryParams['offset'] = params.offset.toString();
    }

    return this.http.get<VetBranchAuditLog[]>(
      this.apiUrl.build('rest/v1/vet_branch_audit_log', queryParams),
      {}
    );
  }

  /**
   * Obtener historial de auditoría por empleado y fecha
   */
  getAuditHistoryByEmployeeAndDate(
    employeeId: string,
    date: string
  ): Observable<VetBranchAuditLog[]> {
    return this.http.get<VetBranchAuditLog[]>(
      this.apiUrl.build('rest/v1/vet_branch_audit_log', {
        select: `*,changed_by_employee(id,first_name,father_name,work_email),vet_branch_assignment(employee_id,branch_id,date,employee(id,first_name,father_name),branch(id,name,short_name))`,
        'vet_branch_assignment.employee_id': `eq.${employeeId}`,
        'vet_branch_assignment.date': `eq.${date}`,
        order: 'changed_at.desc',
      }),
      {}
    );
  }

  /**
   * Obtener la IP del cliente (si está disponible)
   */
  private async getClientIP(): Promise<string | null> {
    try {
      // Intentar obtener IP desde servicio backend si existe
      const response = await firstValueFrom(
        this.http.get<{ ip: string }>('/api/client-ip')
      );
      return response.ip;
    } catch {
      // Fallback: no disponible en desarrollo
      return null;
    }
  }
}