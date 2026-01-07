import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, timeout, catchError, of } from 'rxjs';
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

@Injectable({
  providedIn: 'root',
})
export class VetBranchAuditService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  logChange(params: {
    vetBranchAssignmentId: string | null;
    changedBy: string;
    action: VetBranchAuditLog['action'];
    oldBranchId?: string;
    newBranchId?: string;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  }): void {
    if (!params.changedBy) {
      console.warn('No se proporcionó el ID del empleado para auditoría');
      return;
    }

    if (!params.vetBranchAssignmentId && !params.oldValue && !params.newValue) {
      console.warn('No se proporcionó información suficiente para auditoría:', params);
      return;
    }

    this.performAudit(params);
  }

  private async performAudit(params: {
    vetBranchAssignmentId: string | null;
    changedBy: string;
    action: VetBranchAuditLog['action'];
    oldBranchId?: string;
    newBranchId?: string;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  }): Promise<void> {
    try {
      const ipAddress = await this.getClientIP();

      const auditData: any = {
        vet_branch_assignment_id: params.vetBranchAssignmentId || null,
        changed_by: params.changedBy,
        action: params.action,
        old_branch_id: params.oldBranchId || null,
        new_branch_id: params.newBranchId || null,
        old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
        new_value: params.newValue ? JSON.stringify(params.newValue) : null,
        comment: params.comment || null,
        ip_address: ipAddress,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      };

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
    }
  }

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

  private async getClientIP(): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ ip: string }>('/api/client-ip').pipe(
          timeout(2000),
          catchError(() => of({ ip: null }))
        )
      );
      return response.ip;
    } catch {
      return null;
    }
  }
}